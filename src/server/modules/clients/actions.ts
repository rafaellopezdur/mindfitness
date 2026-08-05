'use server'

import type { Route } from 'next'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/server/infra/prisma'
import { requirePermission } from '@/server/auth/context'
import { record, recordChange } from '@/server/audit/audit-service'
import { assertCanWithReason, can } from '@/server/auth/rbac'
import { PERMISSIONS } from '@/shared/constants/permissions'
import {
  addNoteSchema,
  fullClientSchema,
  overrideStatusSchema,
  quickClientSchema,
  updateClientSchema,
  updateDocumentSchema,
} from '@/shared/schemas/clients'
import { normalizeDocument, normalizePhone } from '@/server/domain/clients'
import {
  findDuplicates,
  nextClientCode,
  rebuildSearchText,
  toClientRecord,
  type CreateClientData,
} from './client-service'

export interface ClientFormState {
  ok: boolean
  message?: string
  fieldErrors?: Record<string, string>
  duplicates?: { clientId: string; name: string; documentMasked: string; level: string; reason: string }[]
}

function collectErrors(issues: { path: (string | number)[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {}
  for (const issue of issues) {
    const key = issue.path[0]
    if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return fieldErrors
}

function readForm(formData: FormData, keys: string[]) {
  return Object.fromEntries(keys.map((key) => [key, formData.get(key) ?? undefined]))
}

const QUICK_FIELDS = ['firstName', 'lastName', 'documentType', 'documentNumber', 'phone']
const FULL_FIELDS = [
  ...QUICK_FIELDS,
  'birthDate', 'gender', 'whatsapp', 'email', 'address', 'city', 'acquisitionChannel',
  'emergencyName', 'emergencyRelationship', 'emergencyPhone', 'notes',
]

export async function createClientAction(_prev: ClientFormState, formData: FormData): Promise<ClientFormState> {
  const actor = await requirePermission(PERMISSIONS.CLIENT_CREATE)

  const mode = formData.get('mode') === 'quick' ? 'quick' : 'full'
  const schema = mode === 'quick' ? quickClientSchema : fullClientSchema
  const raw = readForm(formData, mode === 'quick' ? QUICK_FIELDS : FULL_FIELDS)

  const parsed = schema.safeParse(raw)
  if (!parsed.success) return { ok: false, fieldErrors: collectErrors(parsed.error.issues) }

  const data = parsed.data as CreateClientData

  const duplicates = await findDuplicates({
    documentType: data.documentType,
    documentNumber: data.documentNumber,
    email: data.email,
    phone: data.phone,
  })

  const blocking = duplicates.find((d) => d.level === 'BLOCK')
  if (blocking) {
    return {
      ok: false,
      message: `${blocking.reason}: ${blocking.name} (${blocking.documentMasked}).`,
      duplicates,
      fieldErrors: { documentNumber: 'Este documento ya está registrado' },
    }
  }

  // Las advertencias se confirman una vez; el operador decide si sigue.
  const acknowledged = formData.get('acknowledgeDuplicates') === '1'
  if (duplicates.length > 0 && !acknowledged) {
    return {
      ok: false,
      message: 'Encontramos clientes parecidos. Revisa antes de continuar.',
      duplicates,
    }
  }

  const clientId = await prisma.$transaction(async (tx) => {
    const code = await nextClientCode(tx)
    const client = await tx.client.create({
      data: { ...toClientRecord(data, code), createdBy: actor.userId },
    })

    if (data.emergencyName && data.emergencyPhone) {
      await tx.emergencyContact.create({
        data: {
          clientId: client.id,
          name: data.emergencyName,
          relationship: data.emergencyRelationship ?? null,
          phone: normalizePhone(data.emergencyPhone),
        },
      })
    }

    if (data.notes) {
      await tx.clientNote.create({
        data: {
          clientId: client.id,
          authorId: actor.userId,
          authorName: actor.fullName,
          body: data.notes,
          visibility: 'INTERNAL',
        },
      })
    }

    await record(tx, {
      actor,
      action: 'client.create',
      entityType: 'client',
      entityId: client.id,
      after: { code, name: `${data.firstName} ${data.lastName}`, document: client.documentNumber },
      severity: 'NOTICE',
    })

    return client.id
  })

  revalidatePath('/admin/clientes')
  redirect(`/admin/clientes/${clientId}` as Route)
}

export async function updateClientAction(_prev: ClientFormState, formData: FormData): Promise<ClientFormState> {
  const actor = await requirePermission(PERMISSIONS.CLIENT_UPDATE)

  const parsed = updateClientSchema.safeParse(
    readForm(formData, [
      'clientId', 'firstName', 'lastName', 'phone', 'whatsapp',
      'email', 'address', 'city', 'birthDate', 'acquisitionChannel',
    ]),
  )
  if (!parsed.success) return { ok: false, fieldErrors: collectErrors(parsed.error.issues) }

  const data = parsed.data
  const before = await prisma.client.findUniqueOrThrow({ where: { id: data.clientId } })

  const phone = normalizePhone(data.phone)
  const updated = {
    firstName: data.firstName,
    lastName: data.lastName,
    phone,
    whatsapp: data.whatsapp ? normalizePhone(data.whatsapp) : phone,
    email: data.email ?? null,
    address: data.address ?? null,
    city: data.city ?? null,
    birthDate: data.birthDate ? new Date(`${data.birthDate}T00:00:00.000Z`) : null,
    acquisitionChannel: data.acquisitionChannel ?? null,
  }

  await prisma.$transaction(async (tx) => {
    await tx.client.update({
      where: { id: data.clientId },
      data: {
        ...updated,
        searchText: rebuildSearchText({
          firstName: updated.firstName,
          lastName: updated.lastName,
          documentNumber: before.documentNumber,
          phone: updated.phone,
          email: updated.email,
          code: before.code,
        }),
      },
    })
    await recordChange(tx, {
      actor,
      action: 'client.update',
      entityType: 'client',
      entityId: data.clientId,
      before: before as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
    })
  })

  revalidatePath(`/admin/clientes/${data.clientId}`)
  return { ok: true, message: 'Datos actualizados.' }
}

/** Corregir el documento es dato sensible: permiso aparte y motivo obligatorio. */
export async function updateDocumentAction(_prev: ClientFormState, formData: FormData): Promise<ClientFormState> {
  const actor = await requirePermission(PERMISSIONS.CLIENT_UPDATE_SENSITIVE)

  const parsed = updateDocumentSchema.safeParse(
    readForm(formData, ['clientId', 'documentType', 'documentNumber', 'reason']),
  )
  if (!parsed.success) return { ok: false, fieldErrors: collectErrors(parsed.error.issues) }

  const { clientId, documentType, reason } = parsed.data
  const documentNumber = normalizeDocument(parsed.data.documentNumber)

  const duplicates = await findDuplicates({ documentType, documentNumber, excludeClientId: clientId })
  if (duplicates.some((d) => d.level === 'BLOCK')) {
    return { ok: false, fieldErrors: { documentNumber: 'Ese documento ya pertenece a otro cliente' } }
  }

  const before = await prisma.client.findUniqueOrThrow({ where: { id: clientId } })

  await prisma.$transaction(async (tx) => {
    await tx.client.update({
      where: { id: clientId },
      data: {
        documentType: documentType as never,
        documentNumber,
        searchText: rebuildSearchText({ ...before, documentNumber }),
      },
    })
    await recordChange(tx, {
      actor,
      action: 'client.update.sensitive',
      entityType: 'client',
      entityId: clientId,
      before: { documentType: before.documentType, documentNumber: before.documentNumber },
      after: { documentType, documentNumber },
      reason,
      severity: 'WARNING',
    })
  })

  revalidatePath(`/admin/clientes/${clientId}`)
  return { ok: true, message: 'Documento corregido.' }
}

export async function addNoteAction(_prev: ClientFormState, formData: FormData): Promise<ClientFormState> {
  const actor = await requirePermission(PERMISSIONS.CLIENT_NOTE_CREATE)

  const parsed = addNoteSchema.safeParse(readForm(formData, ['clientId', 'body', 'visibility']))
  if (!parsed.success) return { ok: false, fieldErrors: collectErrors(parsed.error.issues) }

  const { clientId, body, visibility } = parsed.data

  await prisma.clientNote.create({
    data: { clientId, authorId: actor.userId, authorName: actor.fullName, body, visibility },
  })

  revalidatePath(`/admin/clientes/${clientId}`)
  return { ok: true, message: 'Observación guardada.' }
}

/** El estado normalmente se calcula; forzarlo exige permiso y motivo (RN-92). */
export async function overrideStatusAction(_prev: ClientFormState, formData: FormData): Promise<ClientFormState> {
  const actor = await requirePermission(PERMISSIONS.CLIENT_STATUS_OVERRIDE)

  const parsed = overrideStatusSchema.safeParse(readForm(formData, ['clientId', 'status', 'reason']))
  if (!parsed.success) return { ok: false, fieldErrors: collectErrors(parsed.error.issues) }

  const { clientId, status, reason } = parsed.data
  assertCanWithReason(actor, PERMISSIONS.CLIENT_STATUS_OVERRIDE, reason)

  const before = await prisma.client.findUniqueOrThrow({ where: { id: clientId } })
  const next = status === 'NONE' ? null : status

  await prisma.$transaction(async (tx) => {
    await tx.client.update({
      where: { id: clientId },
      data: { statusOverride: next as never, statusOverrideReason: next ? reason : null },
    })
    await recordChange(tx, {
      actor,
      action: 'client.status.override',
      entityType: 'client',
      entityId: clientId,
      before: { statusOverride: before.statusOverride },
      after: { statusOverride: next },
      reason,
      severity: 'WARNING',
    })
  })

  revalidatePath(`/admin/clientes/${clientId}`)
  return { ok: true, message: next ? 'Estado forzado.' : 'Se restableció el estado automático.' }
}

/** Comprobación en vivo mientras se escribe el documento en el formulario. */
export async function checkDuplicatesAction(input: {
  documentType: string
  documentNumber: string
  email?: string
  phone?: string
}) {
  const actor = await requirePermission(PERMISSIONS.CLIENT_CREATE)
  if (!can(actor, PERMISSIONS.CLIENT_READ)) return []
  return findDuplicates(input)
}

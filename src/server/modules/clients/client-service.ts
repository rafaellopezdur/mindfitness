import 'server-only'
import type { Prisma } from '@prisma/client'
import { prisma, type Db } from '@/server/infra/prisma'
import {
  buildSearchText,
  classifyDuplicate,
  foldText,
  formatClientCode,
  maskDocument,
  normalizeDocument,
  normalizePhone,
  type DuplicateCandidate,
} from '@/server/domain/clients'
import { resolveClientScope, type ActorContext } from '@/server/auth/rbac'

/**
 * Consulta base según el alcance del actor.
 *
 * El filtro se aplica en la CONSULTA, no en la vista: un entrenador que pide
 * la lista completa por API recibe únicamente sus clientes.
 */
export function scopedClientWhere(actor: ActorContext): Prisma.ClientWhereInput | null {
  const scope = resolveClientScope(actor)
  if (scope.kind === 'NONE') return null
  if (scope.kind === 'ALL') return { deletedAt: null, mergedIntoId: null }

  // P33 · el entrenador atiende por turno: sus clientes son los inscritos en
  // las franjas que cubre. Hasta la Fase 3 no existen franjas ni asignaciones,
  // así que por ahora el alcance está vacío en lugar de abierto.
  return { deletedAt: null, mergedIntoId: null, id: { in: [] } }
}

export interface ClientSearchParams {
  query?: string
  status?: string
  channel?: string
  page?: number
  pageSize?: number
}

export async function searchClients(actor: ActorContext, params: ClientSearchParams) {
  const base = scopedClientWhere(actor)
  if (!base) return { clients: [], total: 0, page: 1, totalPages: 1 }

  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(100, params.pageSize ?? 20)

  const where: Prisma.ClientWhereInput = { ...base }
  const term = params.query?.trim()

  if (term) {
    // Una sola columna normalizada e indexada: la búsqueda no tiene que
    // pelear con tildes, puntos ni mayúsculas en cada consulta.
    const folded = foldText(term)
    const digits = term.replace(/\D/g, '')
    where.OR = [
      { searchText: { contains: folded } },
      ...(digits.length >= 3 ? [{ searchText: { contains: digits } }] : []),
    ]
  }

  if (params.channel) where.acquisitionChannel = params.channel
  if (params.status === 'BLOCKED') where.statusOverride = 'BLOCKED'
  if (params.status === 'INACTIVE') where.statusOverride = 'INACTIVE'

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.client.count({ where }),
  ])

  return { clients, total, page, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
}

export async function getClient(actor: ActorContext, clientId: string) {
  const base = scopedClientWhere(actor)
  if (!base) return null

  return prisma.client.findFirst({
    where: { ...base, id: clientId },
    include: {
      emergencyContacts: true,
      notes: { orderBy: { createdAt: 'desc' }, take: 50 },
      documents: { orderBy: { uploadedAt: 'desc' } },
      consents: { orderBy: { acceptedAt: 'desc' } },
    },
  })
}

/**
 * RN-81 · Detección de duplicados.
 * El documento bloquea; correo y teléfono solo advierten.
 */
export async function findDuplicates(input: {
  documentType: string
  documentNumber: string
  email?: string | null
  phone?: string | null
  excludeClientId?: string
}): Promise<DuplicateCandidate[]> {
  const documentNumber = normalizeDocument(input.documentNumber)
  const phone = input.phone ? normalizePhone(input.phone) : undefined
  const email = input.email?.trim().toLowerCase()

  const matches = await prisma.client.findMany({
    where: {
      deletedAt: null,
      mergedIntoId: null,
      ...(input.excludeClientId ? { id: { not: input.excludeClientId } } : {}),
      OR: [
        { documentNumber },
        ...(email ? [{ email }] : []),
        ...(phone ? [{ phone }] : []),
      ],
    },
    take: 5,
  })

  return matches.flatMap((match) => {
    const classification = classifyDuplicate({
      sameDocument: match.documentNumber === documentNumber,
      sameEmail: Boolean(email && match.email === email),
      samePhone: Boolean(phone && match.phone === phone),
    })
    if (!classification) return []
    return [
      {
        clientId: match.id,
        name: `${match.firstName} ${match.lastName}`,
        documentMasked: maskDocument(match.documentType, match.documentNumber),
        level: classification.level,
        reason: classification.reason,
      },
    ]
  })
}

/**
 * Consecutivo de código de cliente.
 *
 * Se incrementa DENTRO de la transacción que crea al cliente: dos operadores
 * registrando a la vez no pueden obtener el mismo MFC-00042.
 */
export async function nextClientCode(tx: Db): Promise<string> {
  const counter = await tx.counter.upsert({
    where: { name: 'client_code' },
    update: { value: { increment: 1 } },
    create: { name: 'client_code', value: 1 },
  })
  return formatClientCode(counter.value)
}

export interface CreateClientData {
  firstName: string
  lastName: string
  documentType: string
  documentNumber: string
  phone: string
  whatsapp?: string
  email?: string
  birthDate?: string
  gender?: string
  address?: string
  city?: string
  acquisitionChannel?: string
  emergencyName?: string
  emergencyRelationship?: string
  emergencyPhone?: string
  notes?: string
}

/** Prepara los campos derivados que se guardan materializados. */
export function toClientRecord(data: CreateClientData, code: string) {
  const documentNumber = normalizeDocument(data.documentNumber)
  const phone = normalizePhone(data.phone)

  return {
    code,
    firstName: data.firstName,
    lastName: data.lastName,
    documentType: data.documentType as never,
    documentNumber,
    phone,
    // Casi siempre el WhatsApp es el mismo número: se autocompleta para no
    // pedir dos veces el mismo dato.
    whatsapp: data.whatsapp ? normalizePhone(data.whatsapp) : phone,
    email: data.email ?? null,
    birthDate: data.birthDate ? new Date(`${data.birthDate}T00:00:00.000Z`) : null,
    gender: data.gender ?? null,
    address: data.address ?? null,
    city: data.city ?? null,
    acquisitionChannel: data.acquisitionChannel ?? null,
    searchText: buildSearchText({
      firstName: data.firstName,
      lastName: data.lastName,
      documentNumber,
      phone,
      email: data.email,
      code,
    }),
  }
}

export function rebuildSearchText(client: {
  firstName: string
  lastName: string
  documentNumber: string
  phone: string
  email?: string | null
  code: string
}) {
  return buildSearchText(client)
}

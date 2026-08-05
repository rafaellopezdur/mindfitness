import type { Metadata, Route } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, MessageCircle, Phone } from 'lucide-react'
import { requirePermission } from '@/server/auth/context'
import { can } from '@/server/auth/rbac'
import { PERMISSIONS } from '@/shared/constants/permissions'
import { getClient } from '@/server/modules/clients/client-service'
import { getAcquisitionChannels } from '@/server/modules/settings/settings-service'
import { prisma } from '@/server/infra/prisma'
import { deriveClientStatus, formatPhone, fullName } from '@/server/domain/clients'
import { formatLong, instantToBusinessDate } from '@/server/domain/dates'
import { EmptyState } from '@/components/patterns/empty-state'
import { StatusBadge } from '@/components/patterns/status-badge'
import { cn, formatDateTime, initials } from '@/lib/cn'
import { AddNoteForm, EditClientForm, OverrideStatusForm } from './client-forms'

export const metadata: Metadata = { title: 'Ficha del cliente' }

const TABS = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'membresias', label: 'Membresías' },
  { key: 'pagos', label: 'Pagos' },
  { key: 'asistencia', label: 'Asistencia' },
  { key: 'documentos', label: 'Documentos' },
  { key: 'historial', label: 'Historial' },
] as const

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab } = await searchParams
  const actor = await requirePermission(PERMISSIONS.CLIENT_READ, `/admin/clientes/${id}`)

  const client = await getClient(actor, id)
  if (!client) notFound()

  const channels = await getAcquisitionChannels()
  const activeTab = TABS.find((t) => t.key === tab)?.key ?? 'resumen'
  const status = deriveClientStatus({ statusOverride: client.statusOverride })
  const canEdit = can(actor, PERMISSIONS.CLIENT_UPDATE)
  const canOverride = can(actor, PERMISSIONS.CLIENT_STATUS_OVERRIDE)
  const canNote = can(actor, PERMISSIONS.CLIENT_NOTE_CREATE)

  const history =
    activeTab === 'historial' && can(actor, PERMISSIONS.AUDIT_READ)
      ? await prisma.auditLog.findMany({
          where: { entityType: 'client', entityId: id },
          orderBy: { createdAt: 'desc' },
          take: 50,
        })
      : []

  const whatsappNumber = (client.whatsapp ?? client.phone).replace(/\D/g, '')

  return (
    <>
      <Link
        href="/admin/clientes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[--color-text-muted] hover:text-[--color-text]"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Clientes
      </Link>

      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span
            aria-hidden
            className="grid size-14 shrink-0 place-items-center rounded-full bg-brand-100 text-lg font-semibold text-brand-800"
          >
            {initials(fullName(client))}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold text-[--color-text] sm:text-2xl">
              {fullName(client)}
            </h1>
            <p className="tabular mt-0.5 truncate text-sm text-[--color-text-muted]">
              {client.documentType} {client.documentNumber} · {client.code}
            </p>
            <div className="mt-2">
              <StatusBadge status={status} />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <a
            href={`tel:+57${client.phone}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[--color-border-strong] px-3 text-sm text-[--color-text] hover:bg-[--color-surface-sunken]"
          >
            <Phone className="size-4" aria-hidden />
            Llamar
          </a>
          <a
            href={`https://wa.me/57${whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[--color-border-strong] px-3 text-sm text-[--color-text] hover:bg-[--color-surface-sunken]"
          >
            <MessageCircle className="size-4" aria-hidden />
            WhatsApp
          </a>
        </div>
      </div>

      {client.statusOverride && (
        <div className="mb-5 rounded-lg bg-warning-bg px-4 py-3 text-sm text-warning">
          <span className="font-medium">Estado forzado manualmente.</span>{' '}
          {client.statusOverrideReason}
        </div>
      )}

      <nav aria-label="Secciones de la ficha" className="mb-5 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex min-w-max gap-1 border-b border-[--color-border]">
          {TABS.map((item) => (
            <li key={item.key}>
              <Link
                href={`/admin/clientes/${id}?tab=${item.key}` as Route}
                aria-current={activeTab === item.key ? 'page' : undefined}
                className={cn(
                  'inline-block border-b-2 px-3 py-2 text-sm transition-colors',
                  activeTab === item.key
                    ? 'border-brand-500 font-medium text-brand-700'
                    : 'border-transparent text-[--color-text-muted] hover:text-[--color-text]',
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {activeTab === 'resumen' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Datos de contacto" action={canEdit ? undefined : null}>
            <Row label="Teléfono" value={formatPhone(client.phone)} />
            <Row label="WhatsApp" value={client.whatsapp ? formatPhone(client.whatsapp) : '—'} />
            <Row label="Correo" value={client.email ?? '—'} />
            <Row label="Dirección" value={client.address ?? '—'} />
            <Row label="Ciudad" value={client.city ?? '—'} />
            <Row
              label="Fecha de nacimiento"
              value={client.birthDate ? formatLong(instantToBusinessDate(client.birthDate)) : '—'}
            />
            <Row label="Canal" value={client.acquisitionChannel ?? '—'} />
            <Row label="Registro" value={formatDateTime(client.registeredAt)} />

            {canEdit && (
              <div className="mt-4 border-t border-[--color-border] pt-4">
                <EditClientForm
                  client={{
                    id: client.id,
                    firstName: client.firstName,
                    lastName: client.lastName,
                    phone: client.phone,
                    whatsapp: client.whatsapp,
                    email: client.email,
                    address: client.address,
                    city: client.city,
                    birthDate: client.birthDate ? client.birthDate.toISOString().slice(0, 10) : null,
                    acquisitionChannel: client.acquisitionChannel,
                  }}
                  channels={channels}
                />
              </div>
            )}
          </Card>

          <div className="space-y-4">
            <Card title="Contacto de emergencia">
              {client.emergencyContacts.length === 0 ? (
                <p className="text-sm text-[--color-text-muted]">
                  Sin contacto de emergencia. Conviene pedirlo antes de la primera sesión.
                </p>
              ) : (
                client.emergencyContacts.map((contact) => (
                  <div key={contact.id}>
                    <Row label="Nombre" value={contact.name} />
                    <Row label="Parentesco" value={contact.relationship ?? '—'} />
                    <Row label="Teléfono" value={formatPhone(contact.phone)} />
                  </div>
                ))
              )}
            </Card>

            {canOverride && (
              <Card title="Estado">
                <p className="mb-3 text-sm text-[--color-text-muted]">
                  El estado se calcula solo a partir de la membresía vigente.
                </p>
                <OverrideStatusForm clientId={client.id} current={client.statusOverride} />
              </Card>
            )}
          </div>

          <div className="lg:col-span-2">
            <Card title="Observaciones">
              {canNote && (
                <div className="mb-4 border-b border-[--color-border] pb-4">
                  <AddNoteForm
                    clientId={client.id}
                    canSeeTrainerNotes={can(actor, PERMISSIONS.CLIENT_NOTE_READ_INTERNAL)}
                  />
                </div>
              )}
              {client.notes.length === 0 ? (
                <p className="text-sm text-[--color-text-muted]">Sin observaciones todavía.</p>
              ) : (
                <ol className="space-y-3">
                  {client.notes.map((note) => (
                    <li key={note.id} className="border-l-2 border-[--color-border-strong] pl-3">
                      <p className="text-sm text-[--color-text]">{note.body}</p>
                      <p className="mt-0.5 text-xs text-[--color-text-muted]">
                        {note.authorName} · {formatDateTime(note.createdAt)}
                        {note.visibility === 'TRAINER' && ' · visible para el entrenador'}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'membresias' && (
        <EmptyState
          title="Todavía no hay membresías"
          description="El módulo de planes y membresías llega en la Fase 3. Cuando exista, aquí verás el historial completo de contratos de esta persona."
        />
      )}

      {activeTab === 'pagos' && (
        <EmptyState
          title="Todavía no hay pagos"
          description="Cargos, pagos, saldo y comprobantes aparecerán aquí cuando se construya el módulo financiero, en la Fase 4."
        />
      )}

      {activeTab === 'asistencia' && (
        <EmptyState
          title="Todavía no hay asistencias"
          description="El registro de entradas y el consumo de sesiones se activan en la Fase 4, junto con la tarjeta del entrenador."
        />
      )}

      {activeTab === 'documentos' && (
        <EmptyState
          title="Sin documentos adjuntos"
          description="La subida de archivos necesita el proveedor de almacenamiento externo, todavía sin definir (pregunta P13). El modelo de datos ya está listo."
        />
      )}

      {activeTab === 'historial' && (
        <>
          {history.length === 0 ? (
            <EmptyState
              title="Sin cambios registrados"
              description="Aquí aparece cada modificación de la ficha con su autor, la fecha y el detalle de lo que cambió."
            />
          ) : (
            <ol className="space-y-2">
              {history.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-xl border border-[--color-border] bg-[--color-surface-raised] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-medium text-[--color-text]">{entry.action}</p>
                    <time dateTime={entry.createdAt.toISOString()} className="text-xs text-[--color-text-muted]">
                      {formatDateTime(entry.createdAt)}
                    </time>
                  </div>
                  <p className="mt-0.5 text-xs text-[--color-text-muted]">{entry.actorEmail}</p>
                  {entry.reason && (
                    <p className="mt-1 text-xs text-[--color-text-muted]">
                      <span className="font-medium">Motivo:</span> {entry.reason}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </>
  )
}

function Card({
  title,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-[--color-border] bg-[--color-surface-raised] p-5">
      <h2 className="mb-3 text-sm font-semibold text-[--color-text]">{title}</h2>
      {children}
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[--color-border] py-2 last:border-0">
      <dt className="shrink-0 text-xs text-[--color-text-muted]">{label}</dt>
      <dd className="min-w-0 truncate text-right text-sm text-[--color-text]">{value}</dd>
    </div>
  )
}

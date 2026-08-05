import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requirePermission } from '@/server/auth/context'
import { PERMISSIONS } from '@/shared/constants/permissions'
import { getAcquisitionChannels } from '@/server/modules/settings/settings-service'
import { PageHeader } from '@/components/patterns/page-header'
import { ClientForm } from './client-form'

export const metadata: Metadata = { title: 'Nuevo cliente' }

export default async function NewClientPage() {
  await requirePermission(PERMISSIONS.CLIENT_CREATE, '/admin/clientes/nuevo')
  const channels = await getAcquisitionChannels()

  return (
    <>
      <Link
        href="/admin/clientes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[--color-text-muted] hover:text-[--color-text]"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Clientes
      </Link>

      <PageHeader
        title="Nuevo cliente"
        description="Con nombre, documento y teléfono es suficiente para empezar. El resto se completa después."
      />

      <div className="max-w-3xl">
        <ClientForm channels={channels} />
      </div>
    </>
  )
}

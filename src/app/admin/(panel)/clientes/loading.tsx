import { Skeleton, SkeletonList } from '@/components/ui/skeleton'

export default function ClientsLoading() {
  return (
    <div role="status" aria-label="Cargando clientes">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="mb-5 flex gap-2">
        <Skeleton className="h-11 flex-1 sm:max-w-sm" />
        <Skeleton className="h-11 w-28" />
        <Skeleton className="h-11 w-24" />
      </div>
      <SkeletonList rows={6} />
    </div>
  )
}

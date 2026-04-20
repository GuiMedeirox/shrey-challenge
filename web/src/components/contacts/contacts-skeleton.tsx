import { Skeleton } from '@/components/ui/skeleton'

export function ContactsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2 p-3">
          <Skeleton className="size-16 sm:size-20 rounded-full" />
          <Skeleton className="h-3 w-14" />
        </div>
      ))}
    </div>
  )
}

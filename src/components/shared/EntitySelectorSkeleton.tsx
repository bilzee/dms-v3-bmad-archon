import { Skeleton } from '@/components/ui/skeleton'

interface EntitySelectorSkeletonProps {
  className?: string
}

export function EntitySelectorSkeleton({ className }: EntitySelectorSkeletonProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Skeleton className="h-10 w-full" />
      <div className="space-y-1">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-6 w-1/2" />
      </div>
    </div>
  )
}
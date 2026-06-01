interface ProductCardSkeletonProps {
  compact?: boolean;
}

export default function ProductCardSkeleton({ compact = false }: ProductCardSkeletonProps) {
  return (
    <article className="h-full overflow-hidden rounded-lg border border-border bg-surface animate-pulse" aria-label="Loading product">
      {/* Image Skeleton */}
      <div className="relative aspect-[5/4] overflow-hidden bg-muted/40"></div>

      <div className={`${compact ? 'p-3' : 'p-3 sm:p-4'} flex min-h-[132px] flex-col sm:min-h-[168px]`}>
        {/* Category & Rating Skeleton */}
        <div className="mb-2 flex items-center justify-between gap-3 text-xs">
          <div className="h-4 w-20 rounded bg-muted/40"></div>
          <div className="flex shrink-0 items-center gap-1">
            <div className="h-4 w-8 rounded bg-muted/40"></div>
          </div>
        </div>

        {/* Title Skeleton */}
        <div className="line-clamp-2 min-h-[40px] text-[13px] sm:text-sm">
          <div className="h-4 w-full rounded bg-muted/40 mb-1"></div>
          <div className="h-4 w-3/4 rounded bg-muted/40"></div>
        </div>

        {/* Store Name Skeleton */}
        <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs">
          <div className="h-4 w-4 shrink-0 rounded bg-muted/40"></div>
          <div className="h-4 w-24 rounded bg-muted/40"></div>
        </div>

        {/* Description Skeleton (Hidden on mobile) */}
        <div className="mt-1 hidden text-xs leading-5 sm:block">
          <div className="mb-1 h-3 w-full rounded bg-muted/40"></div>
          <div className="h-3 w-4/5 rounded bg-muted/40"></div>
        </div>

        {/* Price & Cart Button Skeleton */}
        <div className="mt-auto flex items-end justify-between gap-2 pt-3 sm:gap-3 sm:pt-4">
          <div className="min-w-0">
            <div className="mb-1 h-3 w-12 rounded bg-muted/40"></div>
            <div className="h-5 w-16 rounded bg-muted/40 sm:h-6"></div>
          </div>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/40 sm:h-9 sm:w-9"></span>
        </div>
      </div>
    </article>
  );
}

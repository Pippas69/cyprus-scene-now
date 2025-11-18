import { Skeleton } from "@/components/ui/skeleton";

const OfferCardSkeleton = () => {
  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      {/* Image skeleton */}
      <div className="relative h-40 bg-gradient-to-br from-muted via-muted/50 to-muted overflow-hidden">
        <div className="absolute inset-0 shimmer" />
      </div>

      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        {/* Business Info */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full shimmer" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-24 shimmer" />
            <Skeleton className="h-3 w-16 shimmer" />
          </div>
        </div>

        {/* Title */}
        <Skeleton className="h-5 w-3/4 shimmer" />

        {/* Description */}
        <Skeleton className="h-4 w-full shimmer" />
        <Skeleton className="h-4 w-2/3 shimmer" />

        {/* Discount Badge */}
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-12 w-12 rounded-full shimmer" />
          <Skeleton className="h-4 w-32 shimmer" />
        </div>
      </div>
    </div>
  );
};

export default OfferCardSkeleton;

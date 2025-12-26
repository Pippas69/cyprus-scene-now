import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface EventCardSkeletonProps {
  className?: string;
}

const EventCardSkeleton = ({ className }: EventCardSkeletonProps = {}) => {
  return (
    <div className={cn(
      "overflow-hidden rounded-lg border bg-card shadow-card",
      "relative",
      className
    )}>
      {/* Image skeleton with shimmer */}
      <div className="relative h-48 overflow-hidden bg-muted">
        <div className="absolute inset-0 shimmer-skeleton" />
        {/* Badge placeholders */}
        <Skeleton className="absolute bottom-3 left-3 h-5 w-20 rounded-full" />
        <Skeleton className="absolute bottom-3 right-3 h-5 w-16 rounded-full" />
      </div>

      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        {/* Business avatar + name */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>

        {/* Title & Location */}
        <div className="space-y-2">
          <Skeleton className="h-6 w-4/5" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>

        {/* Time */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Stats with pulse effect */}
        <div className="flex gap-4 py-2">
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-8" />
          </div>
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-8" />
          </div>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Skeleton className="h-9 rounded-md" />
          <Skeleton className="h-9 rounded-md" />
        </div>
      </div>
    </div>
  );
};

export default EventCardSkeleton;

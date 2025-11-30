import { Skeleton } from "@/components/ui/skeleton";

const EventCardSkeleton = () => {
  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      {/* Image skeleton */}
      <Skeleton className="h-48 rounded-none rounded-t-lg" />

      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        {/* Title & Location */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>

        {/* Time */}
        <Skeleton className="h-4 w-2/3" />

        {/* Stats */}
        <div className="flex gap-4 py-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
        </div>
      </div>
    </div>
  );
};

export default EventCardSkeleton;

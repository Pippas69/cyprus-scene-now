const EventCardSkeleton = () => {
  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm animate-pulse">
      {/* Image skeleton */}
      <div className="relative h-48 bg-gradient-to-br from-muted via-muted/50 to-muted overflow-hidden">
        <div className="absolute inset-0 shimmer" />
      </div>

      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        {/* Title & Location */}
        <div className="space-y-2">
          <div className="h-5 bg-muted rounded-md w-3/4 shimmer" />
          <div className="h-4 bg-muted rounded-md w-1/2 shimmer" />
        </div>

        {/* Time */}
        <div className="h-4 bg-muted rounded-md w-2/3 shimmer" />

        {/* Stats */}
        <div className="flex gap-4 py-2">
          <div className="h-4 bg-muted rounded-md w-20 shimmer" />
          <div className="h-4 bg-muted rounded-md w-20 shimmer" />
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="h-9 bg-muted rounded-md shimmer" />
          <div className="h-9 bg-muted rounded-md shimmer" />
        </div>
      </div>
    </div>
  );
};

export default EventCardSkeleton;

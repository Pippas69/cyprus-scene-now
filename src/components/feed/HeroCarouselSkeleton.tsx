import { Skeleton } from "@/components/ui/skeleton";

const HeroCarouselSkeleton = () => {
  return (
    <div className="mb-8">
      <Skeleton className="h-8 w-64 mb-4" />
      <div className="relative w-full h-[350px] md:h-[500px] rounded-2xl overflow-hidden">
        <Skeleton className="w-full h-full shimmer" />
      </div>
    </div>
  );
};

export default HeroCarouselSkeleton;

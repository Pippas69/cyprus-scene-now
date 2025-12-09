import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VenueScrollerProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

const VenueScroller = ({ title, subtitle, children, className }: VenueScrollerProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    
    const scrollAmount = 320;
    const newPosition = scrollRef.current.scrollLeft + (direction === "left" ? -scrollAmount : scrollAmount);
    
    scrollRef.current.scrollTo({
      left: newPosition,
      behavior: "smooth",
    });
  };

  return (
    <section className={cn("space-y-4", className)}>
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-foreground">{title}</h3>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll("left")}
            className="h-8 w-8 rounded-full hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll("right")}
            className="h-8 w-8 rounded-full hover:bg-muted"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div
        ref={scrollRef}
        className={cn(
          "flex gap-4 overflow-x-auto pb-4 scrollbar-thin",
          "scroll-smooth snap-x snap-mandatory",
          "-mx-4 px-4"
        )}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {children}
      </div>
    </section>
  );
};

export default VenueScroller;

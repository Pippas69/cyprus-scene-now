import { cn } from "@/lib/utils";

interface WaveDividerProps {
  variant?: "aegean" | "seafoam" | "coral" | "sand";
  flip?: boolean;
  className?: string;
}

const WaveDivider = ({ variant = "aegean", flip = false, className }: WaveDividerProps) => {
  const colorMap = {
    aegean: "fill-aegean/20",
    seafoam: "fill-seafoam/20",
    coral: "fill-sunset-coral/20",
    sand: "fill-sand/30",
  };

  return (
    <div className={cn("w-full overflow-hidden", flip && "rotate-180", className)}>
      <svg
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        className={cn("w-full h-16 md:h-24", colorMap[variant])}
      >
        <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" />
      </svg>
      <style>{`
        @keyframes wave-flow {
          0%, 100% { d: path("M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"); }
          50% { d: path("M0,0V36.29c57.79,28.2,113.59,38.17,168,34,80.36-7.37,146.33-43.31,216.8-47.5C458.64,18.43,532.34,43.67,603,62.05c79.27,22,148.3,28.88,219.4,17.08,46.15-8,79.85-21.84,114.45-33.34C1029.49,15,1133-24.29,1200,42.47V0Z"); }
        }
      `}</style>
    </div>
  );
};

export default WaveDivider;

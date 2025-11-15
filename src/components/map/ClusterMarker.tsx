interface ClusterMarkerProps {
  count: number;
  onClick: () => void;
}

export const ClusterMarker = ({ count, onClick }: ClusterMarkerProps) => {
  const size = count < 10 ? 40 : count < 50 ? 50 : 60;

  return (
    <div
      onClick={onClick}
      className="relative cursor-pointer transition-transform hover:scale-110 group"
    >
      {/* Outer ring */}
      <div
        className="absolute inset-0 rounded-full bg-primary/20 animate-pulse"
        style={{ width: size + 20, height: size + 20, left: -10, top: -10 }}
      />

      {/* Main circle */}
      <div
        className="rounded-full bg-primary shadow-lg flex items-center justify-center font-bold text-white group-hover:shadow-xl transition-shadow"
        style={{ width: size, height: size }}
      >
        <span className="text-sm">{count}</span>
      </div>

      {/* Inner glow */}
      <div
        className="absolute inset-0 rounded-full bg-white/30 pointer-events-none"
        style={{ width: size, height: size }}
      />
    </div>
  );
};

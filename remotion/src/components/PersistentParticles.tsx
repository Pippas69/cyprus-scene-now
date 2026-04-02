import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

const particles = Array.from({ length: 25 }, (_, i) => ({
  x: (i * 137.5) % 100,
  y: (i * 61.8) % 100,
  size: 2 + (i % 4) * 1.5,
  speed: 0.3 + (i % 5) * 0.15,
  phase: i * 0.8,
}));

export const PersistentParticles = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {particles.map((p, i) => {
        const y = (p.y + frame * p.speed * 0.3) % 120 - 10;
        const x = p.x + Math.sin(frame * 0.02 + p.phase) * 3;
        const opacity = interpolate(
          Math.sin(frame * 0.03 + p.phase),
          [-1, 1],
          [0.05, 0.3]
        );

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: i % 3 === 0 ? "#3ec3b7" : "rgba(255,255,255,0.6)",
              opacity,
              filter: `blur(${p.size > 3 ? 1 : 0}px)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

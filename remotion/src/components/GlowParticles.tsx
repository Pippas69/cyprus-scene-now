import { useCurrentFrame, useVideoConfig, interpolate, AbsoluteFill } from "remotion";

const PARTICLES = Array.from({ length: 25 }, (_, i) => ({
  id: i,
  x: (i * 137.5) % 100,
  y: (i * 73.7) % 100,
  size: 2 + (i % 4) * 1.5,
  speed: 0.3 + (i % 5) * 0.15,
  phase: (i * 2.4) % (Math.PI * 2),
  color: i % 3 === 0 ? "rgba(78, 205, 196, 0.4)" : "rgba(255, 215, 150, 0.3)",
}));

export const GlowParticles = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const globalOpacity = interpolate(frame, [0, 40, durationInFrames - 20, durationInFrames], [0, 0.8, 0.8, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: globalOpacity }}>
      {PARTICLES.map((p) => {
        const yOffset = Math.sin(frame * 0.02 * p.speed + p.phase) * 30;
        const xOffset = Math.cos(frame * 0.015 * p.speed + p.phase) * 15;
        const particleOpacity = 0.3 + Math.sin(frame * 0.04 + p.phase) * 0.3;
        const drift = -(frame * p.speed * 0.3);

        return (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: `${p.x + xOffset * 0.1}%`,
              top: `${((p.y + drift * 0.1) % 110 + 110) % 110}%`,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: p.color,
              opacity: particleOpacity,
              boxShadow: `0 0 ${p.size * 4}px ${p.color}`,
              transform: `translateY(${yOffset}px) translateX(${xOffset}px)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

interface TextRevealProps {
  text: string;
  startFrame: number;
  y: number;
  fontSize: number;
  fontWeight?: number;
  letterSpacing?: number;
  fontFamily?: string;
  color?: string;
  exitFrame?: number;
}

export const TextReveal = ({
  text,
  startFrame,
  y,
  fontSize,
  fontWeight = 700,
  letterSpacing = 4,
  fontFamily = "sans-serif",
  color = "#FFFFFF",
  exitFrame,
}: TextRevealProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = frame - startFrame;

  if (localFrame < -5) return null;

  // Entry animation
  const entryProgress = spring({
    frame: Math.max(0, localFrame),
    fps,
    config: { damping: 25, stiffness: 120, mass: 1 },
  });

  const opacity = interpolate(entryProgress, [0, 1], [0, 1]);
  const translateY = interpolate(entryProgress, [0, 1], [60, 0]);
  const scaleVal = interpolate(entryProgress, [0, 1], [0.9, 1]);

  // Exit animation (if exitFrame provided)
  let exitOpacity = 1;
  let exitTranslateY = 0;
  if (exitFrame !== undefined) {
    const exitLocal = frame - exitFrame;
    if (exitLocal > 0) {
      exitOpacity = interpolate(exitLocal, [0, 15], [1, 0], { extrapolateRight: "clamp" });
      exitTranslateY = interpolate(exitLocal, [0, 15], [0, -40], { extrapolateRight: "clamp" });
    }
  }

  // Subtle text shadow for depth
  const textShadow = `0 2px 20px rgba(0,0,0,0.6), 0 0 60px rgba(0,0,0,0.3)`;

  return (
    <div
      style={{
        position: "absolute",
        top: y,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        opacity: opacity * exitOpacity,
        transform: `translateY(${translateY + exitTranslateY}px) scale(${scaleVal})`,
      }}
    >
      <div
        style={{
          fontFamily,
          fontSize,
          fontWeight,
          color,
          letterSpacing,
          textAlign: "center",
          textShadow,
          lineHeight: 1.1,
        }}
      >
        {text}
      </div>
    </div>
  );
};

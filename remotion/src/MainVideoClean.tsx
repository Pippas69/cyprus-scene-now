import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Img, staticFile } from "remotion";
import { GlowParticles } from "./components/GlowParticles";

export const MainVideoClean = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Cinematic slow zoom focused on center egg
  const scale = interpolate(frame, [0, durationInFrames], [1.35, 1.55], {
    extrapolateRight: "clamp",
  });
  const translateY = interpolate(frame, [0, durationInFrames], [-180, -220], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Full-screen event image - zoomed in to hide text */}
      <AbsoluteFill>
        <Img
          src={staticFile("images/event.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale}) translateY(${translateY}px)`,
          }}
        />
      </AbsoluteFill>

      {/* Cinematic overlay */}
      <AbsoluteFill style={{ background: "rgba(0,0,0,0.45)" }} />
      <AbsoluteFill
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.15) 55%, rgba(0,0,0,0.5) 80%, rgba(0,0,0,0.85) 100%)",
        }}
      />

      <GlowParticles />
    </AbsoluteFill>
  );
};

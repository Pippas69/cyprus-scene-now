import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Cinzel";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: cinzel } = loadFont("normal", { weights: ["700"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["300", "400"], subsets: ["latin"] });

export const Scene1Intro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 15, stiffness: 80 } });
  const logoOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  const lineWidth = spring({ frame: frame - 25, fps, config: { damping: 200 } });

  const taglineOpacity = interpolate(frame, [35, 55], [0, 1], { extrapolateRight: "clamp" });
  const taglineY = interpolate(frame, [35, 55], [30, 0], { extrapolateRight: "clamp" });

  // Subtle glow pulse
  const glowIntensity = interpolate(Math.sin(frame * 0.08), [-1, 1], [20, 50]);

  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(ellipse at 50% 40%, #0D3B66 0%, #0A1929 70%, #050d18 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Seafoam glow behind logo */}
      <div
        style={{
          position: "absolute",
          top: "38%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(62,195,183,0.15) 0%, transparent 70%)`,
          filter: `blur(${glowIntensity}px)`,
        }}
      />

      {/* ΦΟΜΟ logo */}
      <div
        style={{
          fontFamily: cinzel,
          fontSize: 120,
          fontWeight: 700,
          color: "white",
          letterSpacing: 20,
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
          textShadow: "0 0 60px rgba(62,195,183,0.4)",
        }}
      >
        ΦΟΜΟ
      </div>

      {/* Decorative line */}
      <div
        style={{
          width: interpolate(lineWidth, [0, 1], [0, 200]),
          height: 1.5,
          background: "linear-gradient(90deg, transparent, #3ec3b7, transparent)",
          marginTop: 20,
          marginBottom: 20,
        }}
      />

      {/* Tagline */}
      <div
        style={{
          fontFamily: inter,
          fontSize: 28,
          fontWeight: 300,
          color: "rgba(255,255,255,0.6)",
          letterSpacing: 12,
          textTransform: "uppercase",
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
        }}
      >
        CYPRUS
      </div>
    </AbsoluteFill>
  );
};

import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Cinzel";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: cinzel } = loadFont("normal", { weights: ["700"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["400", "600", "700"], subsets: ["latin"] });

export const Scene4CTA = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoSpring = spring({ frame, fps, config: { damping: 12, stiffness: 80 } });

  // CTA button pulse
  const pulse = interpolate(Math.sin(frame * 0.1), [-1, 1], [0.97, 1.03]);
  const ctaOpacity = interpolate(frame, [30, 50], [0, 1], { extrapolateRight: "clamp" });
  const ctaY = interpolate(frame, [30, 50], [40, 0], { extrapolateRight: "clamp" });

  // URL fade in
  const urlOpacity = interpolate(frame, [55, 70], [0, 1], { extrapolateRight: "clamp" });

  // Urgency text
  const urgencyOpacity = interpolate(frame, [70, 85], [0, 1], { extrapolateRight: "clamp" });

  // Seafoam ring
  const ringScale = interpolate(frame, [0, 80], [0.8, 1.1], { extrapolateRight: "clamp" });
  const ringOpacity = interpolate(Math.sin(frame * 0.05), [-1, 1], [0.05, 0.15]);

  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(ellipse at 50% 50%, #0D3B66 0%, #0A1929 70%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Decorative ring */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${ringScale})`,
          width: 500,
          height: 500,
          borderRadius: "50%",
          border: "1px solid rgba(62,195,183,0.2)",
          opacity: ringOpacity,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${ringScale * 0.7})`,
          width: 500,
          height: 500,
          borderRadius: "50%",
          border: "1px solid rgba(62,195,183,0.1)",
          opacity: ringOpacity,
        }}
      />

      {/* ΦΟΜΟ logo */}
      <div
        style={{
          fontFamily: cinzel,
          fontSize: 80,
          fontWeight: 700,
          color: "white",
          letterSpacing: 15,
          opacity: interpolate(logoSpring, [0, 1], [0, 1]),
          transform: `scale(${logoSpring})`,
          textShadow: "0 0 40px rgba(62,195,183,0.3)",
          marginBottom: 60,
        }}
      >
        ΦΟΜΟ
      </div>

      {/* CTA Button */}
      <div
        style={{
          opacity: ctaOpacity,
          transform: `translateY(${ctaY}px) scale(${pulse})`,
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #3ec3b7, #2da89e)",
            padding: "24px 80px",
            borderRadius: 60,
            boxShadow: "0 0 50px rgba(62,195,183,0.3), 0 10px 30px rgba(0,0,0,0.3)",
          }}
        >
          <span
            style={{
              fontFamily: inter,
              fontSize: 26,
              fontWeight: 700,
              color: "white",
              letterSpacing: 4,
              textTransform: "uppercase",
            }}
          >
            Κλείσε Εισιτήριο
          </span>
        </div>
      </div>

      {/* URL */}
      <div
        style={{
          marginTop: 40,
          opacity: urlOpacity,
          fontFamily: inter,
          fontSize: 20,
          fontWeight: 400,
          color: "rgba(255,255,255,0.4)",
          letterSpacing: 2,
        }}
      >
        fomocy.lovable.app
      </div>

      {/* Urgency */}
      <div
        style={{
          marginTop: 60,
          opacity: urgencyOpacity,
          fontFamily: inter,
          fontSize: 18,
          fontWeight: 400,
          color: "#3ec3b7",
          letterSpacing: 6,
          textTransform: "uppercase",
        }}
      >
        🔥 Μόνο 50 εισιτήρια
      </div>
    </AbsoluteFill>
  );
};

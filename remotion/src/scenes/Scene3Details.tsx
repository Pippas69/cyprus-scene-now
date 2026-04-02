import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Cinzel";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: cinzel } = loadFont("normal", { weights: ["700"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["300", "400", "600"], subsets: ["latin"] });

const DetailRow = ({ label, value, delay, frame, fps }: { label: string; value: string; delay: number; frame: number; fps: number }) => {
  const opacity = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const x = interpolate(frame, [delay, delay + 15], [-40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "28px 0",
        borderBottom: "1px solid rgba(62,195,183,0.12)",
        opacity,
        transform: `translateX(${x}px)`,
      }}
    >
      <span style={{ fontFamily: inter, fontSize: 22, fontWeight: 300, color: "rgba(255,255,255,0.4)", letterSpacing: 4, textTransform: "uppercase" }}>
        {label}
      </span>
      <span style={{ fontFamily: inter, fontSize: 26, fontWeight: 600, color: "white" }}>
        {value}
      </span>
    </div>
  );
};

export const Scene3Details = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerSpring = spring({ frame, fps, config: { damping: 15, stiffness: 100 } });
  const headerOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  // Pulsing seafoam glow
  const glowSize = interpolate(Math.sin(frame * 0.06), [-1, 1], [200, 350]);

  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(ellipse at 50% 30%, #0D3B66 0%, #0A1929 60%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 80px",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          top: "25%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: glowSize,
          height: glowSize,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(62,195,183,0.08) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Section title */}
      <div
        style={{
          fontFamily: cinzel,
          fontSize: 42,
          fontWeight: 700,
          color: "#3ec3b7",
          letterSpacing: 8,
          marginBottom: 80,
          opacity: headerOpacity,
          transform: `scale(${headerSpring})`,
        }}
      >
        DETAILS
      </div>

      {/* Info rows */}
      <div style={{ width: "100%" }}>
        <DetailRow label="Ημέρα" value="Κυριακή του Πάσχα" delay={15} frame={frame} fps={fps} />
        <DetailRow label="Ώρα" value="22:30" delay={25} frame={frame} fps={fps} />
        <DetailRow label="DJ" value="George Varveris" delay={35} frame={frame} fps={fps} />
        <DetailRow label="Από" value="Straight from Athens" delay={45} frame={frame} fps={fps} />
      </div>

      {/* Tickets badge */}
      <div
        style={{
          marginTop: 60,
          opacity: interpolate(frame, [60, 75], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          transform: `translateY(${interpolate(frame, [60, 75], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
        }}
      >
        <div
          style={{
            fontFamily: inter,
            fontSize: 18,
            fontWeight: 400,
            color: "rgba(255,255,255,0.35)",
            letterSpacing: 3,
            textAlign: "center",
          }}
        >
          ΕΙΣΙΤΗΡΙΑ ΠΕΡΙΟΡΙΣΜΕΝΑ
        </div>
      </div>
    </AbsoluteFill>
  );
};

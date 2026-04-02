import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile, Img } from "remotion";
import { loadFont } from "@remotion/google-fonts/Cinzel";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: cinzel } = loadFont("normal", { weights: ["700"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["400", "600"], subsets: ["latin"] });

export const Scene2Event = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Image reveal - scale down from zoomed
  const imgScale = interpolate(frame, [0, 60], [1.3, 1.05], { extrapolateRight: "clamp" });
  const imgOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  // Overlay gradient animation
  const overlayOpacity = interpolate(frame, [10, 30], [0, 0.75], { extrapolateRight: "clamp" });

  // Event name entrance
  const titleSpring = spring({ frame: frame - 20, fps, config: { damping: 15, stiffness: 100 } });
  const titleY = interpolate(titleSpring, [0, 1], [80, 0]);
  const titleOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: "clamp" });

  // Venue entrance
  const venueOpacity = interpolate(frame, [40, 55], [0, 1], { extrapolateRight: "clamp" });
  const venueY = interpolate(frame, [40, 55], [20, 0], { extrapolateRight: "clamp" });

  // Seafoam accent line
  const accentWidth = spring({ frame: frame - 35, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0A1929" }}>
      {/* Event image - full bleed with zoom */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
        }}
      >
        <Img
          src={staticFile("images/event.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${imgScale})`,
            opacity: imgOpacity,
          }}
        />
      </div>

      {/* Dark gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(180deg, 
            rgba(10,25,41,0.3) 0%, 
            rgba(10,25,41,${overlayOpacity}) 40%,
            rgba(10,25,41,0.95) 75%,
            #0A1929 100%)`,
        }}
      />

      {/* Content at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 200,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "0 60px",
        }}
      >
        {/* Seafoam accent */}
        <div
          style={{
            width: interpolate(accentWidth, [0, 1], [0, 120]),
            height: 2,
            background: "#3ec3b7",
            marginBottom: 30,
          }}
        />

        {/* Event type badge */}
        <div
          style={{
            fontFamily: inter,
            fontSize: 18,
            fontWeight: 400,
            color: "#3ec3b7",
            letterSpacing: 6,
            textTransform: "uppercase",
            opacity: venueOpacity,
            transform: `translateY(${venueY}px)`,
            marginBottom: 20,
          }}
        >
          EASTER PARTY
        </div>

        {/* Event name */}
        <div
          style={{
            fontFamily: cinzel,
            fontSize: 72,
            fontWeight: 700,
            color: "white",
            textAlign: "center",
            lineHeight: 1.1,
            transform: `translateY(${titleY}px)`,
            opacity: titleOpacity,
            textShadow: "0 4px 30px rgba(0,0,0,0.5)",
          }}
        >
          ΣΟΥΑΡΕ
        </div>

        {/* Venue */}
        <div
          style={{
            fontFamily: inter,
            fontSize: 24,
            fontWeight: 400,
            color: "rgba(255,255,255,0.5)",
            letterSpacing: 4,
            marginTop: 25,
            opacity: venueOpacity,
            transform: `translateY(${venueY}px)`,
          }}
        >
          DSTRKT · LIMASSOL
        </div>
      </div>
    </AbsoluteFill>
  );
};

import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Img, staticFile } from "remotion";
import { TextReveal } from "./components/TextReveal";
import { GlowParticles } from "./components/GlowParticles";

export const MainVideo = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Continuous slow zoom on the background image throughout the entire video
  const scale = interpolate(frame, [0, durationInFrames], [1.0, 1.15], {
    extrapolateRight: "clamp",
  });

  // Slow upward drift
  const translateY = interpolate(frame, [0, durationInFrames], [0, -30], {
    extrapolateRight: "clamp",
  });

  // Subtle vignette overlay opacity
  const vignetteOpacity = interpolate(frame, [0, 30], [0.3, 0.55], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Full-screen event image with cinematic zoom */}
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

      {/* Dark vignette overlay for text readability */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, rgba(0,0,0,${vignetteOpacity * 0.3}) 0%, rgba(0,0,0,${vignetteOpacity}) 100%)`,
        }}
      />

      {/* Subtle top and bottom gradients */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 25%, transparent 65%, rgba(0,0,0,0.6) 100%)`,
        }}
      />

      {/* Floating golden particles */}
      <GlowParticles />

      {/* === TEXT SEQUENCE === */}

      {/* 1. "ΚΥΡΙΑΚΗ ΤΟΥ ΠΑΣΧΑ" — appears at frame 30 */}
      <TextReveal
        text="ΚΥΡΙΑΚΗ"
        startFrame={30}
        y={520}
        fontSize={110}
        fontWeight={900}
        letterSpacing={12}
        fontFamily="serif"
      />
      <TextReveal
        text="ΤΟΥ ΠΑΣΧΑ"
        startFrame={40}
        y={640}
        fontSize={110}
        fontWeight={900}
        letterSpacing={12}
        fontFamily="serif"
      />

      {/* 2. Location — DSTRKT */}
      <TextReveal
        text="DSTRKT"
        startFrame={100}
        y={860}
        fontSize={72}
        fontWeight={300}
        letterSpacing={18}
        exitFrame={160}
      />

      {/* 3. Event name — ΣΟΥΑΡΕ */}
      <TextReveal
        text="ΣΟΥΑΡΕ"
        startFrame={170}
        y={800}
        fontSize={120}
        fontWeight={900}
        letterSpacing={8}
        fontFamily="serif"
      />

      {/* 3b. Music by */}
      <TextReveal
        text="MUSIC BY GEORGE VARVERIS"
        startFrame={195}
        y={930}
        fontSize={32}
        fontWeight={400}
        letterSpacing={6}
      />

      {/* 4. GET YOUR TICKETS NOW */}
      <TextReveal
        text="GET YOUR TICKETS NOW"
        startFrame={260}
        y={750}
        fontSize={58}
        fontWeight={800}
        letterSpacing={5}
      />

      {/* 5. URL */}
      <TextReveal
        text="FOMOCY.LOVABLE.APP"
        startFrame={310}
        y={1050}
        fontSize={40}
        fontWeight={300}
        letterSpacing={8}
        color="#4ECDC4"
      />

      {/* 6. ΦΟΜΟ Logo */}
      <FomoLogo startFrame={340} />
    </AbsoluteFill>
  );
};

// ΦΟΜΟ Logo component
const FomoLogo = ({ startFrame }: { startFrame: number }) => {
  const frame = useCurrentFrame();
  const localFrame = frame - startFrame;

  if (localFrame < 0) return null;

  const opacity = interpolate(localFrame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const scale = interpolate(localFrame, [0, 20], [0.8, 1], { extrapolateRight: "clamp" });
  const glowOpacity = interpolate(localFrame, [20, 40, 60, 80], [0, 0.6, 0.3, 0.6], {
    extrapolateRight: "extend",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 180,
        opacity,
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        {/* ΦΟΜΟ pill logo */}
        <div
          style={{
            background: "linear-gradient(135deg, #0D3B66, #3D6B99)",
            padding: "18px 48px",
            borderRadius: 20,
            boxShadow: `0 0 ${30 + glowOpacity * 20}px rgba(78, 205, 196, ${glowOpacity * 0.5})`,
          }}
        >
          <div
            style={{
              fontFamily: "serif",
              fontSize: 72,
              fontWeight: 900,
              color: "#FFFFFF",
              letterSpacing: 6,
            }}
          >
            ΦΟΜΟ
          </div>
        </div>
        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: 24,
            fontWeight: 300,
            color: "#4ECDC4",
            letterSpacing: 8,
            marginTop: 8,
          }}
        >
          FOMO CYPRUS
        </div>
      </div>
    </AbsoluteFill>
  );
};

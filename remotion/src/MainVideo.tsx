import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Img, staticFile } from "remotion";
import { TextReveal } from "./components/TextReveal";
import { GlowParticles } from "./components/GlowParticles";

export const MainVideo = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Continuous slow zoom
  const scale = interpolate(frame, [0, durationInFrames], [1.0, 1.18], {
    extrapolateRight: "clamp",
  });
  const translateY = interpolate(frame, [0, durationInFrames], [0, -40], {
    extrapolateRight: "clamp",
  });

  // Stronger overlay to hide original image text
  const overlayOpacity = interpolate(frame, [0, 20], [0.4, 0.65], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Full-screen event image */}
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

      {/* Dark overlay to cover original text */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, rgba(0,0,0,${overlayOpacity * 0.5}) 0%, rgba(0,0,0,${overlayOpacity}) 100%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.6) 100%)`,
        }}
      />

      <GlowParticles />

      {/* === SEQUENTIAL TEXT — one at a time === */}

      {/* 1. "ΚΥΡΙΑΚΗ ΤΟΥ ΠΑΣΧΑ" (frames 25-95) */}
      <TextReveal
        text="ΚΥΡΙΑΚΗ"
        startFrame={25}
        exitFrame={90}
        y={680}
        fontSize={115}
        fontWeight={900}
        letterSpacing={10}
        fontFamily="serif"
      />
      <TextReveal
        text="ΤΟΥ ΠΑΣΧΑ"
        startFrame={35}
        exitFrame={90}
        y={810}
        fontSize={115}
        fontWeight={900}
        letterSpacing={10}
        fontFamily="serif"
      />

      {/* 2. DSTRKT (frames 105-165) */}
      <TextReveal
        text="D S T R K T"
        startFrame={105}
        exitFrame={165}
        y={850}
        fontSize={80}
        fontWeight={300}
        letterSpacing={20}
      />

      {/* 3. ΣΟΥΑΡΕ + music (frames 180-255) */}
      <TextReveal
        text="ΣΟΥΑΡΕ"
        startFrame={180}
        exitFrame={255}
        y={750}
        fontSize={130}
        fontWeight={900}
        letterSpacing={6}
        fontFamily="serif"
      />
      <TextReveal
        text="MUSIC BY GEORGE VARVERIS"
        startFrame={200}
        exitFrame={255}
        y={900}
        fontSize={30}
        fontWeight={400}
        letterSpacing={6}
      />

      {/* 4. GET YOUR TICKETS NOW (frames 270-340) */}
      <TextReveal
        text="GET YOUR"
        startFrame={270}
        exitFrame={345}
        y={740}
        fontSize={72}
        fontWeight={800}
        letterSpacing={6}
      />
      <TextReveal
        text="TICKETS NOW"
        startFrame={280}
        exitFrame={345}
        y={830}
        fontSize={72}
        fontWeight={800}
        letterSpacing={6}
      />

      {/* 5. URL + ΦΟΜΟ logo (frames 350+) */}
      <TextReveal
        text="FOMOCY.LOVABLE.APP"
        startFrame={350}
        y={780}
        fontSize={42}
        fontWeight={300}
        letterSpacing={8}
        color="#4ECDC4"
      />
      <FomoLogo startFrame={370} />
    </AbsoluteFill>
  );
};

const FomoLogo = ({ startFrame }: { startFrame: number }) => {
  const frame = useCurrentFrame();
  const localFrame = frame - startFrame;
  if (localFrame < 0) return null;

  const opacity = interpolate(localFrame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const scale = interpolate(localFrame, [0, 20], [0.8, 1], { extrapolateRight: "clamp" });
  const glowPulse = 0.4 + Math.sin(localFrame * 0.08) * 0.3;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 240,
        opacity,
      }}
    >
      <div style={{ transform: `scale(${scale})`, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div
          style={{
            background: "linear-gradient(135deg, #0D3B66, #3D6B99)",
            padding: "16px 44px",
            borderRadius: 18,
            boxShadow: `0 0 ${40}px rgba(78, 205, 196, ${glowPulse * 0.5})`,
          }}
        >
          <div style={{ fontFamily: "serif", fontSize: 64, fontWeight: 900, color: "#FFF", letterSpacing: 6 }}>
            ΦΟΜΟ
          </div>
        </div>
        <div style={{ fontFamily: "sans-serif", fontSize: 22, fontWeight: 300, color: "#4ECDC4", letterSpacing: 8, marginTop: 6 }}>
          FOMO CYPRUS
        </div>
      </div>
    </AbsoluteFill>
  );
};

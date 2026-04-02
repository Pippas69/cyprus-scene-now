import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Img, staticFile } from "remotion";
import { TextReveal } from "./components/TextReveal";
import { GlowParticles } from "./components/GlowParticles";

export const MainVideo = () => {
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

      {/* Heavy overlay to fully hide original text */}
      <AbsoluteFill style={{ background: "rgba(0,0,0,0.45)" }} />
      <AbsoluteFill
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.15) 55%, rgba(0,0,0,0.5) 80%, rgba(0,0,0,0.85) 100%)",
        }}
      />

      <GlowParticles />

      {/* === SEQUENTIAL TEXT === */}

      {/* 1. ΚΥΡΙΑΚΗ ΤΟΥ ΠΑΣΧΑ */}
      <TextReveal text="ΚΥΡΙΑΚΗ" startFrame={25} exitFrame={90} y={700} fontSize={120} fontWeight={900} letterSpacing={10} fontFamily="serif" />
      <TextReveal text="ΤΟΥ ΠΑΣΧΑ" startFrame={35} exitFrame={90} y={840} fontSize={120} fontWeight={900} letterSpacing={10} fontFamily="serif" />

      {/* 2. DSTRKT */}
      <TextReveal text="D S T R K T" startFrame={105} exitFrame={165} y={860} fontSize={80} fontWeight={300} letterSpacing={22} />

      {/* 3. ΣΟΥΑΡΕ + DJ */}
      <TextReveal text="ΣΟΥΑΡΕ" startFrame={180} exitFrame={255} y={750} fontSize={140} fontWeight={900} letterSpacing={6} fontFamily="serif" />
      <TextReveal text="MUSIC BY GEORGE VARVERIS" startFrame={200} exitFrame={255} y={910} fontSize={30} fontWeight={400} letterSpacing={6} />

      {/* 4. GET YOUR TICKETS NOW */}
      <TextReveal text="GET YOUR" startFrame={270} exitFrame={345} y={750} fontSize={76} fontWeight={800} letterSpacing={6} />
      <TextReveal text="TICKETS NOW" startFrame={280} exitFrame={345} y={845} fontSize={76} fontWeight={800} letterSpacing={6} />

      {/* 5. URL + ΦΟΜΟ */}
      <TextReveal text="FOMOCY.LOVABLE.APP" startFrame={350} y={750} fontSize={42} fontWeight={300} letterSpacing={8} color="#4ECDC4" />
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
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingTop: 200, opacity }}>
      <div style={{ transform: `scale(${scale})`, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div
          style={{
            background: "linear-gradient(135deg, #0D3B66, #3D6B99)",
            padding: "18px 50px",
            borderRadius: 20,
            boxShadow: `0 0 40px rgba(78, 205, 196, ${glowPulse * 0.5})`,
          }}
        >
          <div style={{ fontFamily: "serif", fontSize: 72, fontWeight: 900, color: "#FFF", letterSpacing: 6 }}>ΦΟΜΟ</div>
        </div>
        <div style={{ fontFamily: "sans-serif", fontSize: 22, fontWeight: 300, color: "#4ECDC4", letterSpacing: 8, marginTop: 8 }}>
          FOMO CYPRUS
        </div>
      </div>
    </AbsoluteFill>
  );
};

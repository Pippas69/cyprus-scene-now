import { useMemo } from "react";

interface Particle {
  id: number;
  size: number;
  x: number;
  y: number;
  duration: number;
  delay: number;
  color: string;
  blur: boolean;
}

interface ParticleBackgroundProps {
  particleCount?: number;
  className?: string;
}

const ParticleBackground = ({ particleCount = 30, className = "" }: ParticleBackgroundProps) => {
  const particles = useMemo<Particle[]>(() => {
    const colors = [
      "bg-seafoam/20",
      "bg-aegean/25",
      "bg-aegean/20",
      "bg-seafoam/30",
      "bg-seafoam/15",
    ];
    
    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      size: Math.random() * 8 + 4, // 4px to 12px
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 20 + 15, // 15s to 35s
      delay: Math.random() * 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      blur: Math.random() > 0.6,
    }));
  }, [particleCount]);

  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== "undefined" 
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches 
    : false;

  if (prefersReducedMotion) {
    return null;
  }

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={`absolute rounded-full ${particle.color} ${particle.blur ? "blur-sm" : ""}`}
          style={{
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            animation: `float-particle ${particle.duration}s ease-in-out ${particle.delay}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes float-particle {
          0%, 100% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 0.6;
          }
          25% {
            transform: translate(20px, -30px) rotate(90deg);
            opacity: 0.8;
          }
          50% {
            transform: translate(-10px, -60px) rotate(180deg);
            opacity: 0.4;
          }
          75% {
            transform: translate(15px, -30px) rotate(270deg);
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
};

export default ParticleBackground;

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ConfettiPiece {
  id: number;
  x: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  rotation: number;
}

interface ConfettiProps {
  isActive: boolean;
  duration?: number;
  particleCount?: number;
  onComplete?: () => void;
}

const COLORS = [
  'hsl(207 72% 22%)',   // Aegean
  'hsl(0 100% 70%)',    // Sunset Coral
  'hsl(174 62% 56%)',   // Seafoam
  'hsl(30 75% 98%)',    // Sand White
  'hsl(207 72% 35%)',   // Ocean
];

export function Confetti({ 
  isActive, 
  duration = 3000, 
  particleCount = 50,
  onComplete 
}: ConfettiProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isActive) {
      const newPieces: ConfettiPiece[] = Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 6 + Math.random() * 8,
        rotation: Math.random() * 360,
      }));
      
      setPieces(newPieces);
      setIsVisible(true);

      const timer = setTimeout(() => {
        setIsVisible(false);
        setPieces([]);
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isActive, duration, particleCount, onComplete]);

  if (!isVisible || pieces.length === 0) return null;

  return createPortal(
    <div 
      className="fixed inset-0 pointer-events-none z-[100] overflow-hidden"
      aria-hidden="true"
    >
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${piece.x}%`,
            top: '-20px',
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            backgroundColor: piece.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            transform: `rotate(${piece.rotation}deg)`,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
          }}
        />
      ))}
    </div>,
    document.body
  );
}

// Hook for easy confetti triggering
export function useConfetti() {
  const [isActive, setIsActive] = useState(false);

  const trigger = () => {
    setIsActive(true);
  };

  const reset = () => {
    setIsActive(false);
  };

  return { isActive, trigger, reset };
}

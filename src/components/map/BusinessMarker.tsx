/**
 * PREMIUM BUSINESS PIN - FOMO MAP
 *
 * Design Rules:
 * - Clean, professional pin shape
 * - Visual hierarchy through: size, color intensity, glow
 * - Plan colors MATCH subscription UI exactly
 * - Elite: Purple (premium, subtle pulse animation)
 * - Pro: Coral/Orange (larger, premium shape with glow)
 * - Basic: Cyan/Blue (same shape as Free but larger)
 * - Free: Original muted color (smallest, subtle)
 */

import type { PlanSlug } from "@/lib/businessRanking";

interface BusinessMarkerProps {
  planSlug: PlanSlug;
  /** Stable unique id (use business.id). Needed so SVG defs never break. */
  markerId: string;
  name: string;
  onClick: () => void;
}

/**
 * Pin configuration based on subscription plan - strict visual hierarchy
 * Free: Micro size, original muted styling
 * Basic: Same shape as Free, slightly larger, cyan color
 * Pro: Premium diamond/shield shape, larger, coral with glow
 * Elite: Premium shape, largest, purple with subtle pulse animation
 */
const PIN_CONFIG: Record<PlanSlug, {
  size: number;
  opacity: number;
  shadowBlur: number;
  strokeWidth: number;
  glowRadius: number;
  isPremiumShape: boolean;
  hasPulseAnimation: boolean;
}> = {
  free: {
    size: 16,         // Smallest - micro presence
    opacity: 0.7,     // Slightly muted
    shadowBlur: 2,
    strokeWidth: 1,
    glowRadius: 0,
    isPremiumShape: false,
    hasPulseAnimation: false,
  },
  basic: {
    size: 24,         // Slightly larger than Free
    opacity: 0.9,
    shadowBlur: 3,
    strokeWidth: 1.5,
    glowRadius: 0,
    isPremiumShape: false,
    hasPulseAnimation: false,
  },
  pro: {
    size: 32,         // Larger than Basic
    opacity: 0.95,
    shadowBlur: 5,
    strokeWidth: 2,
    glowRadius: 4,    // Subtle glow for premium
    isPremiumShape: true,
    hasPulseAnimation: false,
  },
  elite: {
    size: 38,         // Slightly larger than Pro (NOT huge)
    opacity: 1,
    shadowBlur: 6,
    strokeWidth: 2,
    glowRadius: 6,    // Premium glow
    isPremiumShape: true,
    hasPulseAnimation: true,
  },
};

/**
 * Plan colors - MUST MATCH subscription UI colors exactly
 * Basic = Cyan (Zap icon in SubscriptionPlans)
 * Pro = Coral/Orange (Star icon in SubscriptionPlans)
 * Elite = Purple (Crown icon in SubscriptionPlans)
 * Free = Original ocean/teal color (muted)
 */
const PIN_COLORS: Record<PlanSlug, {
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
}> = {
  free: {
    // Original ocean/teal color - not gray, but muted teal
    primary: '#3D6B99',     // Ocean blue
    secondary: '#5A8AB8',   // Lighter ocean
    accent: '#7BA3C7',      // Light accent
    glow: 'transparent',
  },
  basic: {
    // Cyan - matches Basic plan badge
    primary: '#06b6d4',     // Cyan 500
    secondary: '#22d3ee',   // Cyan 400
    accent: '#67e8f9',      // Cyan 300
    glow: 'rgba(6, 182, 212, 0.25)',
  },
  pro: {
    // Coral/Orange - matches Pro plan badge
    primary: '#f97316',     // Orange 500
    secondary: '#fb923c',   // Orange 400
    accent: '#fdba74',      // Orange 300
    glow: 'rgba(249, 115, 22, 0.35)',
  },
  elite: {
    // Purple - matches Elite plan badge (Crown)
    primary: '#8b5cf6',     // Violet 500
    secondary: '#a78bfa',   // Violet 400
    accent: '#c4b5fd',      // Violet 300
    glow: 'rgba(139, 92, 246, 0.4)',
  },
};

const toSvgSafeId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '_');

// Standard teardrop pin path for Free and Basic
const StandardPinPath = () => (
  <path
    d="M20 2 C10 2, 2 10, 2 18 C2 28, 20 46, 20 46 C20 46, 38 28, 38 18 C38 10, 30 2, 20 2 Z"
  />
);

// Premium diamond/shield shape for Pro and Elite
const PremiumPinPath = () => (
  <path
    d="M20 1 L35 12 L32 32 L20 47 L8 32 L5 12 Z"
  />
);

export const BusinessMarker = ({ planSlug, markerId, name, onClick }: BusinessMarkerProps) => {
  const config = PIN_CONFIG[planSlug];
  const colors = PIN_COLORS[planSlug];
  const { size, opacity, shadowBlur, strokeWidth, glowRadius, isPremiumShape, hasPulseAnimation } = config;

  const safeId = toSvgSafeId(`${planSlug}-${markerId}`);

  // Calculate z-index based on plan tier
  const zIndex = planSlug === 'elite' ? 40 : planSlug === 'pro' ? 30 : planSlug === 'basic' ? 20 : 10;

  return (
    <div
      onClick={onClick}
      className="relative cursor-pointer transition-all duration-300 ease-out hover:scale-110 hover:-translate-y-1"
      style={{
        opacity,
        filter: `drop-shadow(0 ${shadowBlur}px ${shadowBlur * 2}px rgba(0,0,0,0.25))`,
        zIndex,
      }}
      title={name}
      aria-label={name}
      role="button"
    >
      {/* Outer glow for Pro and Elite */}
      {glowRadius > 0 && (
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: size + glowRadius * 4,
            height: size + glowRadius * 4,
            left: -glowRadius * 2,
            top: -glowRadius * 2,
            background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
            animation: hasPulseAnimation ? 'elitePulse 3s ease-in-out infinite' : undefined,
          }}
        />
      )}

      <svg
        width={size}
        height={size * 1.25}
        viewBox="0 0 40 50"
        className="transition-transform duration-200"
        style={{
          animation: hasPulseAnimation ? 'eliteGlow 3s ease-in-out infinite' : undefined,
        }}
      >
        <defs>
          <linearGradient id={`pin-fill-${safeId}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.accent} />
            <stop offset="40%" stopColor={colors.secondary} />
            <stop offset="100%" stopColor={colors.primary} />
          </linearGradient>

          <radialGradient id={`pin-highlight-${safeId}`} cx="30%" cy="25%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.55" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>

          {/* Drop shadow filter for premium pins */}
          {isPremiumShape && (
            <filter id={`pin-shadow-${safeId}`} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor={colors.primary} floodOpacity="0.4"/>
            </filter>
          )}
        </defs>

        {/* Ground shadow */}
        <ellipse
          cx="20"
          cy="48"
          rx={isPremiumShape ? 8 : planSlug === 'basic' ? 5 : 3}
          ry="2"
          fill="black"
          fillOpacity={isPremiumShape ? 0.2 : 0.12}
        />

        {/* Pin shape - standard teardrop for Free/Basic, premium for Pro/Elite */}
        <g filter={isPremiumShape ? `url(#pin-shadow-${safeId})` : undefined}>
          {isPremiumShape ? (
            <path
              d="M20 1 L35 12 L32 32 L20 47 L8 32 L5 12 Z"
              fill={`url(#pin-fill-${safeId})`}
              stroke="white"
              strokeWidth={strokeWidth}
            />
          ) : (
            <path
              d="M20 2 C10 2, 2 10, 2 18 C2 28, 20 46, 20 46 C20 46, 38 28, 38 18 C38 10, 30 2, 20 2 Z"
              fill={`url(#pin-fill-${safeId})`}
              stroke="white"
              strokeWidth={strokeWidth}
            />
          )}
        </g>

        {/* Inner highlight overlay */}
        {isPremiumShape ? (
          <path
            d="M20 3 L33 13 L30 31 L20 45 L10 31 L7 13 Z"
            fill={`url(#pin-highlight-${safeId})`}
          />
        ) : (
          <path
            d="M20 4 C11 4, 4 11, 4 18 C4 26, 20 44, 20 44 C20 44, 36 26, 36 18 C36 11, 29 4, 20 4 Z"
            fill={`url(#pin-highlight-${safeId})`}
          />
        )}

        {/* Center dot - size varies by plan */}
        <circle
          cx="20"
          cy={isPremiumShape ? 16 : 18}
          r={isPremiumShape ? (planSlug === 'elite' ? 7 : 6) : (planSlug === 'basic' ? 5 : 4)}
          fill="white"
          fillOpacity="0.95"
        />

        {/* Inner accent dot for premium tiers */}
        {isPremiumShape && (
          <circle
            cx="20"
            cy="16"
            r={planSlug === 'elite' ? 3 : 2}
            fill={colors.primary}
          />
        )}
      </svg>

      {/* Keyframes for Elite pulse animation - injected via style tag */}
      {hasPulseAnimation && (
        <style>{`
          @keyframes elitePulse {
            0%, 100% { opacity: 0.7; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.1); }
          }
          @keyframes eliteGlow {
            0%, 100% { filter: brightness(1); }
            50% { filter: brightness(1.15); }
          }
        `}</style>
      )}
    </div>
  );
};

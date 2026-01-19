/**
 * PREMIUM BUSINESS PIN - FOMO MAP
 *
 * Design Rules:
 * - Clean, professional pin shape (no numbers, no text, no labels)
 * - Visual hierarchy through: size, color intensity, glow
 * - Plan colors MATCH subscription UI exactly
 * - Elite: Purple + Crown glow (largest, most premium)
 * - Pro: Coral/Orange (larger, sharp outline)  
 * - Basic: Cyan/Blue (normal size)
 * - Free: Muted/Gray (smallest, subtle)
 */

import type { PlanSlug } from "@/lib/businessRanking";

interface BusinessMarkerProps {
  planSlug: PlanSlug;
  /** Stable unique id (use business.id). Needed so SVG defs never break. */
  markerId: string;
  name: string;
  onClick: () => void;
}

// Pin configuration based on subscription plan - strict visual hierarchy
const PIN_CONFIG: Record<PlanSlug, {
  size: number;
  opacity: number;
  shadowBlur: number;
  strokeWidth: number;
  glowRadius: number;
}> = {
  free: {
    size: 18,        // Micro - barely noticeable
    opacity: 0.55,   // Low visibility
    shadowBlur: 1,
    strokeWidth: 0.8,
    glowRadius: 0,
  },
  basic: {
    size: 26,        // Slightly larger than Free
    opacity: 0.85,
    shadowBlur: 3,
    strokeWidth: 1.5,
    glowRadius: 0,
  },
  pro: {
    size: 34,        // Noticeably larger than Basic
    opacity: 0.95,
    shadowBlur: 5,
    strokeWidth: 2,
    glowRadius: 3,   // Subtle glow
  },
  elite: {
    size: 44,        // Largest - dominant presence
    opacity: 1,
    shadowBlur: 8,
    strokeWidth: 2.5,
    glowRadius: 6,   // Premium glow
  },
};

/**
 * Plan colors - MUST MATCH subscription UI colors exactly
 * Basic = Cyan/Blue (Zap icon in SubscriptionPlans)
 * Pro = Coral/Orange (Star icon in SubscriptionPlans)
 * Elite = Purple (Crown icon in SubscriptionPlans)
 * Free = Muted gray
 */
const PIN_COLORS: Record<PlanSlug, {
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
}> = {
  free: {
    // Muted, low visibility - subtle presence
    primary: '#94a3b8',     // Slate 400
    secondary: '#cbd5e1',   // Slate 300
    accent: '#e2e8f0',      // Slate 200
    glow: 'transparent',
  },
  basic: {
    // Cyan/Blue - matches Basic plan badge
    primary: '#06b6d4',     // Cyan 500
    secondary: '#22d3ee',   // Cyan 400
    accent: '#67e8f9',      // Cyan 300
    glow: 'rgba(6, 182, 212, 0.3)',
  },
  pro: {
    // Coral/Orange - matches Pro plan badge
    primary: '#f97316',     // Orange 500
    secondary: '#fb923c',   // Orange 400
    accent: '#fdba74',      // Orange 300
    glow: 'rgba(249, 115, 22, 0.35)',
  },
  elite: {
    // Purple/Gold - matches Elite plan badge (Crown)
    primary: '#8b5cf6',     // Violet 500
    secondary: '#a78bfa',   // Violet 400
    accent: '#c4b5fd',      // Violet 300
    glow: 'rgba(139, 92, 246, 0.4)',
  },
};

const toSvgSafeId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '_');

export const BusinessMarker = ({ planSlug, markerId, name, onClick }: BusinessMarkerProps) => {
  const config = PIN_CONFIG[planSlug];
  const colors = PIN_COLORS[planSlug];
  const { size, opacity, shadowBlur, strokeWidth, glowRadius } = config;

  const safeId = toSvgSafeId(`${planSlug}-${markerId}`);

  return (
    <div
      onClick={onClick}
      className="relative cursor-pointer transition-all duration-300 ease-out hover:scale-110 hover:-translate-y-1"
      style={{
        opacity,
        filter: `drop-shadow(0 ${shadowBlur}px ${shadowBlur * 2}px rgba(0,0,0,0.3))`,
        zIndex: planSlug === 'elite' ? 40 : planSlug === 'pro' ? 30 : planSlug === 'basic' ? 20 : 10,
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
            width: size + glowRadius * 3,
            height: size + glowRadius * 3,
            left: -glowRadius * 1.5,
            top: -glowRadius * 1.5,
            background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
            animation: planSlug === 'elite' ? 'pulse 2.5s ease-in-out infinite' : undefined,
          }}
        />
      )}

      <svg
        width={size}
        height={size * 1.25}
        viewBox="0 0 40 50"
        className="transition-transform duration-200"
      >
        <defs>
          <linearGradient id={`pin-fill-${safeId}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.accent} />
            <stop offset="50%" stopColor={colors.secondary} />
            <stop offset="100%" stopColor={colors.primary} />
          </linearGradient>

          <radialGradient id={`pin-highlight-${safeId}`} cx="30%" cy="30%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.5" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ground shadow - larger for premium tiers */}
        <ellipse
          cx="20"
          cy="48"
          rx={planSlug === 'elite' ? 10 : planSlug === 'pro' ? 7 : planSlug === 'basic' ? 5 : 3}
          ry="2"
          fill="black"
          fillOpacity={planSlug === 'elite' ? 0.25 : planSlug === 'pro' ? 0.2 : 0.12}
        />

        {/* Pin shape - clean teardrop */}
        <path
          d="M20 2 C10 2, 2 10, 2 18 C2 28, 20 46, 20 46 C20 46, 38 28, 38 18 C38 10, 30 2, 20 2 Z"
          fill={`url(#pin-fill-${safeId})`}
          stroke="white"
          strokeWidth={strokeWidth}
        />

        {/* Inner highlight overlay */}
        <path
          d="M20 4 C11 4, 4 11, 4 18 C4 26, 20 44, 20 44 C20 44, 36 26, 36 18 C36 11, 29 4, 20 4 Z"
          fill={`url(#pin-highlight-${safeId})`}
        />

        {/* Center dot - size varies by plan */}
        <circle
          cx="20"
          cy="18"
          r={planSlug === 'elite' ? 9 : planSlug === 'pro' ? 7 : planSlug === 'basic' ? 5 : 4}
          fill="white"
          fillOpacity="0.95"
        />

        {/* Inner accent dot for premium tiers */}
        {(planSlug === 'elite' || planSlug === 'pro') && (
          <circle
            cx="20"
            cy="18"
            r={planSlug === 'elite' ? 4 : 2.5}
            fill={colors.primary}
          />
        )}
      </svg>
    </div>
  );
};

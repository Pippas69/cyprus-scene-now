/**
 * BUSINESS PIN - FOMO MAP
 *
 * Visual hierarchy by plan:
 * - Free: small teardrop (muted ocean)
 * - Basic: larger teardrop (blue)
 * - Pro: larger teardrop (purple) with star icon
 * - Elite: largest teardrop (gold) with crown icon
 */

import type { PlanSlug } from "@/lib/businessRanking";

interface BusinessMarkerProps {
  planSlug: PlanSlug;
  /** Stable unique id (use business.id). Needed so SVG defs never break. */
  markerId: string;
  name: string;
  onClick: () => void;
  /** Current map zoom level for dynamic pin scaling */
  zoom?: number;
}

/**
 * Pin configuration based on subscription plan - strict visual hierarchy
 * Free/Basic/Pro/Elite all use the SAME teardrop silhouette as in the reference.
 * Pro/Elite are distinguished by color + icon.
 */
// Responsive sizes: desktop / tablet / mobile (progressively smaller at initial zoom)
// When user clicks a pin and zooms in, sizes feel good - these are for initial overview
const PIN_CONFIG: Record<PlanSlug, {
  desktopSize: number;  // lg+
  tabletSize: number;   // md-lg
  mobileSize: number;   // <md
  opacity: number;
  shadowBlur: number;
  strokeWidth: number;
  glowRadius: number;
  isPremiumShape: boolean;
  hasPulseAnimation: boolean;
}> = {
  // Free - smallest pins (slightly larger for visibility)
  free: {
    desktopSize: 10,
    tabletSize: 10,
    mobileSize: 10,
    opacity: 0.7,
    shadowBlur: 2,
    strokeWidth: 1,
    glowRadius: 0,
    isPremiumShape: false,
    hasPulseAnimation: false,
  },
  basic: {
    desktopSize: 11,
    tabletSize: 11,
    mobileSize: 11,
    opacity: 1,
    shadowBlur: 3,
    strokeWidth: 1.5,
    glowRadius: 0,
    isPremiumShape: false,
    hasPulseAnimation: false,
  },
  pro: {
    desktopSize: 14,
    tabletSize: 13,
    mobileSize: 11,
    opacity: 1,
    shadowBlur: 4,
    strokeWidth: 2,
    glowRadius: 0,
    isPremiumShape: false,
    hasPulseAnimation: false,
  },
  elite: {
    desktopSize: 16,
    tabletSize: 15,
    mobileSize: 13,
    opacity: 1,
    shadowBlur: 4,
    strokeWidth: 2,
    glowRadius: 0,
    isPremiumShape: false,
    hasPulseAnimation: false,
  },
};

/**
 * Plan colors (HSL tokens)
 * - Free: keep the existing ocean color behavior
 * - Basic: blue/cyan
 * - Pro: purple
 * - Elite: gold
 */
const PIN_COLORS: Record<PlanSlug, {
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
}> = {
  free: {
    primary: 'hsl(var(--ocean))',
    secondary: 'hsl(var(--ocean) / 0.85)',
    accent: 'hsl(var(--ocean) / 0.65)',
    glow: 'transparent',
  },
  basic: {
    primary: 'hsl(var(--plan-basic))',
    secondary: 'hsl(var(--plan-basic) / 0.9)',
    accent: 'hsl(var(--plan-basic) / 0.75)',
    glow: 'transparent',
  },
  pro: {
    // Purple/violet color matching Elite subscription badge style
    primary: 'hsl(var(--plan-pro))',
    secondary: 'hsl(var(--plan-pro) / 0.9)',
    accent: 'hsl(var(--plan-pro) / 0.75)',
    glow: 'transparent',
  },
  elite: {
    primary: 'hsl(var(--plan-elite))',
    secondary: 'hsl(var(--plan-elite) / 0.92)',
    accent: 'hsl(var(--plan-elite) / 0.78)',
    glow: 'transparent',
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

export const BusinessMarker = ({ planSlug, markerId, name, onClick, zoom = 10 }: BusinessMarkerProps) => {
  const config = PIN_CONFIG[planSlug];
  const colors = PIN_COLORS[planSlug];
  const { opacity, shadowBlur, strokeWidth, glowRadius, isPremiumShape, hasPulseAnimation, desktopSize, tabletSize, mobileSize } = config;
  
  // Responsive size: mobile < 768, tablet 768-1024, desktop 1024+
  const getResponsiveSize = () => {
    if (typeof window === 'undefined') return desktopSize;
    const width = window.innerWidth;
    if (width < 768) return mobileSize;
    if (width < 1024) return tabletSize;
    return desktopSize;
  };
  const baseSize = getResponsiveSize();
  
  // Scale pins up slightly as user zooms in (1.0x at zoom 7, up to ~1.5x at zoom 16+)
  const zoomScale = 1 + Math.max(0, Math.min(zoom - 7, 9)) * 0.055;
  const size = Math.round(baseSize * zoomScale);

  const safeId = toSvgSafeId(`${planSlug}-${markerId}`);

  // Calculate z-index based on plan tier
  const zIndex = planSlug === 'elite' ? 40 : planSlug === 'pro' ? 30 : planSlug === 'basic' ? 20 : 10;


  return (
    <div
      onClick={onClick}
      className="relative cursor-pointer transition-all duration-300 ease-out hover:scale-110 hover:-translate-y-1"
      style={{
        opacity,
        filter: `drop-shadow(0 ${shadowBlur}px ${shadowBlur * 2}px rgba(0,0,0,0.2))`,
        zIndex,
      }}
      title={name}
      aria-label={name}
      role="button"
    >
      {/* Outer glow for Pro */}
      {glowRadius > 0 && (
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: size + glowRadius * 4,
            height: size + glowRadius * 4,
            left: -glowRadius * 2,
            top: -glowRadius * 2,
            background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
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
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor={colors.primary} floodOpacity="0.4" />
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

        {/* Pin shape - standard teardrop for Free/Basic, premium for Pro */}
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

        {/* Center icon */}
        {planSlug === 'pro' || planSlug === 'elite' ? (
          <g fill="white" fillOpacity="0.96">
            {planSlug === 'pro' ? (
              // Star (5-point)
              <path d="M20 11.2 L22.9 16.9 L29.6 17.9 L24.8 22.2 L26 28.9 L20 25.7 L14 28.9 L15.2 22.2 L10.4 17.9 L17.1 16.9 Z" />
            ) : (
              // Crown (Lucide-style: 3 spikes + band)
              <path d="M11 26 L13 16 L17 20 L20 13 L23 20 L27 16 L29 26 Z" />
            )}
          </g>
        ) : (
          <circle
            cx="20"
            cy="18"
            r={planSlug === 'basic' ? 5 : 4}
            fill="white"
            fillOpacity="0.95"
          />
        )}

        {/* Elite subtle golden glow pulse */}
        {planSlug === 'elite' && (
          <>
            <circle
              cx="20"
              cy="18"
              r="14"
              fill="none"
              stroke="white"
              strokeOpacity="0.25"
              strokeWidth="2"
              style={{ animation: 'eliteGlowPulse 4s ease-in-out infinite' }}
            />
            <style>{`
              @keyframes eliteGlowPulse {
                0%, 100% { stroke-opacity: 0.2; r: 14; }
                50% { stroke-opacity: 0.45; r: 16; }
              }
            `}</style>
          </>
        )}
      </svg>

      {/* (Kept for API compatibility; currently only Elite animates) */}
      {hasPulseAnimation && null}
    </div>
  );
};

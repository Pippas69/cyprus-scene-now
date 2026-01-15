/**
 * PREMIUM BUSINESS PIN - FOMO MAP
 *
 * Design Rules:
 * - Clean, professional pin shape (no numbers, no text, no labels)
 * - Differentiation ONLY through: size, intensity, clarity
 * - Plan hierarchy: Elite (largest, most prominent) → Pro → Basic → Free (smallest, subtle)
 * - No "featured", "elite", or plan labels visible
 */

interface BusinessMarkerProps {
  planSlug: 'free' | 'basic' | 'pro' | 'elite';
  /** Stable unique id (use business.id). Needed so SVG defs never break. */
  markerId: string;
  name: string;
  onClick: () => void;
}

// Pin sizes based on subscription plan - strict hierarchy
const PIN_CONFIG: Record<'free' | 'basic' | 'pro' | 'elite', {
  size: number;
  opacity: number;
  shadowBlur: number;
  strokeWidth: number;
  glowRadius: number;
}> = {
  free: {
    size: 20,
    opacity: 0.7,
    shadowBlur: 2,
    strokeWidth: 1,
    glowRadius: 0,
  },
  basic: {
    size: 28,
    opacity: 0.85,
    shadowBlur: 4,
    strokeWidth: 1.5,
    glowRadius: 0,
  },
  pro: {
    size: 36,
    opacity: 0.95,
    shadowBlur: 6,
    strokeWidth: 2,
    glowRadius: 4,
  },
  elite: {
    size: 48,
    opacity: 1,
    shadowBlur: 10,
    strokeWidth: 2.5,
    glowRadius: 8,
  },
};

// Mediterranean color palette - unified brand identity
// IMPORTANT: keep colors aligned with design tokens (HSL) for consistent theming.
const PIN_COLORS: Record<'free' | 'basic' | 'pro' | 'elite', {
  primary: string;
  secondary: string;
  accent: string;
}> = {
  free: {
    // Subtle but still "premium" (ocean blue, not gray)
    primary: 'hsl(var(--ocean))',
    secondary: 'hsl(var(--aegean))',
    accent: 'hsl(var(--accent))',
  },
  basic: {
    primary: 'hsl(var(--aegean))',
    secondary: 'hsl(var(--ocean))',
    accent: 'hsl(var(--accent))',
  },
  pro: {
    // Brighter ocean tier
    primary: 'hsl(var(--ocean))',
    secondary: 'hsl(var(--accent))',
    accent: 'hsl(var(--seafoam))',
  },
  elite: {
    // Seafoam prestige
    primary: 'hsl(var(--seafoam))',
    secondary: 'hsl(var(--accent))',
    accent: 'hsl(var(--seafoam))',
  },
};

const toSvgSafeId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '_');

export const BusinessMarker = ({ planSlug, markerId, name, onClick }: BusinessMarkerProps) => {
  const config = PIN_CONFIG[planSlug];
  const colors = PIN_COLORS[planSlug];
  const { size, opacity, shadowBlur, strokeWidth, glowRadius } = config;

  // CRITICAL: SVG ids must not contain spaces/special chars.
  // Using business.id ensures uniqueness and prevents gradients from silently failing.
  const safeId = toSvgSafeId(`${planSlug}-${markerId}`);

  return (
    <div
      onClick={onClick}
      className="relative cursor-pointer transition-all duration-300 ease-out hover:scale-110 hover:-translate-y-1"
      style={{
        opacity,
        filter: `drop-shadow(0 ${shadowBlur}px ${shadowBlur * 2}px rgba(0,0,0,0.25))`,
      }}
      title={name}
      aria-label={name}
      role="button"
    >
      {/* Subtle outer glow for Pro and Elite */}
      {glowRadius > 0 && (
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: size + glowRadius * 2,
            height: size + glowRadius * 2,
            left: -glowRadius,
            top: -glowRadius,
            background: `radial-gradient(circle, ${colors.secondary}30 0%, transparent 70%)`,
            animation: planSlug === 'elite' ? 'pulse 3s ease-in-out infinite' : undefined,
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
            <stop offset="0%" stopColor="white" stopOpacity="0.4" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ground shadow */}
        <ellipse
          cx="20"
          cy="48"
          rx={planSlug === 'elite' ? 8 : planSlug === 'pro' ? 6 : 4}
          ry="2"
          fill="black"
          fillOpacity={0.15 + (PIN_CONFIG[planSlug].size - 20) * 0.005}
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

        {/* Center dot */}
        <circle
          cx="20"
          cy="18"
          r={planSlug === 'elite' ? 8 : planSlug === 'pro' ? 6 : planSlug === 'basic' ? 5 : 4}
          fill="white"
          fillOpacity="0.9"
        />

        {/* Inner dot for premium pins */}
        {(planSlug === 'elite' || planSlug === 'pro') && (
          <circle
            cx="20"
            cy="18"
            r={planSlug === 'elite' ? 3 : 2}
            fill={colors.primary}
          />
        )}
      </svg>
    </div>
  );
};

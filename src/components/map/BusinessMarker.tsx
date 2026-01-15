import { Building2 } from "lucide-react";

interface BusinessMarkerProps {
  planSlug: 'free' | 'basic' | 'pro' | 'elite';
  name: string;
  onClick: () => void;
}

// Pin sizes based on subscription plan - strict hierarchy
// Free: 16px (minimal, only visible at close zoom)
// Basic: 24px (slightly more visible)
// Pro: 32px (clear presence)
// Elite: 44px (maximum visibility, dominant)
const PIN_SIZES: Record<'free' | 'basic' | 'pro' | 'elite', number> = {
  free: 16,
  basic: 24,
  pro: 32,
  elite: 44,
};

// Opacity/intensity based on plan
const PIN_OPACITY: Record<'free' | 'basic' | 'pro' | 'elite', number> = {
  free: 0.6,
  basic: 0.75,
  pro: 0.9,
  elite: 1,
};

// Colors based on plan (subtle differentiation without revealing plan name)
const PIN_COLORS: Record<'free' | 'basic' | 'pro' | 'elite', { primary: string; secondary: string }> = {
  free: { primary: '#6B7280', secondary: '#9CA3AF' },      // Gray - subtle
  basic: { primary: '#0D3B66', secondary: '#1F5A8A' },     // Aegean blue - standard
  pro: { primary: '#2563EB', secondary: '#3B82F6' },       // Bright blue - prominent
  elite: { primary: '#059669', secondary: '#10B981' },     // Seafoam green - premium distinction
};

export const BusinessMarker = ({ planSlug, name, onClick }: BusinessMarkerProps) => {
  const size = PIN_SIZES[planSlug];
  const opacity = PIN_OPACITY[planSlug];
  const colors = PIN_COLORS[planSlug];
  const iconSize = Math.max(10, size * 0.4);

  return (
    <div
      onClick={onClick}
      className="relative cursor-pointer transition-all duration-200 hover:scale-110 hover:-translate-y-1 group"
      style={{ opacity }}
    >
      {/* Outer glow for Elite */}
      {planSlug === 'elite' && (
        <div 
          className="absolute inset-0 rounded-full animate-pulse"
          style={{
            width: size + 12,
            height: size + 12,
            left: -6,
            top: -6,
            background: `radial-gradient(circle, ${colors.primary}40 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Main pin */}
      <svg
        width={size}
        height={size * 1.3}
        viewBox="0 0 40 52"
        className="drop-shadow-md transition-all group-hover:drop-shadow-xl"
      >
        {/* Shadow */}
        <ellipse 
          cx="20" 
          cy="49" 
          rx={planSlug === 'elite' ? 10 : 6} 
          ry={planSlug === 'elite' ? 3 : 2} 
          fill="black" 
          fillOpacity={planSlug === 'elite' ? 0.25 : 0.15} 
        />
        
        {/* Pin shape with gradient */}
        <defs>
          <linearGradient id={`pin-gradient-${planSlug}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.secondary} />
            <stop offset="100%" stopColor={colors.primary} />
          </linearGradient>
        </defs>
        
        <path
          d="M20 2 C10 2, 2 10, 2 20 C2 30, 20 48, 20 48 C20 48, 38 30, 38 20 C38 10, 30 2, 20 2 Z"
          fill={`url(#pin-gradient-${planSlug})`}
          stroke="white"
          strokeWidth={planSlug === 'elite' ? 2.5 : planSlug === 'pro' ? 2 : 1.5}
        />
        
        {/* Icon circle background */}
        <circle 
          cx="20" 
          cy="18" 
          r={planSlug === 'elite' ? 12 : planSlug === 'pro' ? 10 : 8} 
          fill="white" 
          fillOpacity="0.95" 
        />
      </svg>

      {/* Building icon */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: size * 0.2,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        <Building2 
          size={iconSize} 
          color={colors.primary} 
          strokeWidth={planSlug === 'elite' ? 2.5 : 2} 
        />
      </div>
    </div>
  );
};

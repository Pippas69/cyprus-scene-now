import { ReactNode } from 'react';

interface AdminOceanHeaderProps {
  title: string;
  subtitle: string;
  children?: ReactNode;
}

export const AdminOceanHeader = ({ title, subtitle, children }: AdminOceanHeaderProps) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-[hsl(var(--aegean))] via-[hsl(var(--ocean))] to-[hsl(var(--seafoam))] py-8 px-4 sm:px-6 rounded-xl mb-6">
      {/* Animated wave layers */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <svg 
          className="absolute bottom-0 left-0 w-[200%] h-12 opacity-20 text-white animate-wave-flow" 
          viewBox="0 0 1200 30" 
          preserveAspectRatio="none"
        >
          <path 
            fill="currentColor" 
            d="M0,15 Q150,5 300,15 T600,15 T900,15 T1200,15 V30 H0 Z"
          />
        </svg>
        <svg 
          className="absolute bottom-0 left-0 w-[200%] h-10 opacity-15 text-white animate-wave-gentle" 
          viewBox="0 0 1200 30" 
          preserveAspectRatio="none"
          style={{ animationDelay: '-3s' }}
        >
          <path 
            fill="currentColor" 
            d="M0,20 Q100,10 200,20 T400,20 T600,20 T800,20 T1000,20 T1200,20 V30 H0 Z"
          />
        </svg>
        <svg 
          className="absolute bottom-0 left-0 w-[200%] h-8 opacity-10 text-white animate-wave-flow" 
          viewBox="0 0 1200 30" 
          preserveAspectRatio="none"
          style={{ animationDelay: '-5s' }}
        >
          <path 
            fill="currentColor" 
            d="M0,22 Q80,15 160,22 T320,22 T480,22 T640,22 T800,22 T960,22 T1120,22 T1200,22 V30 H0 Z"
          />
        </svg>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-cinzel text-2xl sm:text-3xl font-bold text-white">
            {title}
          </h1>
          <p className="text-white/80 mt-1 text-sm sm:text-base">
            {subtitle}
          </p>
        </div>
        {children}
      </div>
    </div>
  );
};

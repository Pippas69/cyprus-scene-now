import React from 'react';
import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PlanSlug } from '@/hooks/useSubscriptionPlan';

interface LockedSectionProps {
  requiredPlan: PlanSlug;
  language: 'el' | 'en';
  children: React.ReactNode;
}

const translations = {
  el: {
    forAccess: 'plan για πρόσβαση',
  },
  en: {
    forAccess: 'plan for access',
  },
};

const planNames: Record<PlanSlug, Record<'el' | 'en', string>> = {
  free: { el: 'Free', en: 'Free' },
  basic: { el: 'Basic', en: 'Basic' },
  pro: { el: 'Pro', en: 'Pro' },
  elite: { el: 'Elite', en: 'Elite' },
};

export const LockedSection: React.FC<LockedSectionProps> = ({
  requiredPlan,
  language,
  children,
}) => {
  const t = translations[language];

  return (
    <div className="relative">
      {/* Blurred content */}
      <div className="blur-[2px] opacity-60 pointer-events-none select-none">
        {children}
      </div>
      
      {/* Subtle upgrade prompt at bottom */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
        <Link
          to="/dashboard-business/subscription"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors bg-background/80 backdrop-blur-sm rounded-full border border-border/50"
        >
          <Lock className="h-3 w-3" />
          <span>
            {planNames[requiredPlan][language]} {t.forAccess}
          </span>
          <span className="text-primary">↗</span>
        </Link>
      </div>
    </div>
  );
};

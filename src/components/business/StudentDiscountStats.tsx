import { Badge } from '@/components/ui/badge';
import { GraduationCap, Repeat, Hash } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface StudentDiscountStatsProps {
  businessId: string;
  language: 'en' | 'el';
}

const translations = {
  en: {
    studentDiscount: 'Student Discount',
    discount: 'Discount',
    redemptions: 'Redemptions',
    mode: 'Mode',
    once: 'First visit only',
    unlimited: 'Every visit',
    notEnabled: 'Student discounts not enabled',
    enableInSettings: 'Enable in Settings',
  },
  el: {
    studentDiscount: 'Φοιτητική Έκπτωση',
    discount: 'Έκπτωση',
    redemptions: 'Εξαργυρώσεις',
    mode: 'Τρόπος',
    once: 'Μόνο πρώτη επίσκεψη',
    unlimited: 'Κάθε επίσκεψη',
    notEnabled: 'Οι φοιτητικές εκπτώσεις δεν είναι ενεργοποιημένες',
    enableInSettings: 'Ενεργοποίηση στις Ρυθμίσεις',
  },
};

export function StudentDiscountStats({ businessId, language }: StudentDiscountStatsProps) {
  const t = translations[language];
  
  // Fetch business student discount settings
  const { data: business } = useQuery({
    queryKey: ['business-student-discount', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select('student_discount_enabled, student_discount_percent, student_discount_mode')
        .eq('id', businessId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });
  
  // Fetch redemption count
  const { data: redemptionCount } = useQuery({
    queryKey: ['student-redemption-count', businessId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('student_discount_redemptions')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId);
      
      if (error) throw error;
      return count || 0;
    },
  });
  
  // Don't show if not enabled
  if (!business?.student_discount_enabled) {
    return null;
  }
  
  return (
    <div className="flex items-start md:items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg border bg-gradient-to-r from-primary/5 to-transparent">
      {/* Smaller icon on tablet & mobile */}
      <div className="flex items-center justify-center h-5 w-5 md:h-6 md:w-6 lg:h-8 lg:w-8 rounded-full bg-primary/10 flex-shrink-0 mt-0.5 md:mt-0">
        <GraduationCap className="h-3 w-3 md:h-3.5 md:w-3.5 lg:h-4 lg:w-4 text-primary" />
      </div>

      {/* Mobile: 2 lines (label+percent) then (redemptions+mode). Tablet+: single line */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 md:gap-3 flex-wrap md:flex-nowrap">
          <div className="flex items-center gap-1 md:gap-1.5 flex-shrink-0">
            <span className="text-[10px] md:text-xs lg:text-sm font-medium text-muted-foreground whitespace-nowrap">{t.studentDiscount}:</span>
            <Badge variant="default" className="text-xs md:text-sm lg:text-base font-bold px-1.5 md:px-2">
              {business.student_discount_percent}%
            </Badge>
          </div>

          <div className="hidden md:flex items-center gap-3 lg:gap-4 flex-nowrap">
            <div className="flex items-center gap-1 text-[10px] md:text-xs lg:text-sm text-muted-foreground flex-shrink-0">
              <Hash className="h-2.5 w-2.5 md:h-3 md:w-3 lg:h-3.5 lg:w-3.5" />
              <span className="whitespace-nowrap">{redemptionCount || 0} {t.redemptions}</span>
            </div>

            <div className="flex items-center gap-1 text-[10px] md:text-xs lg:text-sm text-muted-foreground flex-shrink-0 md:-ml-2.5 lg:ml-0">
              <Repeat className="h-2.5 w-2.5 md:h-3 md:w-3 lg:h-3.5 lg:w-3.5" />
              <span className="whitespace-nowrap">{business.student_discount_mode === 'unlimited' ? t.unlimited : t.once}</span>
            </div>
          </div>
        </div>

        <div className="mt-1 flex items-center gap-3 md:hidden">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Hash className="h-2.5 w-2.5" />
            <span className="whitespace-nowrap">{redemptionCount || 0} {t.redemptions}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Repeat className="h-2.5 w-2.5" />
            <span className="whitespace-nowrap">{business.student_discount_mode === 'unlimited' ? t.unlimited : t.once}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

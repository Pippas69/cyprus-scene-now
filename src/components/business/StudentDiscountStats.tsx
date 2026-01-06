import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, TrendingUp, Euro, Calendar } from 'lucide-react';
import { useBusinessRedemptionStats, useStudentRedemptions } from '@/hooks/useStudentRedemptions';
import { useStudentPartner } from '@/hooks/useStudentPartner';
import { format } from 'date-fns';
import { el, enUS } from 'date-fns/locale';

interface StudentDiscountStatsProps {
  businessId: string;
  language: 'en' | 'el';
}

const translations = {
  en: {
    title: 'Student Discounts',
    description: 'This month\'s student discount activity',
    redemptions: 'Redemptions',
    pendingSubsidy: 'Pending Subsidy',
    discountRate: 'Discount Rate',
    recentRedemptions: 'Recent Redemptions',
    noRedemptions: 'No redemptions yet this month',
    notPartner: 'Not registered as a student discount partner',
  },
  el: {
    title: 'Φοιτητικές Εκπτώσεις',
    description: 'Δραστηριότητα φοιτητικών εκπτώσεων αυτού του μήνα',
    redemptions: 'Εξαργυρώσεις',
    pendingSubsidy: 'Εκκρεμές Επίδομα',
    discountRate: 'Ποσοστό Έκπτωσης',
    recentRedemptions: 'Πρόσφατες Εξαργυρώσεις',
    noRedemptions: 'Καμία εξαργύρωση ακόμα αυτόν τον μήνα',
    notPartner: 'Δεν είστε εγγεγραμμένοι ως συνεργάτης φοιτητικών εκπτώσεων',
  },
};

export function StudentDiscountStats({ businessId, language }: StudentDiscountStatsProps) {
  const t = translations[language];
  const locale = language === 'el' ? el : enUS;
  
  const { data: partner } = useStudentPartner(businessId);
  const { data: stats } = useBusinessRedemptionStats(businessId);
  const { data: redemptions } = useStudentRedemptions(businessId);
  
  if (!partner || !partner.is_active) {
    return null;
  }
  
  const recentRedemptions = redemptions?.slice(0, 5) || [];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          {t.title}
        </CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{stats?.totalRedemptions || 0}</p>
            <p className="text-xs text-muted-foreground">{t.redemptions}</p>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Euro className="h-5 w-5 mx-auto mb-1 text-green-600" />
            <p className="text-2xl font-bold">
              €{((stats?.totalSubsidyCents || 0) / 100).toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">{t.pendingSubsidy}</p>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <GraduationCap className="h-5 w-5 mx-auto mb-1 text-blue-600" />
            <p className="text-2xl font-bold">{partner.discount_percent}%</p>
            <p className="text-xs text-muted-foreground">{t.discountRate}</p>
          </div>
        </div>
        
        {/* Recent Redemptions */}
        <div>
          <h4 className="text-sm font-medium mb-3">{t.recentRedemptions}</h4>
          {recentRedemptions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t.noRedemptions}
            </p>
          ) : (
            <div className="space-y-2">
              {recentRedemptions.map((redemption) => (
                <div
                  key={redemption.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <GraduationCap className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {(redemption.student?.user as { name: string })?.name || 'Student'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {redemption.item_description || redemption.student?.university_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600">
                      -€{(redemption.discount_amount_cents / 100).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(redemption.created_at), 'MMM d', { locale })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

import { Card } from '@/components/ui/card';
import { ArrowRight, TrendingUp, TrendingDown, Euro, Users, Eye, Heart, UserCheck, Zap } from 'lucide-react';
import { FOMOImpactData } from '@/hooks/useFOMOImpact';
import { Skeleton } from '@/components/ui/skeleton';

interface FOMOImpactCardProps {
  data: FOMOImpactData | undefined;
  isLoading: boolean;
  language: 'el' | 'en';
}

const translations = {
  el: {
    title: 'Η Επένδυσή σου στο FOMO',
    spent: 'ΞΟΔΕΨΕΣ',
    earned: 'ΚΕΡΔΙΣΕΣ',
    subscription: 'Συνδρομή',
    boosts: 'Προωθήσεις',
    tickets: 'Εισιτήρια',
    offers: 'Προσφορές',
    netProfit: 'Καθαρό Κέρδος',
    netLoss: 'Ζημία',
    return: 'απόδοση',
    peopleReached: 'Σε είδαν',
    customers: 'Πελάτες',
    followers: 'Ακόλουθοι',
    interested: 'Ενδιαφέρονται',
    confirmed: 'Επιβεβαιωμένοι',
    showUpRate: 'Εμφανίστηκαν',
    tip: 'Συμβουλή',
    greatRoi: 'Κερδίζεις €{amount} για κάθε €1 που ξοδεύεις. Εξαιρετική απόδοση!',
    goodRoi: 'Έχεις θετική απόδοση. Συνέχισε έτσι!',
    neutralRoi: 'Βγάζεις ακριβώς όσα ξοδεύεις. Δοκίμασε να προωθήσεις περισσότερες εκδηλώσεις!',
    negativeRoi: 'Ξοδεύεις περισσότερα από όσα κερδίζεις. Ίσως χρειάζεται να αναθεωρήσεις τη στρατηγική σου.',
    noSpending: 'Δεν έχεις ξοδέψει τίποτα ακόμα. Δημιούργησε εκδηλώσεις ή προωθήσεις για να ξεκινήσεις!',
    newFollowers: 'νέοι',
    people: 'άτομα',
  },
  en: {
    title: 'Your FOMO Investment',
    spent: 'SPENT',
    earned: 'EARNED',
    subscription: 'Subscription',
    boosts: 'Boosts',
    tickets: 'Tickets',
    offers: 'Offers',
    netProfit: 'Net Profit',
    netLoss: 'Loss',
    return: 'return',
    peopleReached: 'People saw you',
    customers: 'Customers',
    followers: 'Followers',
    interested: 'Interested',
    confirmed: 'Confirmed',
    showUpRate: 'Showed up',
    tip: 'Tip',
    greatRoi: 'You\'re earning €{amount} for every €1 spent. Great ROI!',
    goodRoi: 'You have positive returns. Keep it up!',
    neutralRoi: 'You\'re breaking even. Try boosting more events!',
    negativeRoi: 'You\'re spending more than you earn. Consider reviewing your strategy.',
    noSpending: 'You haven\'t spent anything yet. Create events or boosts to get started!',
    newFollowers: 'new',
    people: 'people',
  },
};

export function FOMOImpactCard({ data, isLoading, language }: FOMOImpactCardProps) {
  const t = translations[language];

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const isProfit = data.netProfit >= 0;
  const roiMultiplier = data.totalSpent > 0 ? (data.totalEarned / data.totalSpent).toFixed(1) : '0';

  const getTipMessage = () => {
    if (data.totalSpent === 0) return t.noSpending;
    if (data.roiPercentage > 500) return t.greatRoi.replace('{amount}', roiMultiplier);
    if (data.roiPercentage > 0) return t.goodRoi;
    if (data.roiPercentage === 0) return t.neutralRoi;
    return t.negativeRoi;
  };

  return (
    <div className="space-y-6">
      {/* Main ROI Card */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 via-background to-accent/5 border-primary/20">
        <div className="flex items-center gap-2 mb-6">
          <Euro className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold">{t.title}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Spent Column */}
          <div className="bg-muted/50 rounded-xl p-4">
            <p className="text-sm font-medium text-muted-foreground mb-3">{t.spent}</p>
            <p className="text-3xl font-bold text-destructive mb-4">
              €{data.totalSpent.toFixed(2)}
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.subscription}</span>
                <span>€{data.subscriptionCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.boosts}</span>
                <span>€{data.boostSpending.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="hidden md:flex items-center justify-center">
            <ArrowRight className="h-8 w-8 text-muted-foreground" />
          </div>

          {/* Earned Column */}
          <div className="bg-muted/50 rounded-xl p-4">
            <p className="text-sm font-medium text-muted-foreground mb-3">{t.earned}</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400 mb-4">
              €{data.totalEarned.toFixed(2)}
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.tickets}</span>
                <span>€{data.ticketRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.offers}</span>
                <span>€{data.offerRevenue.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Net Profit Banner */}
        <div className={`mt-6 p-4 rounded-xl flex items-center justify-center gap-3 ${
          isProfit 
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
        }`}>
          {isProfit ? (
            <TrendingUp className="h-6 w-6" />
          ) : (
            <TrendingDown className="h-6 w-6" />
          )}
          <span className="text-lg font-bold">
            {isProfit ? t.netProfit : t.netLoss}: €{Math.abs(data.netProfit).toFixed(2)}
          </span>
          {data.totalSpent > 0 && (
            <span className="text-sm opacity-80">
              ({data.roiPercentage.toFixed(0)}% {t.return})
            </span>
          )}
        </div>

        {/* Tip */}
        <div className="mt-4 p-3 bg-primary/10 rounded-lg flex items-start gap-2">
          <Zap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm">
            <span className="font-medium">{t.tip}:</span> {getTipMessage()}
          </p>
        </div>
      </Card>

      {/* Supporting Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          icon={Eye}
          value={data.peopleReached.toLocaleString()}
          label={t.peopleReached}
          color="text-blue-600 dark:text-blue-400"
          bgColor="bg-blue-100 dark:bg-blue-900/30"
        />
        <MetricCard
          icon={Users}
          value={data.customersServed.toLocaleString()}
          label={t.customers}
          color="text-green-600 dark:text-green-400"
          bgColor="bg-green-100 dark:bg-green-900/30"
        />
        <MetricCard
          icon={Heart}
          value={data.followersCount.toLocaleString()}
          label={t.followers}
          subtitle={data.newFollowers > 0 ? `+${data.newFollowers} ${t.newFollowers}` : undefined}
          color="text-pink-600 dark:text-pink-400"
          bgColor="bg-pink-100 dark:bg-pink-900/30"
        />
        <MetricCard
          icon={Heart}
          value={data.interested.toLocaleString()}
          label={t.interested}
          color="text-orange-600 dark:text-orange-400"
          bgColor="bg-orange-100 dark:bg-orange-900/30"
        />
        <MetricCard
          icon={UserCheck}
          value={data.confirmed.toLocaleString()}
          label={t.confirmed}
          color="text-indigo-600 dark:text-indigo-400"
          bgColor="bg-indigo-100 dark:bg-indigo-900/30"
        />
        <MetricCard
          icon={TrendingUp}
          value={`${data.showUpRate.toFixed(0)}%`}
          label={t.showUpRate}
          color="text-purple-600 dark:text-purple-400"
          bgColor="bg-purple-100 dark:bg-purple-900/30"
        />
      </div>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ElementType;
  value: string;
  label: string;
  subtitle?: string;
  color: string;
  bgColor: string;
}

function MetricCard({ icon: Icon, value, label, subtitle, color, bgColor }: MetricCardProps) {
  return (
    <Card className="p-4">
      <div className={`inline-flex p-2 rounded-lg ${bgColor} mb-3`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      {subtitle && (
        <p className="text-xs text-green-600 dark:text-green-400 mt-1">{subtitle}</p>
      )}
    </Card>
  );
}

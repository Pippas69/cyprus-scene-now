import { Calendar, Ticket, Users, Heart, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useBusinessStats } from '@/hooks/useBusinessStats';
import { Skeleton } from '@/components/ui/skeleton';

interface QuickStatsProps {
  businessId: string;
  language: 'el' | 'en';
}

export const QuickStats = ({ businessId, language }: QuickStatsProps) => {
  const { data: stats, isLoading } = useBusinessStats(businessId);

  const translations = {
    el: {
      totalEvents: 'Συνολικές Εκδηλώσεις',
      upcomingEvents: 'Προσεχείς Εκδηλώσεις',
      activeOffers: 'Ενεργές Προσφορές',
      totalRSVPs: 'Συνολικά RSVPs',
      pendingReservations: 'Εκκρεμείς Κρατήσεις',
      followers: 'Ακόλουθοι'
    },
    en: {
      totalEvents: 'Total Events',
      upcomingEvents: 'Upcoming Events',
      activeOffers: 'Active Offers',
      totalRSVPs: 'Total RSVPs',
      pendingReservations: 'Pending Reservations',
      followers: 'Followers'
    }
  };

  const t = translations[language];

  const statCards = [
    {
      label: t.upcomingEvents,
      value: stats?.upcomingEvents || 0,
      icon: Calendar,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      label: t.totalRSVPs,
      value: stats?.totalRSVPs || 0,
      icon: Users,
      color: 'text-accent',
      bgColor: 'bg-accent/10'
    },
    {
      label: t.pendingReservations,
      value: stats?.pendingReservations || 0,
      icon: Clock,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10'
    },
    {
      label: t.activeOffers,
      value: stats?.activeOffers || 0,
      icon: Ticket,
      color: 'text-seafoam',
      bgColor: 'bg-seafoam/10'
    },
    {
      label: t.followers,
      value: stats?.followers || 0,
      icon: Heart,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10'
    },
    {
      label: t.totalEvents,
      value: stats?.totalEvents || 0,
      icon: TrendingUp,
      color: 'text-foreground',
      bgColor: 'bg-muted'
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-12 w-12 rounded-lg mb-3" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-fade-in">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card 
            key={stat.label} 
            className="hover:shadow-lg transition-shadow duration-200"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <CardContent className="p-4">
              <div className={`h-12 w-12 rounded-lg ${stat.bgColor} flex items-center justify-center mb-3`}>
                <Icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">
                {stat.value}
              </div>
              <div className="text-xs text-muted-foreground">
                {stat.label}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

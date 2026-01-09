import { Eye, Users, Repeat, CalendarCheck, Ticket, QrCode } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOverviewMetrics } from "@/hooks/useOverviewMetrics";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const translations = {
  el: {
    title: "Σύνοψη Απόδοσης",
    subtitle: "Τα παρακάτω δεδομένα δείχνουν πώς η παρουσία σου στο FOMO αποδίδει αυτόν τον μήνα.",
    footer: "Τα δεδομένα ενημερώνονται σε πραγματικό χρόνο. Χρησιμοποίησε το φίλτρο για παρελθόντες μήνες.",
    metrics: {
      views: "Προβολές",
      viewsTooltip: "Οι προβολές περιλαμβάνουν εμφανίσεις στην εφαρμογή, τον χάρτη και μέσω events ή προσφορών",
      customers: "Πελάτες",
      customersTooltip: "Αυτό είναι το βασικό σου επιχειρηματικό αποτέλεσμα",
      recurring: "Επαναλαμβανόμενοι",
      recurringTooltip: "Οι επαναλαμβανόμενοι πελάτες δείχνουν αφοσίωση και πραγματική αξία",
      reservations: "Κρατήσεις",
      reservationsTooltip: "Περιλαμβάνει κρατήσεις για τραπέζια, εμπειρίες ή προσφορές",
      tickets: "Εισιτήρια",
      ticketsTooltip: "Τα εισιτήρια είναι αποκλειστικά για events",
      visits: "Επισκέψεις μέσω FOMO",
      visitsTooltip: "Αυτός ο αριθμός δείχνει πραγματικές επισκέψεις στον χώρο σου",
    },
  },
  en: {
    title: "Performance Summary",
    subtitle: "The following data shows how your presence at FOMO pays off this month.",
    footer: "Data is updated in real time. Use the filter to view past months and days.",
    metrics: {
      views: "Views",
      viewsTooltip: "Views include appearances on the app, map and via events or offers",
      customers: "Customers",
      customersTooltip: "This is your basic business result",
      recurring: "Recurring",
      recurringTooltip: "Repeat customers demonstrate loyalty and real value",
      reservations: "Reservations",
      reservationsTooltip: "Includes reservations for tables, experiences or offers",
      tickets: "Tickets",
      ticketsTooltip: "Tickets are exclusively for events",
      visits: "Visits through FOMO",
      visitsTooltip: "This number shows real visits to your area",
    },
  },
};

interface OverviewTabProps {
  businessId: string;
  dateRange?: { from: Date; to: Date };
  language: "el" | "en";
}

export const OverviewTab = ({ businessId, dateRange, language }: OverviewTabProps) => {
  const { data, isLoading } = useOverviewMetrics(businessId, dateRange);
  const t = translations[language];

  const metrics = [
    { key: "views", icon: Eye, value: data?.profileViews || 0, label: t.metrics.views, tooltip: t.metrics.viewsTooltip },
    { key: "customers", icon: Users, value: data?.customersThruFomo || 0, label: t.metrics.customers, tooltip: t.metrics.customersTooltip },
    { key: "recurring", icon: Repeat, value: data?.repeatCustomers || 0, label: t.metrics.recurring, tooltip: t.metrics.recurringTooltip },
    { key: "reservations", icon: CalendarCheck, value: data?.bookings || 0, label: t.metrics.reservations, tooltip: t.metrics.reservationsTooltip },
    { key: "tickets", icon: Ticket, value: data?.tickets || 0, label: t.metrics.tickets, tooltip: t.metrics.ticketsTooltip },
    { key: "visits", icon: QrCode, value: data?.visitsViaQR || 0, label: t.metrics.visits, tooltip: t.metrics.visitsTooltip },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">{t.title}</h2>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {metrics.map(({ key, icon: Icon, value, label, tooltip }) => (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <Card className="hover:shadow-md transition-shadow cursor-help">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">{label}</p>
                        <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
                      </div>
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="text-sm">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center">{t.footer}</p>
      </div>
    </TooltipProvider>
  );
};

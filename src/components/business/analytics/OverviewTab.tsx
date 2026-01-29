import { useState } from "react";
import { Eye, Users, Repeat, CalendarCheck, Ticket, QrCode, Info, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOverviewMetrics } from "@/hooks/useOverviewMetrics";
import { useSubscriptionPlan } from "@/hooks/useSubscriptionPlan";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";

const translations = {
  el: {
    title: "Σύνοψη Δεδομένων",
    subtitle: "Συνολικά στοιχεία από όλες τις πηγές.\n(προφίλ, προσφορές, εκδηλώσεις)",
    footer: "Τα δεδομένα ενημερώνονται σε πραγματικό χρόνο. Χρησιμοποίησε το φίλτρο για παρελθόντες μήνες.",
    upgradePrompt: "Θέλεις να δεις αναλυτικά ποιες ενέργειες αποδίδουν καλύτερα; Αναβάθμισε το πλάνο σου για πιο λεπτομερή δεδομένα και εξοικονόμηση χρημάτων.",
    upgradeLink: "Δες τα πλάνα",
    tapForDetails: "Πάτα για λεπτομέρειες",
    dataSource: "Πηγή δεδομένων",
    metrics: {
      views: "Συνολικές Προβολές",
      viewsExplanation: "Προβολές προφίλ + προσφορών + εκδηλώσεων",
      viewsDetails: "Σύνολο όλων των προβολών: σελίδα προφίλ, σελίδες προσφορών και σελίδες εκδηλώσεων. Όσο πιο υψηλές, τόσο μεγαλύτερη η συνολική ορατότητά σου.",
      viewsSource: "Προφίλ, προσφορές, εκδηλώσεις",
      customers: "Πελάτες",
      customersExplanation: "Μοναδικοί πελάτες από όλες τις πηγές",
      customersDetails: "Όλοι οι μοναδικοί πελάτες που έκαναν κράτηση ή αγόρασαν εισιτήριο, είτε μέσω προφίλ, είτε μέσω προσφοράς, είτε μέσω εκδήλωσης.",
      customersSource: "Κρατήσεις, εισιτήρια",
      recurring: "Επαναλαμβανόμενοι",
      recurringExplanation: "Πελάτες με 2+ συναλλαγές",
      recurringDetails: "Πελάτες που έκαναν κράτηση ή αγόρασαν εισιτήριο περισσότερες από μία φορές. Δείχνει αφοσίωση στην επιχείρησή σου.",
      recurringSource: "Ιστορικό κρατήσεων και εισιτηρίων",
      reservations: "Κρατήσεις",
      reservationsExplanation: "Σύνολο όλων των κρατήσεων",
      reservationsDetails: "Όλες οι επιβεβαιωμένες κρατήσεις: απευθείας στο προφίλ, μέσω προσφοράς με κράτηση, ή μέσω εκδήλωσης με κράτηση.",
      reservationsSource: "Κρατήσεις προφίλ + προσφορών + εκδηλώσεων",
      tickets: "Εισιτήρια",
      ticketsExplanation: "Σύνολο εισιτηρίων που εκδόθηκαν",
      ticketsDetails: "Όλα τα εισιτήρια που πουλήθηκαν για τις εκδηλώσεις σου.",
      ticketsSource: "Πωλήσεις εισιτηρίων",
      visits: "Επισκέψεις",
      visitsExplanation: "Πραγματικές επισκέψεις με QR scan",
      visitsDetails: "Όλες οι επισκέψεις που επαληθεύτηκαν στο κατάστημα: σαρώσεις προσφορών (με ή χωρίς κράτηση), check-ins εισιτηρίων, και σαρώσεις κρατήσεων από το προφίλ ή εκδηλώσεις.",
      visitsSource: "Προσφορές + Εισιτήρια + Κρατήσεις",
    },
  },
  en: {
    title: "Performance Summary",
    subtitle: "Combined data from all sources (profile, offers, events).",
    footer: "Data is updated in real time. Use the filter to view past months.",
    upgradePrompt: "Want to see which actions perform best? Upgrade your plan for detailed insights and cost savings.",
    upgradeLink: "View plans",
    tapForDetails: "Tap for details",
    dataSource: "Data source",
    metrics: {
      views: "Total Views",
      viewsExplanation: "Profile + offers + events views",
      viewsDetails: "Sum of all views: profile page, offer pages, and event pages. Higher numbers mean greater overall visibility.",
      viewsSource: "Profile, offers, events",
      customers: "Customers",
      customersExplanation: "Unique customers from all sources",
      customersDetails: "All unique customers who made a reservation or purchased a ticket, whether via profile, offer, or event.",
      customersSource: "Reservations, tickets",
      recurring: "Recurring",
      recurringExplanation: "Customers with 2+ transactions",
      recurringDetails: "Customers who made a reservation or purchased a ticket more than once. Shows loyalty to your business.",
      recurringSource: "Reservation and ticket history",
      reservations: "Reservations",
      reservationsExplanation: "Total of all reservations",
      reservationsDetails: "All confirmed reservations: direct on profile, via offer with reservation, or via event with reservation.",
      reservationsSource: "Profile + offer + event reservations",
      tickets: "Tickets",
      ticketsExplanation: "Total tickets issued",
      ticketsDetails: "All tickets sold for your events.",
      ticketsSource: "Ticket sales",
      visits: "Visits",
      visitsExplanation: "Real visits with QR scan",
      visitsDetails: "All visits verified at your venue: offer scans (walk-in or with reservation), ticket check-ins, and reservation scans from profile or events.",
      visitsSource: "Offers + Tickets + Reservations",
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
  const { data: subscription } = useSubscriptionPlan(businessId);
  const t = translations[language];
  
  const isFreePlan = !subscription?.plan || subscription?.plan === 'free';

  const metrics = [
    { 
      key: "views", 
      icon: Eye, 
      value: data?.totalViews || 0, 
      label: t.metrics.views, 
      explanation: t.metrics.viewsExplanation,
      details: t.metrics.viewsDetails,
      source: t.metrics.viewsSource,
    },
    { 
      key: "customers", 
      icon: Users, 
      value: data?.customersThruFomo || 0, 
      label: t.metrics.customers, 
      explanation: t.metrics.customersExplanation,
      details: t.metrics.customersDetails,
      source: t.metrics.customersSource,
    },
    { 
      key: "recurring", 
      icon: Repeat, 
      value: data?.repeatCustomers || 0, 
      label: t.metrics.recurring, 
      explanation: t.metrics.recurringExplanation,
      details: t.metrics.recurringDetails,
      source: t.metrics.recurringSource,
    },
    { 
      key: "reservations", 
      icon: CalendarCheck, 
      value: data?.bookings || 0, 
      label: t.metrics.reservations, 
      explanation: t.metrics.reservationsExplanation,
      details: t.metrics.reservationsDetails,
      source: t.metrics.reservationsSource,
    },
    { 
      key: "tickets", 
      icon: Ticket, 
      value: data?.tickets || 0, 
      label: t.metrics.tickets, 
      explanation: t.metrics.ticketsExplanation,
      details: t.metrics.ticketsDetails,
      source: t.metrics.ticketsSource,
    },
    { 
      key: "visits", 
      icon: QrCode, 
      value: data?.visitsViaQR || 0, 
      label: t.metrics.visits, 
      explanation: t.metrics.visitsExplanation,
      details: t.metrics.visitsDetails,
      source: t.metrics.visitsSource,
    },
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
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">{t.title}</h2>
        <p className="text-sm text-muted-foreground whitespace-pre-line md:whitespace-normal">{t.subtitle}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {metrics.map(({ key, icon: Icon, value, label, explanation, details, source }) => (
          <Dialog key={key}>
            <DialogTrigger asChild>
              <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-4">
                  {/* First card (views) - horizontal layout */}
                  {key === "views" ? (
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">{label}</p>
                        <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <Info className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ) : (
                    /* Other cards (customers, recurring, etc.) - centered layout for tablet/mobile, horizontal for desktop */
                    <>
                      {/* Mobile/Tablet: Centered vertical layout - label, icon, then number */}
                      <div className="flex flex-col items-center text-center lg:hidden">
                        <p className="text-xs md:text-sm text-muted-foreground line-clamp-1">{label}</p>
                        <div className="p-1.5 bg-primary/10 rounded-lg my-1">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
                      </div>
                      {/* Desktop: Original horizontal layout */}
                      <div className="hidden lg:flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">{label}</p>
                          <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <Info className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-[280px] sm:max-w-md p-3 sm:p-6 pr-10 sm:pr-6">
              <DialogHeader className="pb-2 sm:pb-4 pr-2 sm:pr-0">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-sm sm:text-lg">{label}</DialogTitle>
                    <DialogDescription className="text-[10px] sm:text-sm">{explanation}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-2 sm:space-y-4 pt-1 sm:pt-2">
                <div className="p-2 sm:p-4 bg-muted/50 rounded-lg">
                  <p className="text-xl sm:text-3xl font-bold text-foreground">{value.toLocaleString()}</p>
                </div>
                <p className="text-[10px] sm:text-sm text-muted-foreground">{details}</p>
                <div className="pt-1.5 sm:pt-2 border-t border-border">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    <span className="font-medium">{t.dataSource}:</span> {source}
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">{t.footer}</p>

      {/* Upgrade prompt for free plan users */}
      {isFreePlan && (
        <div className="p-2 md:p-3 lg:p-4 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
          <div className="flex items-start gap-1.5 md:gap-2 lg:gap-3">
            <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4 lg:h-5 lg:w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="space-y-1 md:space-y-1.5 lg:space-y-2">
              <p className="text-[10px] md:text-xs lg:text-sm text-foreground leading-tight">{t.upgradePrompt}</p>
              <Link 
                to="/dashboard-business/subscription" 
                className="inline-flex items-center text-[10px] md:text-xs lg:text-sm font-medium text-primary hover:underline"
              >
                {t.upgradeLink} →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
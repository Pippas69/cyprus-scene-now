import { useState } from "react";
import { useCrmGuestTimeline, type TimelineActivity } from "@/hooks/useCrmGuestTimeline";
import { useLanguage } from "@/hooks/useLanguage";
import { format } from "date-fns";
import { el, enUS } from "date-fns/locale";
import { ChevronDown, ChevronUp, Ticket, CalendarCheck, Gift, Footprints, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CrmActivityTimelineProps {
  guestId: string;
  businessId: string;
}

const translations = {
  el: {
    activity: "Ιστορικό Ενεργειών",
    noActivity: "Δεν υπάρχουν ενέργειες",
    showAll: "Εμφάνιση όλων",
    showLess: "Λιγότερα",
    booked: "Κράτηση",
    ticketPurchase: "Αγορά εισιτηρίου",
    checkIn: "Check-in",
    expenses: "Έξοδα",
    event: "Event",
    reservationProfile: "Κράτηση Προφίλ",
    offer: "Προσφορά",
    walkIn: "Walk-in",
    hybrid: "Event",
    reservationEvent: "Event",
    walkInEvent: "Walk-in Event",
  },
  en: {
    activity: "Activity History",
    noActivity: "No activities",
    showAll: "Show all",
    showLess: "Show less",
    booked: "Booking",
    ticketPurchase: "Ticket purchase",
    checkIn: "Check-in",
    expenses: "Expenses",
    event: "Event",
    reservationProfile: "Profile Booking",
    offer: "Offer",
    walkIn: "Walk-in",
    hybrid: "Event",
    reservationEvent: "Event",
    walkInEvent: "Walk-in Event",
  },
};

function getActivityIcon(type: string) {
  switch (type) {
    case "ticket":
    case "hybrid":
      return Ticket;
    case "reservation_event":
    case "reservation_profile":
      return CalendarCheck;
    case "offer":
      return Gift;
    case "walk_in":
    case "walk_in_event":
      return Footprints;
    default:
      return CalendarCheck;
  }
}

function getSourceLabel(type: string, t: typeof translations["el"]) {
  switch (type) {
    case "ticket": return t.event;
    case "hybrid": return t.hybrid;
    case "reservation_event": return t.reservationEvent;
    case "reservation_profile": return t.reservationProfile;
    case "offer": return t.offer;
    case "walk_in": return t.walkIn;
    case "walk_in_event": return t.walkInEvent;
    default: return type;
  }
}

function getBookedLabel(type: string, t: typeof translations["el"]) {
  if (type === "ticket" || type === "hybrid") return t.ticketPurchase;
  return t.booked;
}

function ActivityItem({ activity, locale, t }: { activity: TimelineActivity; locale: Locale; t: typeof translations["el"] }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = getActivityIcon(activity.activity_type);
  const sourceLabel = getSourceLabel(activity.activity_type, t);
  const activityDate = format(new Date(activity.activity_date), "dd/MM/yy", { locale });

  const bookedLabel = getBookedLabel(activity.activity_type, t);
  const bookedTime = format(new Date(activity.booked_at), "dd/MM/yy HH:mm:ss", { locale });
  const checkInTime = activity.checked_in_at
    ? format(new Date(activity.checked_in_at), "dd/MM/yy HH:mm:ss", { locale })
    : "—";
  const spend = activity.spend_cents > 0 ? `€${(activity.spend_cents / 100).toFixed(2)}` : "€0";

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
      >
        <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <span className="text-[11px] font-medium text-foreground flex-1 min-w-0 truncate">
          {sourceLabel}: {activity.title} ({activityDate})
        </span>
        {expanded ? (
          <ChevronUp className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="px-3 pb-2.5 pt-0.5 border-t border-border/50 space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">{bookedLabel}</span>
            <span className="text-foreground font-medium">{bookedTime}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">{t.checkIn}</span>
            <span className={`font-medium ${activity.checked_in_at ? "text-foreground" : "text-muted-foreground"}`}>
              {checkInTime}
            </span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">{t.expenses}</span>
            <span className="text-foreground font-medium">{spend}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function CrmActivityTimeline({ guestId, businessId }: CrmActivityTimelineProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const locale = language === "el" ? el : enUS;
  const { data: activities, isLoading } = useCrmGuestTimeline(guestId, businessId);
  const [showAll, setShowAll] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <p className="text-[10px] text-muted-foreground text-center py-2">{t.noActivity}</p>
    );
  }

  const displayed = showAll ? activities : activities.slice(0, 3);
  const hasMore = activities.length > 3;

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        {t.activity}
      </p>
      {displayed.map((activity, idx) => (
        <ActivityItem key={`${activity.booked_at}-${idx}`} activity={activity} locale={locale} t={t} />
      ))}
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 text-[10px] text-muted-foreground"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? t.showLess : `${t.showAll} (${activities.length})`}
        </Button>
      )}
    </div>
  );
}

import { useState, useMemo } from "react";
import { useCrmGuests, type CrmGuest } from "@/hooks/useCrmGuests";
import { useLanguage } from "@/hooks/useLanguage";
import { CrmGuestTable } from "./CrmGuestTable";
import { CrmGuestProfile } from "./CrmGuestProfile";
import { CrmSegmentSidebar } from "./CrmSegmentSidebar";
import { CrmAddGuestDialog } from "./CrmAddGuestDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, UserPlus, Users, TrendingUp, AlertTriangle, Star } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface CrmDashboardProps {
  businessId: string;
  floorPlanEnabled?: boolean;
}

type SortField = "guest_name" | "total_visits" | "last_visit" | "total_spend_cents" | "total_no_shows" | "internal_rating";
type SortDir = "asc" | "desc";
type Segment = "all" | "vip" | "regulars" | "new" | "at_risk" | "churned" | "no_show_risk" | "high_spenders" | "birthday_week";

const translations = {
  el: {
    title: "Guest intelligence",
    subtitle: "Διαχείριση πελατών",
    search: "Αναζήτηση πελάτη...",
    addGuest: "Νέος πελάτης",
    totalGuests: "Σύνολο πελατών",
    returningRate: "Επιστρέφοντες",
    atRisk: "Σε κίνδυνο",
    vips: "VIP πελάτες",
    noGuests: "Δεν υπάρχουν πελάτες ακόμα",
    noGuestsDesc: "Οι πελάτες θα εμφανιστούν αυτόματα από κρατήσεις και εισιτήρια, ή προσθέστε χειροκίνητα.",
  },
  en: {
    title: "Guest intelligence",
    subtitle: "Guest management",
    search: "Search guest...",
    addGuest: "New guest",
    totalGuests: "Total guests",
    returningRate: "Returning",
    atRisk: "At risk",
    vips: "VIP guests",
    noGuests: "No guests yet",
    noGuestsDesc: "Guests will appear automatically from reservations and tickets, or add manually.",
  },
};

export function CrmDashboard({ businessId, floorPlanEnabled }: CrmDashboardProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const { guests, isLoading, addGuest, refetch } = useCrmGuests(businessId);

  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState<Segment>("all");
  const [sortField, setSortField] = useState<SortField>("total_visits");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedGuest, setSelectedGuest] = useState<CrmGuest | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Stats
  const stats = useMemo(() => {
    const total = guests.length;
    const returning = guests.filter((g) => g.total_visits >= 2).length;
    const atRisk = guests.filter((g) => {
      if (!g.last_visit) return false;
      const days = (Date.now() - new Date(g.last_visit).getTime()) / (1000 * 60 * 60 * 24);
      return days >= 30 && days < 90;
    }).length;
    const vips = guests.filter((g) => g.total_visits >= 5 && g.total_spend_cents >= 30000).length;
    return {
      total,
      returningRate: total > 0 ? Math.round((returning / total) * 100) : 0,
      atRisk,
      vips,
    };
  }, [guests]);

  // Filter by segment
  const segmentedGuests = useMemo(() => {
    const now = Date.now();
    return guests.filter((g) => {
      switch (segment) {
        case "vip":
          return g.total_visits >= 5 && g.total_spend_cents >= 30000;
        case "regulars":
          return g.total_visits >= 3;
        case "new":
          return g.total_visits <= 1;
        case "at_risk": {
          if (!g.last_visit) return false;
          const days = (now - new Date(g.last_visit).getTime()) / (1000 * 60 * 60 * 24);
          return days >= 30 && days < 90;
        }
        case "churned": {
          if (!g.last_visit) return g.total_visits > 0;
          const days = (now - new Date(g.last_visit).getTime()) / (1000 * 60 * 60 * 24);
          return days >= 90;
        }
        case "no_show_risk":
          return g.total_no_shows >= 2;
        case "high_spenders":
          return g.total_spend_cents >= 10000;
        case "birthday_week": {
          if (!g.birthday) return false;
          const bday = new Date(g.birthday);
          const today = new Date();
          const thisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
          const diff = (thisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
          return diff >= -1 && diff <= 7;
        }
        default:
          return true;
      }
    });
  }, [guests, segment]);

  // Search filter
  const filteredGuests = useMemo(() => {
    if (!search.trim()) return segmentedGuests;
    const q = search.toLowerCase();
    return segmentedGuests.filter(
      (g) =>
        g.guest_name.toLowerCase().includes(q) ||
        g.email?.toLowerCase().includes(q) ||
        g.phone?.includes(q)
    );
  }, [segmentedGuests, search]);

  // Sort
  const sortedGuests = useMemo(() => {
    return [...filteredGuests].sort((a, b) => {
      let aVal: string | number = 0;
      let bVal: string | number = 0;

      switch (sortField) {
        case "guest_name":
          aVal = a.guest_name.toLowerCase();
          bVal = b.guest_name.toLowerCase();
          break;
        case "total_visits":
          aVal = a.total_visits;
          bVal = b.total_visits;
          break;
        case "last_visit":
          aVal = a.last_visit ? new Date(a.last_visit).getTime() : 0;
          bVal = b.last_visit ? new Date(b.last_visit).getTime() : 0;
          break;
        case "total_spend_cents":
          aVal = a.total_spend_cents;
          bVal = b.total_spend_cents;
          break;
        case "total_no_shows":
          aVal = a.total_no_shows;
          bVal = b.total_no_shows;
          break;
        case "internal_rating":
          aVal = a.internal_rating || 0;
          bVal = b.internal_rating || 0;
          break;
      }

      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredGuests, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-3 sm:px-6 pt-4 sm:pt-6 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground">{t.title}</h1>
            <p className="text-xs text-muted-foreground">{t.subtitle}</p>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            size="sm"
            className="gap-1.5 h-8 text-xs"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t.addGuest}</span>
          </Button>
        </div>

        

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Segment sidebar - desktop only */}
        <div className="hidden lg:block w-48 border-r border-border overflow-y-auto">
          <CrmSegmentSidebar
            segment={segment}
            onSegmentChange={setSegment}
            guestCount={guests.length}
          />
        </div>

        {/* Table */}
        <div className="flex-1 min-w-0 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : sortedGuests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center px-4">
              <Users className="h-10 w-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium text-muted-foreground">{t.noGuests}</p>
              <p className="text-xs text-muted-foreground/70 mt-1">{t.noGuestsDesc}</p>
            </div>
          ) : (
            <CrmGuestTable
              guests={sortedGuests}
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
              onSelectGuest={setSelectedGuest}
              floorPlanEnabled={floorPlanEnabled}
            />
          )}
        </div>
      </div>

      {/* Guest Profile Slide-over */}
      <Sheet open={!!selectedGuest} onOpenChange={(open) => !open && setSelectedGuest(null)}>
        <SheetContent side="right" className="w-full sm:w-[480px] sm:max-w-[480px] p-0 overflow-hidden">
          {selectedGuest && (
            <CrmGuestProfile
              guest={selectedGuest}
              businessId={businessId}
              onClose={() => setSelectedGuest(null)}
              onUpdate={() => refetch()}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Add Guest Dialog */}
      <CrmAddGuestDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        businessId={businessId}
        onAdd={addGuest}
        onSuccess={() => refetch()}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  variant = "default",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  variant?: "default" | "warning" | "premium";
}) {
  const variantStyles = {
    default: "bg-card border-border",
    warning: "bg-card border-border",
    premium: "bg-card border-border",
  };
  const iconStyles = {
    default: "text-muted-foreground",
    warning: "text-amber-500",
    premium: "text-yellow-500",
  };

  return (
    <div className={`rounded-xl border p-3 ${variantStyles[variant]}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-3.5 w-3.5 ${iconStyles[variant]}`} />
        <span className="text-[10px] sm:text-xs text-muted-foreground truncate">{label}</span>
      </div>
      <p className="text-lg sm:text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}

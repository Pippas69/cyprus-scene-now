import { useEffect, useMemo, useState } from "react";
import { useCrmGuests, type CrmGuest } from "@/hooks/useCrmGuests";
import { useLanguage } from "@/hooks/useLanguage";
import { CrmGuestTable } from "./CrmGuestTable";
import { CrmGuestProfile } from "./CrmGuestProfile";
import { CrmSegmentDropdown } from "./CrmSegmentDropdown";
import { CrmAddGuestDialog } from "./CrmAddGuestDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, UserPlus, Users } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface CrmDashboardProps {
  businessId: string;
  floorPlanEnabled?: boolean;
}


type Segment = "all" | "vip" | "regulars" | "new" | "at_risk" | "churned" | "no_show_risk" | "high_spenders" | "birthday_week";

const translations = {
  el: {
    search: "Αναζήτηση πελάτη...",
    addGuest: "Νέος πελάτης",
    noGuests: "Δεν υπάρχουν πελάτες ακόμα",
    noGuestsDesc: "Οι πελάτες θα εμφανιστούν αυτόματα από κρατήσεις και εισιτήρια, ή προσθέστε χειροκίνητα.",
  },
  en: {
    search: "Search guest...",
    addGuest: "New guest",
    noGuests: "No guests yet",
    noGuestsDesc: "Guests will appear automatically from reservations and tickets, or add manually.",
  },
};

export function CrmDashboard({ businessId, floorPlanEnabled }: CrmDashboardProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const { guests, isLoading, addGuest, updateGuest, refetch } = useCrmGuests(businessId);

  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState<Segment>("all");
  const [selectedGuest, setSelectedGuest] = useState<CrmGuest | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Keep the open profile in sync after edits/refetches
  useEffect(() => {
    if (!selectedGuest) return;
    const updated = guests.find((g) => g.id === selectedGuest.id);
    if (updated && updated !== selectedGuest) setSelectedGuest(updated);
  }, [guests, selectedGuest]);

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

  // Fixed multi-criteria sort: visits desc → spend desc → last visit desc
  const sortedGuests = useMemo(() => {
    return [...filteredGuests].sort((a, b) => {
      if (b.total_visits !== a.total_visits) return b.total_visits - a.total_visits;
      if (b.total_spend_cents !== a.total_spend_cents) return b.total_spend_cents - a.total_spend_cents;
      const aTime = a.last_visit ? new Date(a.last_visit).getTime() : 0;
      const bTime = b.last_visit ? new Date(b.last_visit).getTime() : 0;
      return bTime - aTime;
    });
  }, [filteredGuests]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar: segment dropdown, search, add button */}
      <div className="px-3 sm:px-4 pt-3 pb-2 space-y-2">
        <div className="flex items-center gap-2">
          <CrmSegmentDropdown segment={segment} onSegmentChange={setSegment} />
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={t.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            size="sm"
            className="gap-1.5 h-8 text-xs flex-shrink-0"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t.addGuest}</span>
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto">
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
            onSelectGuest={setSelectedGuest}
            floorPlanEnabled={floorPlanEnabled}
          />
        )}
      </div>

      {/* Guest Profile Slide-over */}
      <Sheet open={!!selectedGuest} onOpenChange={(open) => !open && setSelectedGuest(null)}>
        <SheetContent side="right" className="w-full sm:w-[480px] sm:max-w-[480px] p-0 overflow-hidden [&>button[data-radix-collection-item]]:hidden">
          <VisuallyHidden>
            <SheetTitle>Guest Profile</SheetTitle>
            <SheetDescription>Guest profile details</SheetDescription>
          </VisuallyHidden>
          {selectedGuest && (
            <CrmGuestProfile
              guest={selectedGuest}
              businessId={businessId}
              onClose={() => setSelectedGuest(null)}
              onUpdate={() => refetch()}
              onUpdateGuest={updateGuest}
              allGuests={guests}
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

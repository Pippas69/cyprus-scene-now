import { useEffect, useMemo, useState, useCallback } from "react";
import { useCrmGuests, type CrmGuest } from "@/hooks/useCrmGuests";
import { useLanguage } from "@/hooks/useLanguage";
import { CrmGuestTable } from "./CrmGuestTable";
import { CrmGuestProfile } from "./CrmGuestProfile";
import { CrmSegmentDropdown } from "./CrmSegmentDropdown";
import { CrmAddGuestDialog } from "./CrmAddGuestDialog";
import { CrmBulkActionBar } from "./CrmBulkActionBar";
import { CrmBulkSendMessageDialog } from "./CrmBulkSendMessageDialog";
import { CrmBulkTagDialog } from "./CrmBulkTagDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, UserPlus, Users, Download, CheckSquare } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { toast } from "sonner";
import * as XLSX from "xlsx";

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
    exportXlsx: "Export Excel",
    exported: "Το αρχείο Excel εξήχθη",
    selectMode: "Επιλογή",
  },
  en: {
    search: "Search guest...",
    addGuest: "New guest",
    noGuests: "No guests yet",
    noGuestsDesc: "Guests will appear automatically from reservations and tickets, or add manually.",
    exportXlsx: "Export Excel",
    exported: "Excel file exported",
    selectMode: "Select",
  },
};

function downloadXlsx(guests: CrmGuest[], filename: string) {
  const data = guests.map((g) => ({
    "Όνομα": g.guest_name,
    "Τηλέφωνο": g.phone || "",
    "Email": g.email || "",
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  // Set column widths
  ws["!cols"] = [{ wch: 30 }, { wch: 20 }, { wch: 35 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Πελάτες");
  XLSX.writeFile(wb, filename);
}

export function CrmDashboard({ businessId, floorPlanEnabled }: CrmDashboardProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const { guests, isLoading, addGuest, updateGuest, refetch } = useCrmGuests(businessId);

  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState<Segment>("all");
  const [selectedGuest, setSelectedGuest] = useState<CrmGuest | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTagMode, setBulkTagMode] = useState<"add" | "remove" | null>(null);
  const [showBulkMessage, setShowBulkMessage] = useState(false);

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

  // Fixed multi-criteria sort
  const sortedGuests = useMemo(() => {
    return [...filteredGuests].sort((a, b) => {
      if (b.total_visits !== a.total_visits) return b.total_visits - a.total_visits;
      if (b.total_spend_cents !== a.total_spend_cents) return b.total_spend_cents - a.total_spend_cents;
      const aTime = a.last_visit ? new Date(a.last_visit).getTime() : 0;
      const bTime = b.last_visit ? new Date(b.last_visit).getTime() : 0;
      return bTime - aTime;
    });
  }, [filteredGuests]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === sortedGuests.length) return new Set();
      return new Set(sortedGuests.map((g) => g.id));
    });
  }, [sortedGuests]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, []);

  const handleExportXlsx = useCallback(() => {
    const toExport = selectedIds.size > 0
      ? sortedGuests.filter((g) => selectedIds.has(g.id))
      : sortedGuests;
    downloadXlsx(toExport, `guests-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(t.exported);
  }, [sortedGuests, selectedIds, t.exported]);

  const handleExportSelected = useCallback(() => {
    const toExport = sortedGuests.filter((g) => selectedIds.has(g.id));
    downloadXlsx(toExport, `guests-selected-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(t.exported);
  }, [sortedGuests, selectedIds, t.exported]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar or Bulk Action Bar */}
      {selectionMode && selectedIds.size > 0 ? (
        <CrmBulkActionBar
          selectedCount={selectedIds.size}
          onClearSelection={clearSelection}
          onExportSelected={handleExportSelected}
          onAddTag={() => setBulkTagMode("add")}
          onRemoveTag={() => setBulkTagMode("remove")}
          onSendMessage={() => setShowBulkMessage(true)}
        />
      ) : (
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
              variant={selectionMode ? "secondary" : "outline"}
              size="sm"
              className="gap-1 h-8 text-xs flex-shrink-0"
              onClick={() => {
                setSelectionMode(!selectionMode);
                if (selectionMode) setSelectedIds(new Set());
              }}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.selectMode}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 h-8 text-xs flex-shrink-0"
              onClick={handleExportXlsx}
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.exportXlsx}</span>
            </Button>
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
      )}

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
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
          />
        )}
      </div>

      {/* Guest Profile Slide-over */}
      <Sheet open={!!selectedGuest} onOpenChange={(open) => !open && setSelectedGuest(null)}>
        <SheetContent side="right" className="w-full sm:w-[480px] sm:max-w-[480px] p-0 overflow-hidden [&>button.absolute]:hidden">
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

      {/* Bulk Tag Dialog */}
      <CrmBulkTagDialog
        open={bulkTagMode !== null}
        onOpenChange={(open) => !open && setBulkTagMode(null)}
        mode={bulkTagMode || "add"}
        selectedGuestIds={Array.from(selectedIds)}
        businessId={businessId}
        onComplete={() => {
          refetch();
          clearSelection();
        }}
      />

      {/* Bulk Send Message Dialog */}
      <CrmBulkSendMessageDialog
        open={showBulkMessage}
        onOpenChange={setShowBulkMessage}
        guests={sortedGuests.filter((g) => selectedIds.has(g.id))}
        businessId={businessId}
      />
    </div>
  );
}

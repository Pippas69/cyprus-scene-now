import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Merge, Ghost, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";
import { type CrmGuest } from "@/hooks/useCrmGuests";
import { format } from "date-fns";
import { el, enUS } from "date-fns/locale";

interface CrmGhostMergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  primaryGuest: CrmGuest;
  allGuests: CrmGuest[];
  onSuccess: () => void;
}

const translations = {
  el: {
    title: "Συγχώνευση Προφίλ",
    description: "Επιλέξτε τα ghost profiles που θέλετε να ενώσετε με",
    mergeInto: "Συγχώνευση σε",
    selectAll: "Επιλογή Όλων",
    merge: "Συγχώνευση",
    merging: "Συγχώνευση...",
    noMatches: "Δεν βρέθηκαν παρόμοια profiles",
    visits: "επισκέψεις",
    spend: "έξοδα",
    broughtBy: "μέσω",
    success: "Η συγχώνευση ολοκληρώθηκε",
    error: "Σφάλμα κατά τη συγχώνευση",
    warning: "Αυτή η ενέργεια δεν μπορεί να αναιρεθεί",
  },
  en: {
    title: "Merge Profiles",
    description: "Select the ghost profiles you want to merge with",
    mergeInto: "Merge into",
    selectAll: "Select All",
    merge: "Merge",
    merging: "Merging...",
    noMatches: "No similar profiles found",
    visits: "visits",
    spend: "spend",
    broughtBy: "via",
    success: "Merge completed successfully",
    error: "Error during merge",
    warning: "This action cannot be undone",
  },
};

export function CrmGhostMergeDialog({
  open,
  onOpenChange,
  primaryGuest,
  allGuests,
  onSuccess,
}: CrmGhostMergeDialogProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const locale = language === "el" ? el : enUS;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [merging, setMerging] = useState(false);

  // Find mergeable candidates: same business, ghost type, exclude primary
  const candidates = useMemo(() => {
    return allGuests.filter(
      (g) =>
        g.id !== primaryGuest.id &&
        g.business_id === primaryGuest.business_id &&
        g.profile_type === "ghost"
    );
  }, [allGuests, primaryGuest]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === candidates.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(candidates.map((c) => c.id)));
    }
  };

  const handleMerge = async () => {
    if (selected.size === 0) return;
    setMerging(true);

    try {
      const mergeIds = Array.from(selected);
      const primaryId = primaryGuest.id;

      // 1. Move notes from merged guests to primary
      await supabase
        .from("crm_guest_notes")
        .update({ guest_id: primaryId })
        .in("guest_id", mergeIds);

      // 2. Move tag assignments from merged guests to primary (skip duplicates)
      const { data: existingTags } = await supabase
        .from("crm_guest_tag_assignments")
        .select("tag_id")
        .eq("guest_id", primaryId);

      const existingTagIds = new Set((existingTags || []).map((t) => t.tag_id));

      const { data: mergedTags } = await supabase
        .from("crm_guest_tag_assignments")
        .select("id, tag_id")
        .in("guest_id", mergeIds);

      if (mergedTags) {
        const toMove = mergedTags.filter((t) => !existingTagIds.has(t.tag_id));
        if (toMove.length > 0) {
          await supabase
            .from("crm_guest_tag_assignments")
            .update({ guest_id: primaryId })
            .in("id", toMove.map((t) => t.id));
        }
        // Delete duplicate tag assignments
        const toDelete = mergedTags.filter((t) => existingTagIds.has(t.tag_id));
        if (toDelete.length > 0) {
          await supabase
            .from("crm_guest_tag_assignments")
            .delete()
            .in("id", toDelete.map((t) => t.id));
        }
      }

      // 3. Track merged IDs
      const currentMergedFrom = (primaryGuest.custom_fields?.merged_from as string[]) || [];
      const newMergedFrom = [...new Set([...currentMergedFrom, ...mergeIds])];

      await supabase
        .from("crm_guests")
        .update({
          merged_from: newMergedFrom,
          updated_at: new Date().toISOString(),
        })
        .eq("id", primaryId);

      // 4. Delete merged ghost profiles
      await supabase.from("crm_guests").delete().in("id", mergeIds);

      toast.success(t.success);
      setSelected(new Set());
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Merge error:", error);
      toast.error(t.error);
    } finally {
      setMerging(false);
    }
  };

  const initials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-4 w-4" />
            {t.title}
          </DialogTitle>
          <DialogDescription>
            {t.description} <span className="font-semibold">{primaryGuest.guest_name}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Primary guest badge */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {initials(primaryGuest.guest_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{primaryGuest.guest_name}</p>
            <p className="text-[10px] text-muted-foreground">
              {t.mergeInto} · {primaryGuest.total_visits} {t.visits}
            </p>
          </div>
          <Badge variant="secondary" className="text-[9px]">
            {language === "el" ? "Κύριο" : "Primary"}
          </Badge>
        </div>

        {/* Warning */}
        <p className="text-[11px] text-destructive/80 text-center">{t.warning}</p>

        {/* Candidate list */}
        {candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t.noMatches}</p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={toggleAll}>
                {t.selectAll} ({candidates.length})
              </Button>
            </div>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-1.5">
                {candidates.map((candidate) => {
                  const isSelected = selected.has(candidate.id);
                  return (
                    <div
                      key={candidate.id}
                      className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors ${
                        isSelected
                          ? "border-primary/40 bg-primary/5"
                          : "border-border hover:border-primary/20"
                      }`}
                      onClick={() => toggleSelect(candidate.id)}
                    >
                      <Checkbox checked={isSelected} className="shrink-0" />
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className="text-[10px]">
                          {initials(candidate.guest_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{candidate.guest_name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          {candidate.brought_by_name && (
                            <span className="flex items-center gap-0.5">
                              <Ghost className="h-2.5 w-2.5" />
                              {t.broughtBy} {candidate.brought_by_name}
                            </span>
                          )}
                          <span className="flex items-center gap-0.5">
                            <Calendar className="h-2.5 w-2.5" />
                            {format(new Date(candidate.created_at), "dd/MM/yy", { locale })}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-muted-foreground">
                          {candidate.total_visits} {t.visits}
                        </p>
                        {candidate.total_spend_cents > 0 && (
                          <p className="text-[10px] text-muted-foreground">
                            €{(candidate.total_spend_cents / 100).toFixed(0)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}

        {/* Merge button */}
        {candidates.length > 0 && (
          <Button
            className="w-full"
            disabled={selected.size === 0 || merging}
            onClick={handleMerge}
          >
            {merging ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t.merging}
              </>
            ) : (
              <>
                <Merge className="h-4 w-4 mr-2" />
                {t.merge} ({selected.size})
              </>
            )}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

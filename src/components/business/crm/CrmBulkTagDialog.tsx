import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import type { CrmGuestTag } from "@/hooks/useCrmGuests";

interface CrmBulkTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "remove";
  selectedGuestIds: string[];
  businessId: string;
  onComplete: () => void;
}

const translations = {
  el: {
    addTitle: "Προσθήκη Tag σε επιλεγμένους",
    removeTitle: "Αφαίρεση Tag από επιλεγμένους",
    apply: "Εφαρμογή",
    noTags: "Δεν υπάρχουν tags",
  },
  en: {
    addTitle: "Add Tag to selected",
    removeTitle: "Remove Tag from selected",
    apply: "Apply",
    noTags: "No tags available",
  },
};

export function CrmBulkTagDialog({ open, onOpenChange, mode, selectedGuestIds, businessId, onComplete }: CrmBulkTagDialogProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const [tags, setTags] = useState<CrmGuestTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedTagIds([]);
    supabase
      .from("crm_guest_tags")
      .select("id, name, color, emoji, is_system")
      .eq("business_id", businessId)
      .order("name")
      .then(({ data }) => setTags((data || []) as CrmGuestTag[]));
  }, [open, businessId]);

  const handleApply = async () => {
    if (selectedTagIds.length === 0) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (mode === "add") {
        const inserts = selectedGuestIds.flatMap((guestId) =>
          selectedTagIds.map((tagId) => ({
            guest_id: guestId,
            tag_id: tagId,
            assigned_by: user?.id || null,
          }))
        );
        // Use upsert to avoid duplicates
        await supabase.from("crm_guest_tag_assignments").upsert(inserts, { onConflict: "guest_id,tag_id", ignoreDuplicates: true });
      } else {
        for (const tagId of selectedTagIds) {
          await supabase
            .from("crm_guest_tag_assignments")
            .delete()
            .in("guest_id", selectedGuestIds)
            .eq("tag_id", tagId);
        }
      }
      toast.success(language === "el" ? "Tags ενημερώθηκαν" : "Tags updated");
      onComplete();
      onOpenChange(false);
    } catch {
      toast.error(language === "el" ? "Σφάλμα" : "Error");
    }
    setLoading(false);
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle className="text-sm">{mode === "add" ? t.addTitle : t.removeTitle}</DialogTitle>
        </DialogHeader>
        {tags.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">{t.noTags}</p>
        ) : (
          <div className="space-y-2 max-h-[240px] overflow-y-auto">
            {tags.map((tag) => (
              <label key={tag.id} className="flex items-center gap-2 cursor-pointer p-1.5 rounded-md hover:bg-accent/50">
                <Checkbox
                  checked={selectedTagIds.includes(tag.id)}
                  onCheckedChange={() => toggleTag(tag.id)}
                />
                <span className="text-xs flex items-center gap-1">
                  {tag.emoji && <span>{tag.emoji}</span>}
                  {tag.name}
                </span>
              </label>
            ))}
          </div>
        )}
        <Button size="sm" onClick={handleApply} disabled={loading || selectedTagIds.length === 0} className="w-full mt-2">
          {t.apply}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

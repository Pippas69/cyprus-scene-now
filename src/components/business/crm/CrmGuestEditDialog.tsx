import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { type CrmGuest } from "@/hooks/useCrmGuests";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface CrmGuestEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guest: CrmGuest;
  onUpdate: (data: { id: string } & Record<string, unknown>) => Promise<unknown>;
  onSuccess: () => void;
}

const translations = {
  el: {
    title: "Επεξεργασία πελάτη",
    name: "Όνομα",
    phone: "Τηλέφωνο",
    email: "Email",
    birthday: "Γενέθλια",
    company: "Εταιρεία",
    instagram: "Instagram",
    dietary: "Διατροφικές προτιμήσεις",
    drinks: "Ποτά",
    music: "Μουσική",
    notes: "Σημειώσεις σχέσης",
    save: "Αποθήκευση",
    cancel: "Ακύρωση",
    success: "Ο πελάτης ενημερώθηκε",
    error: "Σφάλμα",
    enrichHint: "Εμπλουτίστε το προφίλ για καλύτερη εξυπηρέτηση",
  },
  en: {
    title: "Edit guest",
    name: "Name",
    phone: "Phone",
    email: "Email",
    birthday: "Birthday",
    company: "Company",
    instagram: "Instagram",
    dietary: "Dietary preferences",
    drinks: "Drinks",
    music: "Music",
    notes: "Relationship notes",
    save: "Save",
    cancel: "Cancel",
    success: "Guest updated",
    error: "Error",
    enrichHint: "Enrich the profile for better service",
  },
};

const getInitialForm = (guest: CrmGuest) => ({
  guest_name: guest.guest_name,
  phone: guest.phone || "",
  email: guest.email || "",
  birthday: guest.birthday || "",
  company: guest.company || "",
  instagram_handle: guest.instagram_handle || "",
  dietary_preferences: guest.dietary_preferences?.join(", ") || "",
  drink_preferences: guest.drink_preferences || "",
  music_preferences: guest.music_preferences || "",
  relationship_notes: guest.relationship_notes || "",
});

export function CrmGuestEditDialog({ open, onOpenChange, guest, onUpdate, onSuccess }: CrmGuestEditDialogProps) {
  const { language } = useLanguage();
  const t = translations[language];

  const [form, setForm] = useState(() => getInitialForm(guest));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(getInitialForm(guest));
    }
  }, [guest, open]);

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({
        id: guest.id,
        guest_name: form.guest_name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        birthday: form.birthday || null,
        company: form.company.trim() || null,
        instagram_handle: form.instagram_handle.trim() || null,
        dietary_preferences: form.dietary_preferences.trim()
          ? form.dietary_preferences.split(",").map((s) => s.trim()).filter(Boolean)
          : null,
        drink_preferences: form.drink_preferences.trim() || null,
        music_preferences: form.music_preferences.trim() || null,
        relationship_notes: form.relationship_notes.trim() || null,
      });
      toast.success(t.success);
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error(t.error);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{t.title}</DialogTitle>
          {guest.profile_type === "ghost" && (
            <p className="text-xs text-muted-foreground mt-1">{t.enrichHint}</p>
          )}
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Field label={`${t.name} *`} value={form.guest_name} onChange={(v) => set("guest_name", v)} />
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.phone} value={form.phone} onChange={(v) => set("phone", v)} placeholder="+357..." />
            <Field label={t.email} value={form.email} onChange={(v) => set("email", v)} placeholder="email@example.com" type="email" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.birthday} value={form.birthday} onChange={(v) => set("birthday", v)} type="date" />
            <Field label={t.company} value={form.company} onChange={(v) => set("company", v)} />
          </div>
          <Field label={t.instagram} value={form.instagram_handle} onChange={(v) => set("instagram_handle", v)} placeholder="@username" />
          <Field label={t.dietary} value={form.dietary_preferences} onChange={(v) => set("dietary_preferences", v)} placeholder="Vegan, Gluten-free..." />
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.drinks} value={form.drink_preferences} onChange={(v) => set("drink_preferences", v)} />
            <Field label={t.music} value={form.music_preferences} onChange={(v) => set("music_preferences", v)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t.notes}</Label>
            <Textarea
              value={form.relationship_notes}
              onChange={(e) => set("relationship_notes", e.target.value)}
              className="text-sm mt-1 min-h-[60px] resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {t.cancel}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !form.guest_name.trim()}>
            {t.save}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 text-sm mt-1"
        type={type}
      />
    </div>
  );
}

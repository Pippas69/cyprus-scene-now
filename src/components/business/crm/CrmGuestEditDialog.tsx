import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { type CrmGuest } from "@/hooks/useCrmGuests";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

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
    sectionBasic: "Βασικά στοιχεία",
    sectionAllergy: "Αλλεργίες & Διατροφή",
    sectionPrefs: "Προτιμήσεις",
    sectionRelation: "Πληροφορίες σχέσης",
    name: "Ονοματεπώνυμο",
    phone: "Τηλέφωνο",
    email: "Email",
    birthday: "Γενέθλια",
    allergies: "Αλλεργίες",
    allergiesHint: "⚠️ Κρίσιμο για ασφάλεια",
    dietary: "Διατροφικές προτιμήσεις",
    seating: "Προτίμηση θέσης",
    drinks: "Αγαπημένα ποτά",
    food: "Αγαπημένα φαγητά",
    music: "Αγαπημένη μουσική",
    relationNotes: "Πληροφορίες σχέσης",
    relationPlaceholder: "π.χ. Φίλος ιδιοκτήτη, πάντα φέρνει 4+ άτομα...",
    save: "Αποθήκευση",
    cancel: "Ακύρωση",
    success: "Ο πελάτης ενημερώθηκε",
    error: "Σφάλμα",
    enrichHint: "Εμπλουτίστε το προφίλ για καλύτερη εξυπηρέτηση",
  },
  en: {
    title: "Edit guest",
    sectionBasic: "Basic info",
    sectionAllergy: "Allergies & Diet",
    sectionPrefs: "Preferences",
    sectionRelation: "Relationship info",
    name: "Full name",
    phone: "Phone",
    email: "Email",
    birthday: "Birthday",
    allergies: "Allergies",
    allergiesHint: "⚠️ Critical for safety",
    dietary: "Dietary preferences",
    seating: "Seating preference",
    drinks: "Favorite drinks",
    food: "Favorite food",
    music: "Favorite music",
    relationNotes: "Relationship info",
    relationPlaceholder: "e.g. Friend of owner, always brings 4+ people...",
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
  allergies: (guest as any).allergies?.join(", ") || "",
  dietary_preferences: guest.dietary_preferences?.join(", ") || "",
  seating_preferences: (guest as any).seating_preferences || "",
  drink_preferences: guest.drink_preferences || "",
  food_preferences: (guest as any).food_preferences || "",
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
        allergies: form.allergies.trim()
          ? form.allergies.split(",").map((s) => s.trim()).filter(Boolean)
          : null,
        dietary_preferences: form.dietary_preferences.trim()
          ? form.dietary_preferences.split(",").map((s) => s.trim()).filter(Boolean)
          : null,
        seating_preferences: form.seating_preferences.trim() || null,
        drink_preferences: form.drink_preferences.trim() || null,
        food_preferences: form.food_preferences.trim() || null,
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
          <DialogDescription className="sr-only">
            {language === "el" ? "Φόρμα επεξεργασίας στοιχείων πελάτη" : "Guest profile editing form"}
          </DialogDescription>
          {guest.profile_type === "ghost" && (
            <p className="text-xs text-muted-foreground mt-1">{t.enrichHint}</p>
          )}
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* SECTION 1: Basic Info */}
          <Section title={t.sectionBasic}>
            <Field label={`${t.name} *`} value={form.guest_name} onChange={(v) => set("guest_name", v)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label={t.phone} value={form.phone} onChange={(v) => set("phone", v)} placeholder="+357..." />
              <Field label={t.email} value={form.email} onChange={(v) => set("email", v)} placeholder="email@example.com" type="email" />
            </div>
            <Field label={t.birthday} value={form.birthday} onChange={(v) => set("birthday", v)} type="date" />
          </Section>

          {/* SECTION 2: Allergies & Diet */}
          <Section title={t.sectionAllergy}>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="h-3 w-3 text-destructive" />
                <Label className="text-xs text-destructive font-medium">{t.allergies}</Label>
              </div>
              <Input
                value={form.allergies}
                onChange={(e) => set("allergies", e.target.value)}
                placeholder="Nuts, Shellfish, Gluten..."
                className="h-9 text-sm border-destructive/30 focus-visible:ring-destructive/30"
              />
              <p className="text-[10px] text-destructive/70 mt-0.5">{t.allergiesHint}</p>
            </div>
            <Field label={t.dietary} value={form.dietary_preferences} onChange={(v) => set("dietary_preferences", v)} placeholder="Vegan, Pescatarian..." />
          </Section>

          {/* SECTION 3: Preferences */}
          <Section title={t.sectionPrefs}>
            <Field label={t.seating} value={form.seating_preferences} onChange={(v) => set("seating_preferences", v)} placeholder="Window, Booth, Bar, Outdoor..." />
            <div className="grid grid-cols-2 gap-3">
              <Field label={t.drinks} value={form.drink_preferences} onChange={(v) => set("drink_preferences", v)} />
              <Field label={t.food} value={form.food_preferences} onChange={(v) => set("food_preferences", v)} />
            </div>
            <Field label={t.music} value={form.music_preferences} onChange={(v) => set("music_preferences", v)} />
          </Section>

          {/* SECTION 4: Relationship Info */}
          <Section title={t.sectionRelation}>
            <Textarea
              value={form.relationship_notes}
              onChange={(e) => set("relationship_notes", e.target.value)}
              className="text-sm min-h-[70px] resize-none"
              placeholder={t.relationPlaceholder}
            />
          </Section>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>
      {children}
    </div>
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

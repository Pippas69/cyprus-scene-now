import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CrmAddGuestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  onAdd: (guest: {
    business_id: string;
    guest_name: string;
    phone?: string;
    email?: string;
    profile_type?: string;
  }) => Promise<unknown>;
  onSuccess: () => void;
}

const translations = {
  el: {
    title: "Νέος πελάτης",
    name: "Όνομα",
    phone: "Τηλέφωνο",
    email: "Email",
    save: "Αποθήκευση",
    cancel: "Ακύρωση",
    namePlaceholder: "Όνομα πελάτη",
    phonePlaceholder: "+357...",
    emailPlaceholder: "email@example.com",
    success: "Ο πελάτης προστέθηκε",
    error: "Σφάλμα κατά την προσθήκη",
    nameRequired: "Το όνομα είναι υποχρεωτικό",
  },
  en: {
    title: "New guest",
    name: "Name",
    phone: "Phone",
    email: "Email",
    save: "Save",
    cancel: "Cancel",
    namePlaceholder: "Guest name",
    phonePlaceholder: "+357...",
    emailPlaceholder: "email@example.com",
    success: "Guest added",
    error: "Error adding guest",
    nameRequired: "Name is required",
  },
};

export function CrmAddGuestDialog({ open, onOpenChange, businessId, onAdd, onSuccess }: CrmAddGuestDialogProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t.nameRequired);
      return;
    }
    setSaving(true);
    try {
      await onAdd({
        business_id: businessId,
        guest_name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        profile_type: "ghost",
      });
      toast.success(t.success);
      setName("");
      setPhone("");
      setEmail("");
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error(t.error);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{t.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">{t.name} *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              className="h-9 text-sm mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">{t.phone}</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t.phonePlaceholder}
              className="h-9 text-sm mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">{t.email}</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
              className="h-9 text-sm mt-1"
              type="email"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {t.cancel}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {t.save}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

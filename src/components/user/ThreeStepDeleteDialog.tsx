import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface ThreeStepDeleteDialogProps {
  onConfirmDelete: () => Promise<void>;
  isDeleting: boolean;
  isBusiness?: boolean;
  trigger?: React.ReactNode;
}

const translations = {
  el: {
    deleteAccount: 'Διαγραφή Λογαριασμού',
    // Step 1
    step1Title: 'Βήμα 1 από 3 — Θέλεις σίγουρα να διαγράψεις τον λογαριασμό σου;',
    step1DescUser: 'Θα διαγραφούν ΟΡΙΣΤΙΚΑ: το προφίλ σου, τα αγαπημένα σου, οι κρατήσεις σου, τα εισιτήριά σου, τα μηνύματά σου, και κάθε δεδομένο σου. Δεν θα μπορείς να ανακτήσεις τίποτα.',
    step1DescBusiness: 'Θα διαγραφούν ΟΡΙΣΤΙΚΑ: η επιχείρησή σου, ΟΛΕΣ οι εκδηλώσεις, κρατήσεις, εισιτήρια, προσφορές, CRM δεδομένα, analytics, αρχεία, ειδοποιήσεις — ΤΙΠΟΤΑ δεν θα μείνει. Σαν να μην υπήρξε ποτέ η επιχείρησή σου στο ΦΟΜΟ.',
    step1Continue: 'Ναι, θέλω να συνεχίσω',
    // Step 2
    step2Title: 'Βήμα 2 από 3 — Επιβεβαίωση',
    step2Desc: 'Πληκτρολόγησε "ΔΙΑΓΡΑΦΗ" για να επιβεβαιώσεις:',
    step2Placeholder: 'ΔΙΑΓΡΑΦΗ',
    step2Keyword: 'ΔΙΑΓΡΑΦΗ',
    step2CheckboxUser: 'Κατανοώ ότι ΟΛΕΣ οι πληροφορίες μου θα χαθούν οριστικά',
    step2CheckboxBusiness: 'Κατανοώ ότι η επιχείρησή μου και ΟΛΑ τα δεδομένα της θα διαγραφούν οριστικά',
    step2Continue: 'Τελικό βήμα',
    // Step 3
    step3Title: 'Βήμα 3 από 3 — ΤΕΛΕΥΤΑΙΑ ΕΥΚΑΙΡΙΑ',
    step3Desc: 'Αυτή είναι η τελευταία σου ευκαιρία. Μετά το πάτημα αυτού του κουμπιού, ο λογαριασμός σου και ΟΛΑ τα δεδομένα σου θα διαγραφούν ΑΜΕΣΑ και ΟΡΙΣΤΙΚΑ. Δεν υπάρχει αναίρεση.',
    step3DeleteForever: 'ΔΙΑΓΡΑΦΗ ΟΡΙΣΤΙΚΑ',
    step3Deleting: 'Διαγραφή σε εξέλιξη...',
    cancel: 'Ακύρωση',
    back: 'Πίσω',
  },
  en: {
    deleteAccount: 'Delete Account',
    step1Title: 'Step 1 of 3 — Are you sure you want to delete your account?',
    step1DescUser: 'This will PERMANENTLY delete: your profile, favorites, reservations, tickets, messages, and all your data. Nothing can be recovered.',
    step1DescBusiness: 'This will PERMANENTLY delete: your business, ALL events, reservations, tickets, offers, CRM data, analytics, files, notifications — NOTHING will remain. It will be as if your business never existed on FOMO.',
    step1Continue: 'Yes, I want to continue',
    step2Title: 'Step 2 of 3 — Confirmation',
    step2Desc: 'Type "DELETE" to confirm:',
    step2Placeholder: 'DELETE',
    step2Keyword: 'DELETE',
    step2CheckboxUser: 'I understand that ALL my information will be permanently lost',
    step2CheckboxBusiness: 'I understand that my business and ALL its data will be permanently deleted',
    step2Continue: 'Final step',
    step3Title: 'Step 3 of 3 — LAST CHANCE',
    step3Desc: 'This is your last chance. After pressing this button, your account and ALL data will be deleted IMMEDIATELY and PERMANENTLY. There is no undo.',
    step3DeleteForever: 'DELETE PERMANENTLY',
    step3Deleting: 'Deleting...',
    cancel: 'Cancel',
    back: 'Back',
  },
};

export const ThreeStepDeleteDialog = ({ onConfirmDelete, isDeleting, isBusiness = false, trigger }: ThreeStepDeleteDialogProps) => {
  const { language } = useLanguage();
  const t = translations[language] || translations.en;

  const [step, setStep] = useState(1);
  const [confirmText, setConfirmText] = useState('');
  const [checked, setChecked] = useState(false);
  const [open, setOpen] = useState(false);

  const resetState = () => {
    setStep(1);
    setConfirmText('');
    setChecked(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) resetState();
  };

  const isStep2Valid = confirmText.trim().toUpperCase() === t.step2Keyword && checked;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        {trigger || (
          <Button variant="destructive" className="w-full text-xs sm:text-sm h-9 sm:h-10">
            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            {t.deleteAccount}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        {step === 1 && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive text-sm sm:text-base">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                {t.step1Title}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs sm:text-sm">
                {isBusiness ? t.step1DescBusiness : t.step1DescUser}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
              <Button variant="destructive" onClick={() => setStep(2)} size="sm">
                {t.step1Continue}
              </Button>
            </AlertDialogFooter>
          </>
        )}

        {step === 2 && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive text-sm sm:text-base">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                {t.step2Title}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs sm:text-sm">{t.step2Desc}</Label>
                    <Input
                      value={confirmText}
                      onChange={e => setConfirmText(e.target.value)}
                      placeholder={t.step2Placeholder}
                      className="mt-2 border-destructive text-sm"
                      autoComplete="off"
                    />
                  </div>
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="confirm-understand"
                      checked={checked}
                      onCheckedChange={(val) => setChecked(val === true)}
                      className="mt-0.5"
                    />
                    <Label htmlFor="confirm-understand" className="text-xs sm:text-sm text-foreground cursor-pointer leading-tight">
                      {isBusiness ? t.step2CheckboxBusiness : t.step2CheckboxUser}
                    </Label>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button variant="outline" onClick={() => { setStep(1); setConfirmText(''); setChecked(false); }} size="sm">
                {t.back}
              </Button>
              <Button variant="destructive" onClick={() => setStep(3)} disabled={!isStep2Valid} size="sm">
                {t.step2Continue}
              </Button>
            </AlertDialogFooter>
          </>
        )}

        {step === 3 && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive text-sm sm:text-base">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                {t.step3Title}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs sm:text-sm font-semibold text-destructive">
                {t.step3Desc}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button variant="outline" onClick={() => setStep(2)} disabled={isDeleting} size="sm">
                {t.back}
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  await onConfirmDelete();
                  handleOpenChange(false);
                }}
                disabled={isDeleting}
                size="sm"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t.step3Deleting}
                  </>
                ) : (
                  t.step3DeleteForever
                )}
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
};

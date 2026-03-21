import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
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
import { Send } from "lucide-react";
import { toast } from "sonner";

interface CrmSendMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guestName: string;
  guestUserId: string;
  businessId: string;
  businessName: string;
}

const translations = {
  el: {
    title: "Αποστολή μηνύματος",
    to: "Προς",
    subject: "Θέμα",
    subjectPlaceholder: "π.χ. Ειδική πρόσκληση",
    message: "Μήνυμα",
    messagePlaceholder: "Γράψε το μήνυμά σου εδώ...",
    send: "Αποστολή",
    cancel: "Ακύρωση",
    success: "Το μήνυμα στάλθηκε",
    error: "Σφάλμα αποστολής",
    emptyFields: "Συμπλήρωσε θέμα και μήνυμα",
  },
  en: {
    title: "Send message",
    to: "To",
    subject: "Subject",
    subjectPlaceholder: "e.g. Special invitation",
    message: "Message",
    messagePlaceholder: "Write your message here...",
    send: "Send",
    cancel: "Cancel",
    success: "Message sent",
    error: "Failed to send",
    emptyFields: "Fill in subject and message",
  },
};

export function CrmSendMessageDialog({
  open,
  onOpenChange,
  guestName,
  guestUserId,
  businessId,
  businessName,
}: CrmSendMessageDialogProps) {
  const { language } = useLanguage();
  const t = translations[language];

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();
    if (!trimmedSubject || !trimmedMessage) {
      toast.error(t.emptyFields);
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.from("notifications").insert({
        user_id: guestUserId,
        title: `${businessName}: ${trimmedSubject}`,
        message: trimmedMessage,
        type: "personal",
        event_type: "business_message",
        entity_type: "business",
        entity_id: businessId,
        deep_link: `/business/${businessId}`,
      });

      if (error) throw error;

      toast.success(t.success);
      setSubject("");
      setMessage("");
      onOpenChange(false);
    } catch {
      toast.error(t.error);
    }
    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Send className="h-4 w-4" />
            {t.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs text-muted-foreground">{t.to}</Label>
            <Input value={guestName} disabled className="h-9 text-sm mt-1 bg-muted" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t.subject}</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t.subjectPlaceholder}
              className="h-9 text-sm mt-1"
              maxLength={100}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t.message}</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t.messagePlaceholder}
              className="text-sm mt-1 min-h-[100px] resize-none"
              maxLength={500}
            />
            <p className="text-[10px] text-muted-foreground mt-1 text-right">
              {message.length}/500
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {t.cancel}
          </Button>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={sending || !subject.trim() || !message.trim()}
            className="gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            {t.send}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

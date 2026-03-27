import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Send, Mail, MessageSquare, Phone } from "lucide-react";
import { toast } from "sonner";
import { type CrmGuest } from "@/hooks/useCrmGuests";

interface CrmBulkSendMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guests: CrmGuest[];
  businessId: string;
}

const translations = {
  el: {
    title: "Μαζική αποστολή μηνύματος",
    description: "Στείλε το ίδιο μήνυμα σε πολλούς πελάτες.",
    channels: "Κανάλια αποστολής",
    inApp: "Μήνυμα εντός εφαρμογής",
    sms: "SMS (ανοίγει στο κινητό)",
    email: "Email",
    subject: "Θέμα",
    subjectPlaceholder: "π.χ. Ειδική πρόσκληση",
    message: "Μήνυμα",
    messagePlaceholder: "Γράψε το μήνυμά σου εδώ...",
    send: "Αποστολή",
    cancel: "Ακύρωση",
    recipients: "παραλήπτες",
    noChannel: "Επίλεξε τουλάχιστον ένα κανάλι",
    emptyFields: "Συμπλήρωσε θέμα και μήνυμα",
    sending: "Αποστολή σε εξέλιξη...",
    successInApp: "μηνύματα εντός εφαρμογής στάλθηκαν",
    errorInApp: "Σφάλμα αποστολής μηνυμάτων",
    smsNote: "Θα ανοίξει η εφαρμογή SMS με τα τηλέφωνα",
    emailNote: "Θα ανοίξει η εφαρμογή email με τα emails",
    noPhones: "Κανένας επιλεγμένος πελάτης δεν έχει τηλέφωνο",
    noEmails: "Κανένας επιλεγμένος πελάτης δεν έχει email",
    noAppUsers: "Κανένας επιλεγμένος πελάτης δεν είναι εγγεγραμμένος χρήστης",
    withPhone: "με τηλέφωνο",
    withEmail: "με email",
    withApp: "εγγεγραμμένοι",
    smsOpened: "Η εφαρμογή SMS άνοιξε",
    emailOpened: "Η εφαρμογή email άνοιξε",
  },
  en: {
    title: "Bulk send message",
    description: "Send the same message to multiple customers.",
    channels: "Send channels",
    inApp: "In-app message",
    sms: "SMS (opens on phone)",
    email: "Email",
    subject: "Subject",
    subjectPlaceholder: "e.g. Special invitation",
    message: "Message",
    messagePlaceholder: "Write your message here...",
    send: "Send",
    cancel: "Cancel",
    recipients: "recipients",
    noChannel: "Select at least one channel",
    emptyFields: "Fill in subject and message",
    sending: "Sending...",
    successInApp: "in-app messages sent",
    errorInApp: "Failed to send messages",
    smsNote: "Will open SMS app with phone numbers",
    emailNote: "Will open email app with addresses",
    noPhones: "No selected guest has a phone number",
    noEmails: "No selected guest has an email",
    noAppUsers: "No selected guest is a registered user",
    withPhone: "with phone",
    withEmail: "with email",
    withApp: "registered",
    smsOpened: "SMS app opened",
    emailOpened: "Email app opened",
  },
};

async function logCommunication(
  businessId: string,
  senderId: string,
  guests: { id: string; contact?: string }[],
  channel: "in_app" | "sms" | "email",
  subject: string,
  message: string,
  status: string = "sent"
) {
  const rows = guests.map((g) => ({
    business_id: businessId,
    guest_id: g.id,
    sender_id: senderId,
    channel,
    subject,
    message,
    recipient_contact: g.contact || null,
    status,
  }));

  await supabase.from("crm_communication_log" as any).insert(rows);
}

export function CrmBulkSendMessageDialog({
  open,
  onOpenChange,
  guests,
  businessId,
}: CrmBulkSendMessageDialogProps) {
  const { language } = useLanguage();
  const t = translations[language];

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [channelInApp, setChannelInApp] = useState(true);
  const [channelSms, setChannelSms] = useState(false);
  const [channelEmail, setChannelEmail] = useState(false);

  const guestsWithPhone = guests.filter((g) => g.phone);
  const guestsWithEmail = guests.filter((g) => g.email);
  const guestsWithApp = guests.filter((g) => g.user_id);

  const handleSend = async () => {
    if (!channelInApp && !channelSms && !channelEmail) {
      toast.error(t.noChannel);
      return;
    }
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();
    if (!trimmedSubject || !trimmedMessage) {
      toast.error(t.emptyFields);
      return;
    }

    setSending(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const senderId = sessionData.session?.user?.id;
      if (!senderId) throw new Error("Missing auth session");
      const accessToken = sessionData.session?.access_token;

      // SMS: open native SMS with all phone numbers
      if (channelSms) {
        if (guestsWithPhone.length === 0) {
          toast.error(t.noPhones);
        } else {
          const phones = guestsWithPhone.map((g) => g.phone).join(",");
          const smsBody = encodeURIComponent(`${trimmedSubject}\n\n${trimmedMessage}`);
          window.open(`sms:${phones}?body=${smsBody}`, "_blank");
          toast.success(t.smsOpened);

          // Log SMS sends
          await logCommunication(
            businessId,
            senderId,
            guestsWithPhone.map((g) => ({ id: g.id, contact: g.phone || undefined })),
            "sms",
            trimmedSubject,
            trimmedMessage
          );
        }
      }

      // Email: open mailto with all emails
      if (channelEmail) {
        if (guestsWithEmail.length === 0) {
          toast.error(t.noEmails);
        } else {
          const emails = guestsWithEmail.map((g) => g.email).join(",");
          const mailSubject = encodeURIComponent(trimmedSubject);
          const mailBody = encodeURIComponent(trimmedMessage);
          window.open(`mailto:${emails}?subject=${mailSubject}&body=${mailBody}`, "_blank");
          toast.success(t.emailOpened);

          // Log email sends
          await logCommunication(
            businessId,
            senderId,
            guestsWithEmail.map((g) => ({ id: g.id, contact: g.email || undefined })),
            "email",
            trimmedSubject,
            trimmedMessage
          );
        }
      }

      // In-app: send via edge function to each registered user
      if (channelInApp) {
        if (guestsWithApp.length === 0) {
          toast.error(t.noAppUsers);
        } else {
          let successCount = 0;
          const successGuests: { id: string; contact?: string }[] = [];

          for (const guest of guestsWithApp) {
            try {
              const { data, error } = await supabase.functions.invoke(
                "send-crm-message-notification",
                {
                  body: {
                    guestId: guest.id,
                    businessId,
                    subject: trimmedSubject,
                    message: trimmedMessage,
                  },
                  headers: { Authorization: `Bearer ${accessToken}` },
                }
              );
              if (!error && data?.success) {
                successCount++;
                successGuests.push({ id: guest.id, contact: guest.user_id || undefined });
              }
            } catch {
              // continue with others
            }
          }

          // Log in-app sends
          if (successGuests.length > 0) {
            await logCommunication(
              businessId,
              senderId,
              successGuests,
              "in_app",
              trimmedSubject,
              trimmedMessage
            );
          }

          toast.success(`${successCount} ${t.successInApp}`);
        }
      }
    } catch {
      toast.error(t.errorInApp);
    }

    setSending(false);
    setSubject("");
    setMessage("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Send className="h-4 w-4" />
            {t.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t.description} ({guests.length} {t.recipients})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Channel selection */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">{t.channels}</Label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={channelInApp} onCheckedChange={(v) => setChannelInApp(!!v)} />
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs">{t.inApp}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {guestsWithApp.length} {t.withApp}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={channelSms} onCheckedChange={(v) => setChannelSms(!!v)} />
                <Phone className="h-3.5 w-3.5 text-green-500" />
                <span className="text-xs">{t.sms}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {guestsWithPhone.length} {t.withPhone}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={channelEmail} onCheckedChange={(v) => setChannelEmail(!!v)} />
                <Mail className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-xs">{t.email}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {guestsWithEmail.length} {t.withEmail}
                </span>
              </label>
            </div>
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
            <p className="text-[10px] text-muted-foreground mt-1 text-right">{message.length}/500</p>
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
            {sending ? t.sending : t.send}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

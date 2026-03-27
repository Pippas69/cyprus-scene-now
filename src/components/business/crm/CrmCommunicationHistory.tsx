import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Mail, MessageSquare, Phone } from "lucide-react";
import { format } from "date-fns";
import { el, enUS } from "date-fns/locale";

interface CrmCommunicationHistoryProps {
  guestId: string;
  businessId: string;
}

interface CommEntry {
  id: string;
  channel: "in_app" | "sms" | "email";
  subject: string | null;
  message: string;
  recipient_contact: string | null;
  status: string;
  created_at: string;
}

const translations = {
  el: {
    noHistory: "Δεν υπάρχει ιστορικό επικοινωνίας",
    noHistoryDesc: "Τα μηνύματα και τα emails θα εμφανίζονται εδώ.",
    email: "Email",
    inApp: "Μήνυμα εντός εφαρμογής",
    sms: "SMS",
  },
  en: {
    noHistory: "No communication history",
    noHistoryDesc: "Messages and emails will appear here.",
    email: "Email",
    inApp: "In-app message",
    sms: "SMS",
  },
};

export function CrmCommunicationHistory({ guestId, businessId }: CrmCommunicationHistoryProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const locale = language === "el" ? el : enUS;

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["crm-comm-history", guestId, businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_communication_log" as any)
        .select("id, channel, subject, message, recipient_contact, status, created_at")
        .eq("guest_id", guestId)
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as unknown as CommEntry[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center px-4">
        <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-2" />
        <p className="text-xs font-medium text-muted-foreground">{t.noHistory}</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">{t.noHistoryDesc}</p>
      </div>
    );
  }

  const iconMap = {
    email: <Mail className="h-3.5 w-3.5 text-blue-500" />,
    in_app: <MessageSquare className="h-3.5 w-3.5 text-primary" />,
    sms: <Phone className="h-3.5 w-3.5 text-green-500" />,
  };

  const labelMap = {
    email: t.email,
    in_app: t.inApp,
    sms: t.sms,
  };

  const statusColors: Record<string, string> = {
    sent: "text-green-500",
    pending: "text-yellow-500",
    failed: "text-destructive",
  };

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div key={entry.id} className="rounded-lg border border-border/50 p-3 text-xs">
          <div className="flex items-center gap-2 mb-1">
            {iconMap[entry.channel]}
            <span className="font-medium text-foreground">{labelMap[entry.channel]}</span>
            {entry.recipient_contact && (
              <span className="text-[9px] text-muted-foreground/70 truncate max-w-[120px]">
                → {entry.recipient_contact}
              </span>
            )}
            <span className={`text-[9px] ml-auto ${statusColors[entry.status] || "text-muted-foreground"}`}>
              {entry.status}
            </span>
          </div>
          {entry.subject && (
            <p className="text-foreground/80 font-medium ml-5.5 mb-0.5">{entry.subject}</p>
          )}
          <p className="text-muted-foreground line-clamp-2 ml-5.5">{entry.message}</p>
          <p className="text-[9px] text-muted-foreground/60 mt-1 ml-5.5">
            {format(new Date(entry.created_at), "dd MMM yyyy, HH:mm", { locale })}
          </p>
        </div>
      ))}
    </div>
  );
}

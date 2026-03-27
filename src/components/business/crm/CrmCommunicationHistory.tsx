import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Mail, MessageSquare, Phone } from "lucide-react";
import { format } from "date-fns";
import { el, enUS } from "date-fns/locale";

interface CrmCommunicationHistoryProps {
  guestEmail: string | null;
  guestUserId: string | null;
  businessId: string;
}

interface CommEntry {
  id: string;
  type: "email" | "in_app" | "sms";
  content: string;
  date: string;
  status?: string;
}

const translations = {
  el: {
    noHistory: "Δεν υπάρχει ιστορικό επικοινωνίας",
    noHistoryDesc: "Τα μηνύματα και τα emails θα εμφανίζονται εδώ.",
    email: "Email",
    inApp: "Μήνυμα",
    sms: "SMS",
  },
  en: {
    noHistory: "No communication history",
    noHistoryDesc: "Messages and emails will appear here.",
    email: "Email",
    inApp: "Message",
    sms: "SMS",
  },
};

export function CrmCommunicationHistory({ guestEmail, guestUserId, businessId }: CrmCommunicationHistoryProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const locale = language === "el" ? el : enUS;

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["crm-comm-history", guestEmail, guestUserId, businessId],
    queryFn: async () => {
      const results: CommEntry[] = [];

      // Fetch emails from email_send_log if guest has email
      if (guestEmail) {
        const { data: emails } = await supabase
          .from("email_send_log" as any)
          .select("id, template_name, recipient_email, status, created_at, metadata")
          .eq("recipient_email", guestEmail)
          .order("created_at", { ascending: false })
          .limit(50);

        if (emails) {
          // Deduplicate by message_id — take latest status per message
          const seen = new Set<string>();
          for (const e of emails as any[]) {
            const key = e.message_id || e.id;
            if (seen.has(key)) continue;
            seen.add(key);
            results.push({
              id: e.id,
              type: "email",
              content: e.template_name || "Email",
              date: e.created_at,
              status: e.status,
            });
          }
        }
      }

      // Fetch in-app messages if guest is a registered user
      if (guestUserId) {
        // Find conversations where this user is a participant
        const { data: participations } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", guestUserId);

        if (participations && participations.length > 0) {
          const convIds = participations.map((p) => p.conversation_id);
          
          // Get the business owner's user_id
          const { data: biz } = await supabase
            .from("businesses")
            .select("user_id")
            .eq("id", businessId)
            .single();

          if (biz) {
            // Fetch messages sent BY the business owner TO this guest
            const { data: messages } = await supabase
              .from("direct_messages")
              .select("id, body, created_at, sender_id, conversation_id")
              .in("conversation_id", convIds)
              .eq("sender_id", biz.user_id)
              .order("created_at", { ascending: false })
              .limit(50);

            if (messages) {
              for (const m of messages) {
                results.push({
                  id: m.id,
                  type: "in_app",
                  content: m.body,
                  date: m.created_at,
                });
              }
            }
          }
        }
      }

      // Sort all entries by date descending
      results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return results;
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
    dlq: "text-destructive",
  };

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div key={entry.id} className="rounded-lg border border-border/50 p-3 text-xs">
          <div className="flex items-center gap-2 mb-1">
            {iconMap[entry.type]}
            <span className="font-medium text-foreground">{labelMap[entry.type]}</span>
            {entry.status && (
              <span className={`text-[9px] ml-auto ${statusColors[entry.status] || "text-muted-foreground"}`}>
                {entry.status}
              </span>
            )}
          </div>
          <p className="text-muted-foreground line-clamp-2 ml-5.5">{entry.content}</p>
          <p className="text-[9px] text-muted-foreground/60 mt-1 ml-5.5">
            {format(new Date(entry.date), "dd MMM yyyy, HH:mm", { locale })}
          </p>
        </div>
      ))}
    </div>
  );
}

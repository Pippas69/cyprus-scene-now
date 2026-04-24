// Φάση 6: Banner στο Business Dashboard που εμφανίζεται όταν το sms_sending_paused = true
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

interface Props {
  businessId: string | null;
}

export function SmsPausedBanner({ businessId }: Props) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    let alive = true;
    const load = async () => {
      const { data } = await supabase
        .from("businesses")
        .select("sms_sending_paused")
        .eq("id", businessId)
        .maybeSingle();
      if (alive) setPaused(!!data?.sms_sending_paused);
    };
    load();

    // Realtime: react to flag changes immediately
    const channel = supabase
      .channel(`sms-paused-${businessId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "businesses",
          filter: `id=eq.${businessId}`,
        },
        (payload: any) => {
          setPaused(!!payload.new?.sms_sending_paused);
        },
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [businessId]);

  if (!paused) return null;

  return (
    <div className="bg-destructive/10 border-b border-destructive/30 px-3 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2 sm:gap-3">
      <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
      <p className="text-[11px] sm:text-xs text-destructive flex-1 leading-tight">
        {language === "el"
          ? "Η αποστολή SMS έχει παγώσει λόγω αποτυχίας χρέωσης. Ενημερώστε την κάρτα σας για να συνεχίσει."
          : "SMS sending is paused due to a failed charge. Update your card to resume."}
      </p>
      <Button
        size="sm"
        variant="destructive"
        className="h-7 text-[11px] sm:text-xs px-2 sm:px-3 flex-shrink-0"
        onClick={() => navigate("/dashboard-business/settings")}
      >
        {language === "el" ? "Ενημέρωση κάρτας" : "Update card"}
      </Button>
    </div>
  );
}

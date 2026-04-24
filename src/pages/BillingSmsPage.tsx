import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { CreditCard, AlertTriangle, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { Separator } from "@/components/ui/separator";

const STRIPE_PK =
  (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined) ??
  "pk_live_51SXnhgHTQ1AOHDjnp60RxgrJIjsN0a9UBJwlsnMuyo1VBM7yTp5t17JPbVRe3unBeCY3XcuhHX6J2FMddZtj7Gpd00wWlLicea";
const stripePromise = loadStripe(STRIPE_PK);

interface Props {
  businessId: string;
  compact?: boolean;
}

interface PaymentMethod {
  id: string;
  stripe_payment_method_id: string;
  stripe_customer_id: string;
  card_brand: string | null;
  card_last4: string | null;
  card_exp_month: number | null;
  card_exp_year: number | null;
}

interface BillingAttempt {
  id: string;
  amount_cents: number;
  sms_count: number;
  status: "success" | "failed";
  trigger_type: string;
  error_message: string | null;
  attempted_at: string;
}

export default function BillingSmsPage({ businessId, compact = false }: Props) {
  const { language } = useLanguage();
  const t = useMemo(() => translations[language], [language]);
  const [loading, setLoading] = useState(true);
  const [pm, setPm] = useState<PaymentMethod | null>(null);
  const [balance, setBalance] = useState<{ unbilled_cents: number; unbilled_count: number }>({
    unbilled_cents: 0,
    unbilled_count: 0,
  });
  const [attempts, setAttempts] = useState<BillingAttempt[]>([]);
  const [paused, setPaused] = useState<{ paused: boolean; reason: string | null }>({
    paused: false,
    reason: null,
  });
  const [setupClientSecret, setSetupClientSecret] = useState<string | null>(null);
  const [setupCustomerId, setSetupCustomerId] = useState<string | null>(null);
  const [showAddCard, setShowAddCard] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const [pmRes, balRes, attRes, bizRes] = await Promise.all([
        supabase
          .from("business_payment_methods")
          .select("id, stripe_payment_method_id, stripe_customer_id, card_brand, card_last4, card_exp_month, card_exp_year")
          .eq("business_id", businessId)
          .eq("is_active", true)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.rpc("get_my_sms_balance", { p_business_id: businessId }),
        supabase
          .from("sms_billing_attempts")
          .select("id, amount_cents, sms_count, status, trigger_type, error_message, attempted_at")
          .eq("business_id", businessId)
          .order("attempted_at", { ascending: false })
          .limit(20),
        supabase
          .from("businesses")
          .select("sms_sending_paused, sms_paused_reason")
          .eq("id", businessId)
          .maybeSingle(),
      ]);
      setPm((pmRes.data as PaymentMethod | null) ?? null);
      const b = Array.isArray(balRes.data) ? balRes.data[0] : balRes.data;
      setBalance({
        unbilled_cents: Number(b?.unbilled_cents ?? 0),
        unbilled_count: Number(b?.unbilled_count ?? 0),
      });
      setAttempts((attRes.data as BillingAttempt[] | null) ?? []);
      setPaused({
        paused: !!bizRes.data?.sms_sending_paused,
        reason: bizRes.data?.sms_paused_reason ?? null,
      });
    } catch (e) {
      console.error(e);
      toast.error(t.loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [businessId]);

  // Realtime: refresh balance + history immediately when an SMS is sent or its status changes
  useEffect(() => {
    if (!businessId) return;
    const channel = supabase
      .channel(`sms-billing-${businessId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sms_charges", filter: `business_id=eq.${businessId}` },
        () => {
          refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sms_billing_attempts", filter: `business_id=eq.${businessId}` },
        () => {
          refresh();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  const handleAddCard = async () => {
    try {
      if (!STRIPE_PK) {
        toast.error(t.stripeMissing);
        return;
      }
      const { data, error } = await supabase.functions.invoke("create-sms-setup-intent", {
        body: { business_id: businessId },
      });
      if (error) throw error;
      setSetupClientSecret(data.client_secret);
      setSetupCustomerId(data.customer_id);
      setShowAddCard(true);
    } catch (e: any) {
      toast.error(e?.message ?? t.error);
    }
  };

  const handleDeleteCard = async () => {
    if (!pm) return;
    if (!confirm(t.confirmDelete)) return;
    try {
      const { error } = await supabase.functions.invoke("delete-sms-payment-method", {
        body: { business_id: businessId, payment_method_id: pm.stripe_payment_method_id },
      });
      if (error) throw error;
      toast.success(t.deleted);
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? t.error);
    }
  };

  const onSaveDone = async () => {
    setShowAddCard(false);
    setSetupClientSecret(null);
    setSetupCustomerId(null);
    await refresh();
  };

  if (compact) {
    return (
      <div className="space-y-3">
        {paused.paused && paused.reason === "payment_failed" && (
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            <AlertTitle className="text-xs sm:text-sm">{t.pausedTitle}</AlertTitle>
            <AlertDescription className="text-[11px] sm:text-xs">{t.pausedDesc}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
              {t.title}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">{t.subtitle}</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
            {/* Card on file */}
            <div>
              <p className="text-xs sm:text-sm font-medium mb-2">{t.cardOnFile}</p>
              {loading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t.loading}
                </div>
              ) : pm ? (
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="px-2 py-0.5 rounded border text-[10px] sm:text-xs font-medium uppercase">
                      {pm.card_brand ?? "card"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono text-xs sm:text-sm truncate">•••• {pm.card_last4}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {String(pm.card_exp_month).padStart(2, "0")}/{pm.card_exp_year}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={handleAddCard}>
                      {t.update}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleDeleteCard}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-xs text-muted-foreground">{t.noCard}</p>
                  <Button size="sm" className="h-7 text-xs px-3" onClick={handleAddCard}>{t.addCard}</Button>
                </div>
              )}

              {showAddCard && setupClientSecret && stripePromise && (
                <div className="mt-3 border-t pt-3">
                  <Elements stripe={stripePromise} options={{ clientSecret: setupClientSecret }}>
                    <SetupCardForm
                      businessId={businessId}
                      customerId={setupCustomerId!}
                      onDone={onSaveDone}
                      onCancel={() => setShowAddCard(false)}
                      language={language}
                    />
                  </Elements>
                </div>
              )}
            </div>

            <Separator />

            {/* Balance */}
            <div>
              <p className="text-xs sm:text-sm font-medium">{t.balance}</p>
              <p className="text-[11px] sm:text-xs text-muted-foreground mb-1">{t.balanceDesc}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-bold">€{(balance.unbilled_cents / 100).toFixed(2)}</span>
                <span className="text-[11px] sm:text-xs text-muted-foreground">
                  ({balance.unbilled_count} SMS)
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{t.thresholdInfo}</p>
            </div>

            <Separator />

            {/* History */}
            <div>
              <p className="text-xs sm:text-sm font-medium mb-2">{t.history}</p>
              {attempts.length === 0 ? (
                <p className="text-[11px] sm:text-xs text-muted-foreground">{t.noHistory}</p>
              ) : (
                <div className="space-y-1.5">
                  {attempts.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-2 p-2 border rounded text-[11px] sm:text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {a.status === "success" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium">
                            €{(a.amount_cents / 100).toFixed(2)}{" "}
                            <span className="text-muted-foreground font-normal">
                              ({a.sms_count} SMS)
                            </span>
                          </p>
                          <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
                            {new Date(a.attempted_at).toLocaleString()} — {a.trigger_type}
                          </p>
                          {a.error_message && (
                            <p className="text-[10px] sm:text-[11px] text-destructive truncate">{a.error_message}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant={a.status === "success" ? "default" : "destructive"} className="text-[10px] px-1.5 py-0 h-4">
                        {a.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-0 py-4 max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      {paused.paused && paused.reason === "payment_failed" && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t.pausedTitle}</AlertTitle>
          <AlertDescription>{t.pausedDesc}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t.cardOnFile}
          </CardTitle>
          <CardDescription>{t.cardDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> {t.loading}
            </div>
          ) : pm ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 rounded border text-sm font-medium uppercase">
                  {pm.card_brand ?? "card"}
                </div>
                <div>
                  <p className="font-mono">•••• {pm.card_last4}</p>
                  <p className="text-xs text-muted-foreground">
                    {String(pm.card_exp_month).padStart(2, "0")}/{pm.card_exp_year}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleAddCard}>
                  {t.update}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDeleteCard}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{t.noCard}</p>
              <Button onClick={handleAddCard}>{t.addCard}</Button>
            </div>
          )}

          {showAddCard && setupClientSecret && stripePromise && (
            <div className="mt-4 border-t pt-4">
              <Elements stripe={stripePromise} options={{ clientSecret: setupClientSecret }}>
                <SetupCardForm
                  businessId={businessId}
                  customerId={setupCustomerId!}
                  onDone={onSaveDone}
                  onCancel={() => setShowAddCard(false)}
                  language={language}
                />
              </Elements>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.balance}</CardTitle>
          <CardDescription>{t.balanceDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">€{(balance.unbilled_cents / 100).toFixed(2)}</span>
            <span className="text-sm text-muted-foreground">
              ({balance.unbilled_count} SMS)
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{t.thresholdInfo}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.history}</CardTitle>
        </CardHeader>
        <CardContent>
          {attempts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noHistory}</p>
          ) : (
            <div className="space-y-2">
              {attempts.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-3 border rounded text-sm"
                >
                  <div className="flex items-center gap-3">
                    {a.status === "success" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    )}
                    <div>
                      <p className="font-medium">
                        €{(a.amount_cents / 100).toFixed(2)}{" "}
                        <span className="text-muted-foreground font-normal">
                          ({a.sms_count} SMS)
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.attempted_at).toLocaleString()} — {a.trigger_type}
                      </p>
                      {a.error_message && (
                        <p className="text-xs text-destructive">{a.error_message}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant={a.status === "success" ? "default" : "destructive"}>
                    {a.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SetupCardForm({
  businessId,
  customerId,
  onDone,
  onCancel,
  language,
}: {
  businessId: string;
  customerId: string;
  onDone: () => void;
  onCancel: () => void;
  language: "el" | "en";
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const t = translations[language];

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    try {
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: "if_required",
      });
      if (error) {
        toast.error(error.message ?? t.error);
        return;
      }
      const pmId =
        typeof setupIntent?.payment_method === "string"
          ? setupIntent.payment_method
          : setupIntent?.payment_method?.id;
      if (!pmId) {
        toast.error(t.error);
        return;
      }
      const { error: saveErr } = await supabase.functions.invoke("save-sms-payment-method", {
        body: {
          business_id: businessId,
          payment_method_id: pmId,
          customer_id: customerId,
        },
      });
      if (saveErr) throw saveErr;
      toast.success(t.saved);
      onDone();
    } catch (e: any) {
      toast.error(e?.message ?? t.error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <PaymentElement />
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          {t.cancel}
        </Button>
        <Button type="submit" disabled={submitting || !stripe}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {t.save}
        </Button>
      </div>
    </form>
  );
}

const translations = {
  el: {
    title: "Χρεώσεις & SMS",
    subtitle: "Διαχείριση κάρτας και ιστορικό αυτόματων χρεώσεων για SMS πελατών.",
    pausedTitle: "Η αποστολή SMS είναι σε παύση",
    pausedDesc:
      "Μετά από 3 αποτυχημένες προσπάθειες χρέωσης, παγώσαμε προσωρινά την αποστολή SMS. Ενημερώστε την κάρτα σας για να ενεργοποιηθεί ξανά αυτόματα.",
    cardOnFile: "Αποθηκευμένη κάρτα",
    cardDesc: "Η κάρτα που χρεώνεται αυτόματα για τα SMS που στέλνετε στους πελάτες.",
    loading: "Φόρτωση...",
    noCard: "Δεν υπάρχει αποθηκευμένη κάρτα.",
    addCard: "Προσθήκη κάρτας",
    update: "Ενημέρωση",
    confirmDelete: "Σίγουρα θέλετε να διαγράψετε την κάρτα;",
    deleted: "Η κάρτα διαγράφηκε.",
    saved: "Η κάρτα αποθηκεύτηκε.",
    cancel: "Άκυρο",
    save: "Αποθήκευση",
    balance: "Τρέχον υπόλοιπο SMS",
    balanceDesc: "Μη χρεωμένα SMS μέχρι στιγμής.",
    thresholdInfo:
      "Η χρέωση γίνεται αυτόματα όταν φτάσετε τα €10 ή στην 1η κάθε μήνα για ό,τι έχει συσσωρευτεί.",
    history: "Ιστορικό χρεώσεων",
    noHistory: "Δεν υπάρχουν χρεώσεις ακόμα.",
    error: "Παρουσιάστηκε σφάλμα.",
    loadError: "Σφάλμα φόρτωσης.",
    stripeMissing: "Λείπει η ρύθμιση Stripe (publishable key).",
  },
  en: {
    title: "Billing & SMS",
    subtitle: "Manage card and view automatic SMS billing history.",
    pausedTitle: "SMS sending is paused",
    pausedDesc:
      "After 3 failed charge attempts we paused SMS sending. Update your card to re-enable automatically.",
    cardOnFile: "Card on file",
    cardDesc: "The card automatically charged for SMS sent to customers.",
    loading: "Loading...",
    noCard: "No card saved.",
    addCard: "Add card",
    update: "Update",
    confirmDelete: "Delete this card?",
    deleted: "Card deleted.",
    saved: "Card saved.",
    cancel: "Cancel",
    save: "Save",
    balance: "Current SMS balance",
    balanceDesc: "Unbilled SMS so far.",
    thresholdInfo:
      "We charge automatically when you reach €10, or on the 1st of each month for whatever has accumulated.",
    history: "Billing history",
    noHistory: "No billing attempts yet.",
    error: "Something went wrong.",
    loadError: "Failed to load.",
    stripeMissing: "Stripe publishable key not configured.",
  },
} as const;

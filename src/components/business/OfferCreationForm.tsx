import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, AlertTriangle, CheckCircle2, Clock, CalendarCheck, Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/hooks/useLanguage";
import { businessTranslations } from "./translations";
import { validationTranslations, formatValidationMessage } from "@/translations/validationTranslations";
import { toastTranslations } from "@/translations/toastTranslations";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import OfferBoostSection from "./OfferBoostSection";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { MultiItemOfferEditor, MultiItemOfferData, PricingType } from "./offers";
import { OfferTypeSelector, OfferType } from "./offers/OfferTypeSelector";
import { CreditOfferFields } from "./offers/CreditOfferFields";

const createOfferSchema = (language: 'el' | 'en') => {
  const v = validationTranslations[language];
  
  return z.object({
    title: z.string().trim().min(3, formatValidationMessage(v.minLength, { min: 3 })).max(100, formatValidationMessage(v.maxLength, { max: 100 })),
    description: z.string().trim().max(500, formatValidationMessage(v.maxLength, { max: 500 })).optional(),
    // original_price is optional for multi-item offers (bundle/itemized)
    original_price: z.coerce.number().min(0.01, language === 'el' ? "Η τιμή πρέπει να είναι τουλάχιστον €0.01" : "Price must be at least €0.01").optional(),
    percent_off: z.coerce.number().min(1, formatValidationMessage(v.minValue, { min: 1 })).max(99, formatValidationMessage(v.maxValue, { max: 99 })),
    max_purchases: z.coerce.number().min(1).optional().nullable(),
    max_per_user: z.coerce.number().min(1).default(1),
    start_at: z.string().min(1, language === 'el' ? "Η ημερομηνία έναρξης είναι υποχρεωτική" : "Start date is required")
      .refine((val) => new Date(val) >= new Date(new Date().setHours(0, 0, 0, 0)), {
        message: language === 'el' ? "Η ημερομηνία έναρξης δεν μπορεί να είναι στο παρελθόν" : "Start date cannot be in the past"
      }),
    end_at: z.string().min(1, language === 'el' ? "Η ημερομηνία λήξης είναι υποχρεωτική" : "End date is required"),
    terms: z.string().trim().max(500, formatValidationMessage(v.maxLength, { max: 500 })).optional(),
  }).refine((data) => new Date(data.end_at) > new Date(data.start_at), {
    message: language === 'el' ? "Η ημερομηνία λήξης πρέπει να είναι μετά την ημερομηνία έναρξης" : "End date must be after start date",
    path: ["end_at"],
  });
};

type OfferFormData = z.infer<ReturnType<typeof createOfferSchema>>;

interface OfferCreationFormProps {
  businessId: string;
}

// Duration presets
type DurationPreset = '1h' | '2h' | '3h' | '6h' | 'same_day' | '1w' | '1m' | 'custom';

const durationPresets: { key: DurationPreset; labelEl: string; labelEn: string }[] = [
  { key: '1h', labelEl: '1 ώρα', labelEn: '1 hour' },
  { key: '2h', labelEl: '2 ώρες', labelEn: '2 hours' },
  { key: '3h', labelEl: '3 ώρες', labelEn: '3 hours' },
  { key: '6h', labelEl: '6 ώρες', labelEn: '6 hours' },
  { key: 'same_day', labelEl: 'Ίδια μέρα', labelEn: 'Same day' },
  { key: '1w', labelEl: '1 εβδομάδα', labelEn: '1 week' },
  { key: '1m', labelEl: '1 μήνας', labelEn: '1 month' },
  { key: 'custom', labelEl: 'Προσαρμοσμένο', labelEn: 'Custom' },
];

// Calculate end date from start date and duration
const calculateEndDate = (startDate: Date, duration: DurationPreset): Date => {
  const endDate = new Date(startDate);
  
  switch (duration) {
    case '1h':
      endDate.setHours(endDate.getHours() + 1);
      break;
    case '2h':
      endDate.setHours(endDate.getHours() + 2);
      break;
    case '3h':
      endDate.setHours(endDate.getHours() + 3);
      break;
    case '6h':
      endDate.setHours(endDate.getHours() + 6);
      break;
    case 'same_day':
      endDate.setHours(23, 59, 0, 0);
      break;
    case '1w':
      endDate.setDate(endDate.getDate() + 7);
      break;
    case '1m':
      endDate.setDate(endDate.getDate() + 30);
      break;
    default:
      // Custom - don't change
      break;
  }
  
  return endDate;
};

// Helper to get default dates (now defaults to same_day)
const getDefaultDates = () => {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setHours(now.getHours() + 1, 0, 0, 0); // Start in 1 hour
  
  // Default to same day (end at 23:59)
  const endDate = new Date(startDate);
  endDate.setHours(23, 59, 0, 0);
  
  return {
    start_at: startDate.toISOString(),
    end_at: endDate.toISOString(),
  };
};

const OfferCreationForm = ({ businessId }: OfferCreationFormProps) => {
  const { toast } = useToast();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const t = businessTranslations[language];
  const toastT = toastTranslations[language];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [validationShake, setValidationShake] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [durationPreset, setDurationPreset] = useState<DurationPreset>('same_day');
  
  // Requires reservation toggle
  const [requiresReservation, setRequiresReservation] = useState(false);

  // Boost data (aligned with event boost tiers)
  const [boostData, setBoostData] = useState<{
    enabled: boolean;
    tier: "basic" | "standard" | "premium" | "elite";
    startDate: Date;
    endDate: Date;
    totalCostCents: number;
    dailyRateCents: number;
    targetingQuality: number;
  }>({ 
    enabled: false, 
    tier: "basic",
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    totalCostCents: 0,
    dailyRateCents: 1500,
    targetingQuality: 50,
  });
  
  // Commission-free toggle (separate from boost)
  const [useCommissionFreeSlot, setUseCommissionFreeSlot] = useState(false);

  // Multi-item offer state
  const [multiItemData, setMultiItemData] = useState<MultiItemOfferData>({
    pricing_type: "single",
    items: [],
  });

  // Offer type state (regular vs credit)
  const [offerType, setOfferType] = useState<OfferType>('regular');
  const [creditAmountCents, setCreditAmountCents] = useState(0);
  const [bonusPercent, setBonusPercent] = useState(25); // Default 25% bonus

  // Fetch subscription status
  const { data: subscriptionData } = useQuery({
    queryKey: ["subscription-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      return data;
    },
  });

  // Fetch business verification and Stripe status
  const { data: businessData, isLoading: isLoadingBusiness } = useQuery({
    queryKey: ["business-verification", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("verified, name, stripe_account_id, stripe_payouts_enabled, accepts_direct_reservations")
        .eq("id", businessId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const isBusinessVerified = businessData?.verified === true;
  const hasStripeSetup = !!businessData?.stripe_account_id && businessData?.stripe_payouts_enabled === true;
  const hasDirectReservations = businessData?.accepts_direct_reservations === true;

  // Get default dates
  const defaultDates = getDefaultDates();

  const form = useForm<OfferFormData>({
    resolver: zodResolver(createOfferSchema(language)),
    defaultValues: {
      title: "",
      description: "",
      original_price: undefined as unknown as number,
      percent_off: 20,
      max_purchases: null,
      max_per_user: 1,
      start_at: defaultDates.start_at,
      end_at: defaultDates.end_at,
      terms: "",
    },
  });

  // Scroll to first error field
  const scrollToFirstError = () => {
    const errors = form.formState.errors;
    const firstErrorKey = Object.keys(errors)[0];
    if (firstErrorKey && formRef.current) {
      const errorElement = formRef.current.querySelector(`[name="${firstErrorKey}"]`) ||
        formRef.current.querySelector(`[data-field="${firstErrorKey}"]`);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (errorElement as HTMLElement).focus?.();
      }
    }
  };

  // Trigger shake animation
  const triggerValidationShake = () => {
    setValidationShake(true);
    setTimeout(() => setValidationShake(false), 500);
  };

  const watchedPrice = form.watch("original_price");
  const watchedDiscount = form.watch("percent_off");
  
  // Calculate effective price based on pricing type
  const getEffectivePrice = () => {
    if (multiItemData.pricing_type === "bundle" && multiItemData.bundle_price_cents) {
      return multiItemData.bundle_price_cents / 100;
    }
    return watchedPrice || 0;
  };
  
  const effectivePrice = getEffectivePrice();
  const finalPrice = effectivePrice ? (effectivePrice * (100 - (watchedDiscount || 0)) / 100).toFixed(2) : "0.00";

  const generateQRToken = () => {
    return `${businessId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  };

  const onSubmit = async (data: OfferFormData) => {
    console.log("=== OFFER SUBMIT START ===");
    console.log("Data:", data);
    console.log("BusinessId:", businessId);
    
    setSubmitError(null);
    setSubmitSuccess(false);
    setIsSubmitting(true);
    
    try {
      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log("Auth check:", { user: user?.id, authError });
      
      if (!user) {
        throw new Error(language === 'el' ? "Παρακαλώ συνδεθείτε ξανά" : "Please log in again");
      }

      if (!businessId) {
        throw new Error(language === 'el' ? "Δεν βρέθηκε επιχείρηση" : "No business found");
      }

      // Determine the price based on offer type and pricing type
      let originalPriceCents: number;
      let discountPercent = data.percent_off;
      
      if (offerType === 'credit') {
        // For credit offers, original_price is the credit amount
        originalPriceCents = creditAmountCents;
        discountPercent = 0; // Credit offers use bonus_percent instead
      } else if (multiItemData.pricing_type === "bundle" && multiItemData.bundle_price_cents) {
        originalPriceCents = multiItemData.bundle_price_cents;
      } else {
        originalPriceCents = Math.round((data.original_price || 0) * 100);
      }

      console.log("Inserting discount...", { offerType, originalPriceCents, bonusPercent, requiresReservation });
      const { data: discountData, error } = await supabase.from('discounts').insert({
        business_id: businessId,
        title: data.title,
        description: data.description || null,
        original_price_cents: originalPriceCents,
        percent_off: discountPercent,
        max_purchases: data.max_purchases || null,
        max_per_user: data.max_per_user || 1,
        start_at: data.start_at,
        end_at: data.end_at,
        terms: data.terms || null,
        qr_code_token: generateQRToken(),
        active: true,
        pricing_type: multiItemData.pricing_type,
        bundle_price_cents: multiItemData.pricing_type === "bundle" ? multiItemData.bundle_price_cents : null,
        offer_type: offerType,
        bonus_percent: offerType === 'credit' ? bonusPercent : 0,
        credit_amount_cents: offerType === 'credit' ? creditAmountCents : null,
        requires_reservation: requiresReservation && hasDirectReservations,
      }).select().single();

      console.log("Insert result:", { discountData, error });

      if (error) {
        console.error("Supabase insert error:", error);
        // Check for RLS/permission errors
        if (error.code === '42501' || error.message?.includes('policy') || error.message?.includes('permission')) {
          throw new Error(language === 'el' 
            ? "Δεν έχετε δικαίωμα δημοσίευσης προσφορών. Η επιχείρησή σας πρέπει να είναι επαληθευμένη." 
            : "You don't have permission to publish offers. Your business must be verified.");
        }
        throw error;
      }

      // Insert items if this is a bundle offer
      if (multiItemData.pricing_type === "bundle" && multiItemData.items.length > 0 && discountData) {
        console.log("Inserting discount items...");
        
        for (const item of multiItemData.items) {
          const { error: itemError } = await supabase.from('discount_items').insert({
            discount_id: discountData.id,
            name: item.name,
            description: item.description || null,
            sort_order: item.sort_order,
          });

          if (itemError) {
            console.error("Item insert error:", itemError);
          }
        }
      }

      // Handle commission-free slot (deduct from subscription if used)
      if (useCommissionFreeSlot && discountData) {
        console.log("Setting commission-free status...");
        // Update the discount to be commission-free
        const { error: updateError } = await supabase
          .from('discounts')
          .update({ commission_free: true })
          .eq('id', discountData.id);

        if (updateError) {
          console.error("Commission-free update error:", updateError);
        }

        // Deduct from subscription's commission_free_offers_remaining
        const { error: subError } = await supabase
          .from('business_subscriptions')
          .update({
            commission_free_offers_remaining: Math.max(0, (subscriptionData?.commission_free_offers_remaining || 0) - 1),
          })
          .eq('business_id', businessId);

        if (subError) {
          console.error("Subscription update error:", subError);
        }
      }

      // Create boost if enabled (aligned with event boost tiers)
      if (boostData.enabled && discountData) {
        console.log("Creating visibility boost...");
        
        // Check if subscription budget can be used
        const remainingBudget = subscriptionData?.monthly_budget_remaining_cents || 0;
        const canUseSubscriptionBudget = subscriptionData?.subscribed && remainingBudget >= boostData.totalCostCents;
        
        const { data: boostResult, error: boostError } = await supabase.functions.invoke("create-offer-boost", {
          body: {
            discountId: discountData.id,
            tier: boostData.tier,
            startDate: boostData.startDate.toISOString().split("T")[0],
            endDate: boostData.endDate.toISOString().split("T")[0],
            useSubscriptionBudget: canUseSubscriptionBudget,
          },
        });

        if (boostError) {
          console.error("Boost creation error:", boostError);
          toast({
            title: language === "el" ? "Προειδοποίηση" : "Warning",
            description: language === "el" 
              ? "Η προσφορά δημιουργήθηκε αλλά η προώθηση απέτυχε." 
              : "Offer created but boost activation failed.",
            variant: "destructive",
          });
        } else if (boostResult?.needsPayment) {
          // Redirect to Stripe checkout for boost payment
          console.log("Boost requires payment, creating checkout...");
          // For now, we'll skip payment flow and just log it
          // In full implementation, you'd redirect to a checkout page
          toast({
            title: language === "el" ? "Πληρωμή απαιτείται" : "Payment required",
            description: language === "el" 
              ? `Η προώθηση κοστίζει €${(boostResult.totalCostCents / 100).toFixed(2)}. Μπορείτε να την ενεργοποιήσετε από τη λίστα προσφορών.` 
              : `Boost costs €${(boostResult.totalCostCents / 100).toFixed(2)}. You can activate it from the offers list.`,
          });
        }
      }

      console.log("=== OFFER SUBMIT SUCCESS ===");
      setSubmitSuccess(true);
      
      toast({
        title: toastT.success,
        description: toastT.offerCreated,
      });

      form.reset();
      setBoostData({ 
        enabled: false, 
        tier: "basic",
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        totalCostCents: 0,
        dailyRateCents: 1500,
        targetingQuality: 50,
      });
      setUseCommissionFreeSlot(false);
      setMultiItemData({ pricing_type: "single", items: [] });
      setOfferType('regular');
      setCreditAmountCents(0);
      setBonusPercent(25);
      setRequiresReservation(false);
      
      // Navigate to offers list after short delay
      setTimeout(() => {
        navigate('/dashboard-business/offers');
      }, 1500);
      
    } catch (error: unknown) {
      console.error("=== OFFER SUBMIT ERROR ===", error);
      const errorMessage = error instanceof Error ? error.message : toastT.createFailed;
      setSubmitError(errorMessage);
      toast({
        title: toastT.error,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.createOffer}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Verification Warning */}
        {!isLoadingBusiness && !isBusinessVerified && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
              {language === 'el' ? 'Η επιχείρησή σας δεν έχει επαληθευτεί' : 'Your business is not verified'}
            </AlertTitle>
            <AlertDescription>
              {language === 'el' 
                ? 'Δεν μπορείτε να δημοσιεύσετε προσφορές μέχρι να επαληθευτεί η επιχείρησή σας. Επικοινωνήστε με την υποστήριξη για περισσότερες πληροφορίες.' 
                : 'You cannot publish offers until your business is verified. Contact support for more information.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Stripe Setup Warning */}
        {!isLoadingBusiness && isBusinessVerified && !hasStripeSetup && (
          <Alert className="mb-6 border-amber-500 bg-amber-50 dark:bg-amber-900/20">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-200">
              {language === 'el' ? 'Ρύθμιση πληρωμών απαιτείται' : 'Payment setup required'}
            </AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              {language === 'el' 
                ? 'Για να λαμβάνετε πληρωμές από πωλήσεις προσφορών, πρέπει να ολοκληρώσετε τη ρύθμιση Stripe στις Ρυθμίσεις > Πληρωμές.' 
                : 'To receive payments from offer sales, you need to complete Stripe setup in Settings > Payments.'}
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form 
            ref={formRef}
            onSubmit={form.handleSubmit(onSubmit, (errors) => {
              console.error("=== FORM VALIDATION FAILED ===");
              console.error("Validation errors:", errors);
              console.log("Current form values:", form.getValues());
              
              // Build detailed error message
              const errorMessages = Object.entries(errors).map(([field, error]) => {
                return `${field}: ${error?.message}`;
              });
              console.error("Error details:", errorMessages);
              
              const firstError = Object.values(errors)[0];
              const errorMessage = firstError?.message || (language === 'el' 
                ? "Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία" 
                : "Please fill in all required fields");
              
              setSubmitError(errorMessage as string);
              triggerValidationShake();
              
              // Show toast with error
              toast({
                title: toastT.error,
                description: errorMessage as string,
                variant: "destructive",
              });
              
              // Scroll to first error after a brief delay
              setTimeout(scrollToFirstError, 100);
            })} 
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.offerTitle} *</FormLabel>
                  <FormControl>
                    <Input placeholder={t.offerTitlePlaceholder} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.description}</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={t.offerDescPlaceholder}
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Offer Type Selector */}
            <OfferTypeSelector
              value={offerType}
              onChange={setOfferType}
              language={language}
            />

            <Separator />

            {/* Credit Offer Fields */}
            {offerType === 'credit' && (
              <>
                <CreditOfferFields
                  creditAmountCents={creditAmountCents}
                  bonusPercent={bonusPercent}
                  onCreditAmountChange={setCreditAmountCents}
                  onBonusPercentChange={setBonusPercent}
                  language={language}
                />
                <Separator />
              </>
            )}

            {/* Multi-Item Offer Editor - only for regular offers */}
            {offerType === 'regular' && (
              <>
                <MultiItemOfferEditor
                  data={multiItemData}
                  onChange={setMultiItemData}
                  language={language}
                />
                <Separator />
              </>
            )}

            {/* Original Price - only show for single item regular offers */}
            {offerType === 'regular' && multiItemData.pricing_type === "single" && (
              <FormField
                control={form.control}
                name="original_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{language === 'el' ? 'Αρχική Τιμή (€)' : 'Original Price (€)'} *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        min="0.01"
                        placeholder="10.00"
                        required
                        value={field.value || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          field.onChange(isNaN(val) ? undefined : val);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Discount Percent - only for regular offers */}
            {offerType === 'regular' && (
              <FormField
                control={form.control}
                name="percent_off"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.discountPercent} *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1"
                        max="99"
                        placeholder="20"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Price Preview - updated for all pricing types */}
            {effectivePrice > 0 && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{language === 'el' ? 'Αρχική τιμή' : 'Original price'}</span>
                  <span className="line-through">€{effectivePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{language === 'el' ? 'Έκπτωση' : 'Discount'}</span>
                  <span className="text-green-600">-{watchedDiscount}%</span>
                </div>
                <div className="flex justify-between font-semibold text-lg border-t pt-2">
                  <span>{language === 'el' ? 'Ο πελάτης πληρώνει' : 'Customer pays'}</span>
                  <span className="text-primary">€{finalPrice}</span>
                </div>
                {multiItemData.pricing_type !== "single" && multiItemData.items.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {multiItemData.items.length} {language === 'el' ? 'προϊόντα' : 'items'}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="max_purchases"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{language === 'el' ? 'Μέγ. Αγορές (προαιρετικό)' : 'Max Purchases (optional)'}</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1"
                        placeholder={language === 'el' ? 'Απεριόριστες' : 'Unlimited'}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="max_per_user"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{language === 'el' ? 'Μέγ. ανά Χρήστη' : 'Max Per User'}</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1"
                        placeholder="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Duration Section */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                {language === 'el' ? 'Διάρκεια Προσφοράς' : 'Offer Duration'}
              </Label>
              <div className="flex flex-wrap gap-2">
                {durationPresets.map((preset) => (
                  <Button
                    key={preset.key}
                    type="button"
                    variant={durationPreset === preset.key ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setDurationPreset(preset.key);
                      if (preset.key !== 'custom') {
                        const startAt = form.getValues('start_at');
                        const startDate = startAt ? new Date(startAt) : new Date();
                        const endDate = calculateEndDate(startDate, preset.key);
                        form.setValue('end_at', endDate.toISOString(), { shouldValidate: true });
                      }
                    }}
                    className="text-xs sm:text-sm"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    {language === 'el' ? preset.labelEl : preset.labelEn}
                  </Button>
                ))}
              </div>
              
              {/* Show calculated end time for non-custom */}
              {durationPreset !== 'custom' && form.watch('end_at') && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {language === 'el' ? 'Λήγει:' : 'Ends:'}{' '}
                  {new Date(form.watch('end_at')).toLocaleString(language === 'el' ? 'el-GR' : 'en-GB', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>

            <FormField
              control={form.control}
              name="start_at"
              render={({ field }) => (
                <FormItem data-field="start_at">
                  <FormLabel>{t.startDate} *</FormLabel>
                  <FormControl>
                    <DateTimePicker
                      value={field.value ? new Date(field.value) : undefined}
                      onChange={(date) => {
                        field.onChange(date?.toISOString() || "");
                        // Auto-update end date if not custom
                        if (durationPreset !== 'custom' && date) {
                          const endDate = calculateEndDate(date, durationPreset);
                          form.setValue('end_at', endDate.toISOString(), { shouldValidate: true });
                        }
                      }}
                      placeholder={language === 'el' ? "Επιλέξτε ημερομηνία έναρξης" : "Select start date"}
                      minDate={new Date()}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Only show end date picker for custom duration */}
            {durationPreset === 'custom' && (
              <FormField
                control={form.control}
                name="end_at"
                render={({ field }) => (
                  <FormItem data-field="end_at">
                    <FormLabel>{t.endDate} *</FormLabel>
                    <FormControl>
                      <DateTimePicker
                        value={field.value ? new Date(field.value) : undefined}
                        onChange={(date) => field.onChange(date?.toISOString() || "")}
                        placeholder={language === 'el' ? "Επιλέξτε ημερομηνία λήξης" : "Select end date"}
                        minDate={new Date()}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="terms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.termsConditions}</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={t.termsPlaceholder}
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Requires Reservation Toggle */}
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-medium">
                    {language === 'el' ? 'Απαιτείται Κράτηση' : 'Require Reservation'}
                  </Label>
                </div>
                <Switch
                  checked={requiresReservation}
                  onCheckedChange={setRequiresReservation}
                  disabled={!hasDirectReservations}
                />
              </div>
              
              {hasDirectReservations ? (
                <p className="text-sm text-muted-foreground">
                  {language === 'el'
                    ? 'Οι πελάτες θα πρέπει να κάνουν κράτηση τραπεζιού κατά την αγορά αυτής της προσφοράς'
                    : 'Customers must book a table when purchasing this offer'}
                </p>
              ) : (
                <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                  <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    {language === 'el'
                      ? 'Ενεργοποιήστε τις άμεσες κρατήσεις στις Ρυθμίσεις Προφίλ για να χρησιμοποιήσετε αυτή τη λειτουργία'
                      : 'Enable direct reservations in Profile Settings to use this feature'}
                  </p>
                </div>
              )}
              
              {requiresReservation && hasDirectReservations && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-sm text-primary/90">
                    {language === 'el'
                      ? '📅 Οι κρατήσεις θα χρεώνονται από τη διαθέσιμη χωρητικότητά σας'
                      : '📅 Reservations will count against your available capacity'}
                  </p>
                </div>
              )}
            </div>

            {/* COMMISSION DISABLED: All offers are commission-free
            Commission-Free Section and Platform Fee Notice hidden until commission is re-enabled */}

            {/* Boost Section (aligned with event boost tiers) */}
            <OfferBoostSection
              onBoostChange={setBoostData}
              hasActiveSubscription={subscriptionData?.subscribed || false}
              remainingBudgetCents={subscriptionData?.monthly_budget_remaining_cents || 0}
            />

            {/* Success State */}
            {submitSuccess && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800 dark:text-green-200">
                  {language === 'el' ? 'Επιτυχία!' : 'Success!'}
                </AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-300">
                  {language === 'el' 
                    ? 'Η προσφορά δημοσιεύτηκε. Ανακατεύθυνση στη λίστα προσφορών...' 
                    : 'Offer published. Redirecting to offers list...'}
                </AlertDescription>
              </Alert>
            )}

            {/* Visible Error State - Placed right above button for visibility */}
            {submitError && (
              <Alert variant="destructive" className="animate-in fade-in-0 slide-in-from-top-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{language === 'el' ? 'Σφάλμα' : 'Error'}</AlertTitle>
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            {/* Disabled Reason */}
            {!isLoadingBusiness && !isBusinessVerified && (
              <p className="text-sm text-destructive text-center font-medium">
                {language === 'el' 
                  ? '⚠️ Το κουμπί είναι απενεργοποιημένο επειδή η επιχείρησή σας δεν έχει επαληθευτεί' 
                  : '⚠️ Button is disabled because your business is not verified'}
              </p>
            )}

            <Button 
              type="submit" 
              className={cn(
                "w-full transition-all",
                validationShake && "animate-[shake_0.5s_ease-in-out] ring-2 ring-destructive"
              )}
              disabled={isSubmitting || (!isLoadingBusiness && !isBusinessVerified) || submitSuccess}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.publishing}
                </>
              ) : submitSuccess ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {language === 'el' ? 'Δημοσιεύτηκε!' : 'Published!'}
                </>
              ) : (
                t.publishOffer
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default OfferCreationForm;

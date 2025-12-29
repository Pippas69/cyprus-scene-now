import { useState } from "react";
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
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { businessTranslations } from "./translations";
import { validationTranslations, formatValidationMessage } from "@/translations/validationTranslations";
import { toastTranslations } from "@/translations/toastTranslations";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import OfferBoostSection from "./OfferBoostSection";
import { useQuery } from "@tanstack/react-query";

const createOfferSchema = (language: 'el' | 'en') => {
  const v = validationTranslations[language];
  
  return z.object({
    title: z.string().trim().min(3, formatValidationMessage(v.minLength, { min: 3 })).max(100, formatValidationMessage(v.maxLength, { max: 100 })),
    description: z.string().trim().max(500, formatValidationMessage(v.maxLength, { max: 500 })).optional(),
    original_price: z.number().min(0.01, language === 'el' ? "Η τιμή πρέπει να είναι τουλάχιστον €0.01" : "Price must be at least €0.01"),
    percent_off: z.number().min(1, formatValidationMessage(v.minValue, { min: 1 })).max(99, formatValidationMessage(v.maxValue, { max: 99 })),
    max_purchases: z.number().min(1).optional().nullable(),
    max_per_user: z.number().min(1).default(1),
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

const OfferCreationForm = ({ businessId }: OfferCreationFormProps) => {
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = businessTranslations[language];
  const toastT = toastTranslations[language];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [boostData, setBoostData] = useState<{
    enabled: boolean;
    commissionPercent: number;
    useCommissionFreeSlot: boolean;
  }>({ enabled: false, commissionPercent: 10, useCommissionFreeSlot: false });

  // Fetch subscription status
  const { data: subscriptionData } = useQuery({
    queryKey: ["subscription-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<OfferFormData>({
    resolver: zodResolver(createOfferSchema(language)),
    defaultValues: {
      title: "",
      description: "",
      original_price: 0,
      percent_off: 20,
      max_purchases: null,
      max_per_user: 1,
      start_at: "",
      end_at: "",
      terms: "",
    },
  });

  const watchedPrice = form.watch("original_price");
  const watchedDiscount = form.watch("percent_off");
  const finalPrice = watchedPrice ? (watchedPrice * (100 - (watchedDiscount || 0)) / 100).toFixed(2) : "0.00";

  const generateQRToken = () => {
    return `${businessId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  };

  const onSubmit = async (data: OfferFormData) => {
    setIsSubmitting(true);
    try {
      const { data: discountData, error } = await supabase.from('discounts').insert({
        business_id: businessId,
        title: data.title,
        description: data.description || null,
        original_price_cents: Math.round(data.original_price * 100),
        percent_off: data.percent_off,
        max_purchases: data.max_purchases || null,
        max_per_user: data.max_per_user || 1,
        start_at: data.start_at,
        end_at: data.end_at,
        terms: data.terms || null,
        qr_code_token: generateQRToken(),
        active: true,
      }).select().single();

      if (error) throw error;

      // Create boost if enabled
      if (boostData.enabled && discountData) {
        const { error: boostError } = await supabase.functions.invoke("create-offer-boost", {
          body: {
            discountId: discountData.id,
            commissionPercent: boostData.commissionPercent,
            useCommissionFreeSlot: boostData.useCommissionFreeSlot,
          },
        });

        if (boostError) {
          console.error("Boost creation error:", boostError);
        }
      }

      toast({
        title: toastT.success,
        description: toastT.offerCreated,
      });

      form.reset();
      setBoostData({ enabled: false, commissionPercent: 10, useCommissionFreeSlot: false });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : toastT.createFailed;
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            {/* Price Preview */}
            {watchedPrice > 0 && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{language === 'el' ? 'Αρχική τιμή' : 'Original price'}</span>
                  <span className="line-through">€{watchedPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{language === 'el' ? 'Έκπτωση' : 'Discount'}</span>
                  <span className="text-green-600">-{watchedDiscount}%</span>
                </div>
                <div className="flex justify-between font-semibold text-lg border-t pt-2">
                  <span>{language === 'el' ? 'Ο πελάτης πληρώνει' : 'Customer pays'}</span>
                  <span className="text-primary">€{finalPrice}</span>
                </div>
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
                name="start_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.startDate} *</FormLabel>
                    <FormControl>
                      <DateTimePicker
                        value={field.value ? new Date(field.value) : undefined}
                        onChange={(date) => field.onChange(date?.toISOString() || "")}
                        placeholder={language === 'el' ? "Επιλέξτε ημερομηνία έναρξης" : "Select start date"}
                        minDate={new Date()}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_at"
                render={({ field }) => (
                  <FormItem>
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
            </div>

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

            {/* Boost Section */}
            <OfferBoostSection
              hasActiveSubscription={subscriptionData?.subscribed || false}
              remainingCommissionFreeOffers={subscriptionData?.commission_free_offers_remaining || 0}
              onBoostChange={setBoostData}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.publishing}
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

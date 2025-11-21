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

const createOfferSchema = (language: 'el' | 'en') => {
  const v = validationTranslations[language];
  
  return z.object({
    title: z.string().trim().min(3, formatValidationMessage(v.minLength, { min: 3 })).max(100, formatValidationMessage(v.maxLength, { max: 100 })),
    description: z.string().trim().max(500, formatValidationMessage(v.maxLength, { max: 500 })).optional(),
    percent_off: z.number().min(1, formatValidationMessage(v.minValue, { min: 1 })).max(100, formatValidationMessage(v.maxValue, { max: 100 })),
    start_at: z.string().min(1, language === 'el' ? "Η ημερομηνία έναρξης είναι υποχρεωτική" : "Start date is required"),
    end_at: z.string().min(1, language === 'el' ? "Η ημερομηνία λήξης είναι υποχρεωτική" : "End date is required"),
    terms: z.string().trim().max(500, formatValidationMessage(v.maxLength, { max: 500 })).optional(),
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

  const form = useForm<OfferFormData>({
    resolver: zodResolver(createOfferSchema(language)),
    defaultValues: {
      title: "",
      description: "",
      percent_off: 10,
      start_at: "",
      end_at: "",
      terms: "",
    },
  });

  const generateQRToken = () => {
    return `${businessId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  };

  const onSubmit = async (data: OfferFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('discounts').insert({
        business_id: businessId,
        title: data.title,
        description: data.description || null,
        percent_off: data.percent_off,
        start_at: data.start_at,
        end_at: data.end_at,
        terms: data.terms || null,
        qr_code_token: generateQRToken(),
        active: true,
      });

      if (error) throw error;

      toast({
        title: toastT.success,
        description: toastT.offerCreated,
      });

      form.reset();
    } catch (error: any) {
      toast({
        title: toastT.error,
        description: error.message || toastT.createFailed,
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
              name="percent_off"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.discountPercent} *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="1"
                      max="100"
                      placeholder="20"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.startDate} *</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
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
                      <Input type="datetime-local" {...field} />
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

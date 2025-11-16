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

const createOfferSchema = (language: 'el' | 'en') => {
  const validationMessages = {
    el: {
      titleMin: "Ο τίτλος πρέπει να έχει τουλάχιστον 3 χαρακτήρες",
      discountMin: "Η έκπτωση πρέπει να είναι τουλάχιστον 1%",
      discountMax: "Η έκπτωση δεν μπορεί να υπερβαίνει το 100%",
      startRequired: "Η ημερομηνία έναρξης είναι υποχρεωτική",
      endRequired: "Η ημερομηνία λήξης είναι υποχρεωτική",
    },
    en: {
      titleMin: "Title must be at least 3 characters",
      discountMin: "Discount must be at least 1%",
      discountMax: "Discount cannot exceed 100%",
      startRequired: "Start date is required",
      endRequired: "End date is required",
    },
  };
  
  const msg = validationMessages[language];
  
  return z.object({
    title: z.string().trim().min(3, msg.titleMin).max(100),
    description: z.string().trim().max(500).optional(),
    percent_off: z.number().min(1, msg.discountMin).max(100, msg.discountMax),
    start_at: z.string().min(1, msg.startRequired),
    end_at: z.string().min(1, msg.endRequired),
    terms: z.string().trim().max(500).optional(),
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
        title: t.success,
        description: t.offerCreatedSuccess,
      });

      form.reset();
    } catch (error: any) {
      toast({
        title: t.error,
        description: error.message || t.offerCreationError,
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

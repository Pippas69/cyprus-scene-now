import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { ImageUploadField } from "./ImageUploadField";
import { ImageCropDialog } from "./ImageCropDialog";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { compressImage } from "@/lib/imageCompression";
import { useLanguage } from "@/hooks/useLanguage";
import { businessTranslations, eventCategories, seatingOptions } from "./translations";
import { Switch } from "@/components/ui/switch";
import { validationTranslations, formatValidationMessage } from "@/translations/validationTranslations";
import { toastTranslations } from "@/translations/toastTranslations";

const createEventSchema = (language: 'el' | 'en') => {
  const v = validationTranslations[language];
  
  return z.object({
    title: z.string().trim().min(3, v.titleRequired).max(100, formatValidationMessage(v.maxLength, { max: 100 })),
    description: z.string().trim().min(10, formatValidationMessage(v.minLength, { min: 10 })).max(1000, formatValidationMessage(v.maxLength, { max: 1000 })),
    location: z.string().trim().min(3, v.locationRequired),
    start_at: z.string().min(1, language === 'el' ? "Η ημερομηνία έναρξης είναι υποχρεωτική" : "Start date is required")
      .refine((val) => new Date(val) >= new Date(new Date().setHours(0, 0, 0, 0)), {
        message: language === 'el' ? "Η ημερομηνία έναρξης δεν μπορεί να είναι στο παρελθόν" : "Start date cannot be in the past"
      }),
    end_at: z.string().min(1, language === 'el' ? "Η ημερομηνία λήξης είναι υποχρεωτική" : "End date is required"),
    category: z.array(z.string()).min(1, v.categoryRequired),
    price_tier: z.enum(["free", "low", "medium", "high"]),
    min_age_hint: z.number().min(0).max(100).optional(),
    accepts_reservations: z.boolean().default(false),
    max_reservations: z.number().min(1, formatValidationMessage(v.minValue, { min: 1 })).optional(),
    requires_approval: z.boolean().default(true),
    seating_options: z.array(z.string()).optional(),
  }).refine((data) => new Date(data.end_at) > new Date(data.start_at), {
    message: language === 'el' ? "Η ημερομηνία λήξης πρέπει να είναι μετά την ημερομηνία έναρξης" : "End date must be after start date",
    path: ["end_at"],
  });
};

type EventFormData = z.infer<ReturnType<typeof createEventSchema>>;

interface EventCreationFormProps {
  businessId: string;
}

const EventCreationForm = ({ businessId }: EventCreationFormProps) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = businessTranslations[language];
  const toastT = toastTranslations[language];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string>("");
  const [tempImageFile, setTempImageFile] = useState<File | null>(null);

  const form = useForm<EventFormData>({
    resolver: zodResolver(createEventSchema(language)),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      start_at: "",
      end_at: "",
      category: [],
      price_tier: "free",
      min_age_hint: 0,
      accepts_reservations: false,
      max_reservations: undefined,
      requires_approval: true,
      seating_options: [],
    },
  });

  const handleFileSelect = (file: File) => {
    // Open crop dialog with the selected file
    const reader = new FileReader();
    reader.onload = () => {
      setTempImageSrc(reader.result as string);
      setTempImageFile(file);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    // Convert blob to File
    const croppedFile = new File(
      [croppedBlob],
      tempImageFile?.name || "cropped-image.jpg",
      { type: "image/jpeg" }
    );
    setCoverImage(croppedFile);
    setCropDialogOpen(false);
    setTempImageSrc("");
    setTempImageFile(null);
  };

  const onSubmit = async (data: EventFormData) => {
    setIsSubmitting(true);
    try {
      let coverImageUrl = null;

      // Upload cover image if provided
      if (coverImage) {
        try {
          setIsCompressing(true);
          
          // Compress image before upload (max 1920x1080, 85% quality)
          const compressedBlob = await compressImage(coverImage, 1920, 1080, 0.85);
          
          const fileName = `${businessId}-${Date.now()}.jpg`;
          
          const { error: uploadError } = await supabase.storage
            .from('event-covers')
            .upload(fileName, compressedBlob, {
              contentType: 'image/jpeg'
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('event-covers')
            .getPublicUrl(fileName);

          coverImageUrl = publicUrl;
          setIsCompressing(false);
        } catch (compressionError) {
          console.error('Error compressing image:', compressionError);
          setIsCompressing(false);
          toast.error(toastT.error, {
            description: language === 'el' ? "Αποτυχία συμπίεσης εικόνας" : "Failed to compress image"
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Create event
      const { error } = await supabase.from('events').insert({
        business_id: businessId,
        title: data.title,
        description: data.description,
        location: data.location,
        start_at: data.start_at,
        end_at: data.end_at,
        category: data.category,
        price_tier: data.price_tier,
        min_age_hint: data.min_age_hint || null,
        cover_image_url: coverImageUrl,
        accepts_reservations: data.accepts_reservations,
        max_reservations: data.max_reservations || null,
        requires_approval: data.requires_approval,
        seating_options: data.seating_options || [],
      });

      if (error) throw error;

      toast.success(toastT.success, {
        description: toastT.eventCreated
      });

      form.reset();
      setCoverImage(null);
      
      // Redirect to events list
      navigate('/dashboard-business/events');
    } catch (error: any) {
      toast.error(toastT.error, {
        description: error.message || toastT.eventCreateFailed
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.createEvent}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.eventTitle} *</FormLabel>
                  <FormControl>
                    <Input placeholder={language === 'el' ? "π.χ. Live Music Night" : "e.g. Live Music Night"} {...field} />
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
                  <FormLabel>{t.eventDescription} *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={language === 'el' ? "Περιγράψτε την εκδήλωσή σας..." : "Describe your event..."}
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cover Image Upload */}
            <div className="space-y-2">
              <ImageUploadField
                label={language === 'el' ? "Εικόνα Κάλυψης Εκδήλωσης" : "Event Cover Image"}
                language={language}
                onFileSelect={handleFileSelect}
                aspectRatio="16/9"
                maxSizeMB={5}
              />
              {isCompressing && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t.compressingImage}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.location || 'Location'} *</FormLabel>
                    <FormControl>
                      <Input placeholder={language === 'el' ? "π.χ. Λευκωσία" : "e.g. Nicosia"} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price_tier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.priceTier || 'Price'} *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="free">{t.free || 'Free'}</SelectItem>
                        <SelectItem value="low">{t.low || 'Low'} (€)</SelectItem>
                        <SelectItem value="medium">{t.medium || 'Medium'} (€€)</SelectItem>
                        <SelectItem value="high">{t.high || 'High'} (€€€)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.startDate || 'Start Date'} *</FormLabel>
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
                    <FormLabel>{t.endDate || 'End Date'} *</FormLabel>
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
              name="min_age_hint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.minAge || 'Minimum Age (optional)'}</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder={language === 'el' ? "18" : "18"}
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={() => (
                <FormItem>
                  <FormLabel>{t.categories || 'Categories'} *</FormLabel>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {eventCategories[language].map((cat, index) => {
                      const catKey = eventCategories.el[index];
                      return (
                        <FormField
                          key={catKey}
                          control={form.control}
                          name="category"
                          render={({ field }) => {
                            return (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(catKey)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, catKey])
                                        : field.onChange(
                                            field.value?.filter((value) => value !== catKey)
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {cat}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>{language === 'el' ? 'Εικόνα Εξώφυλλου (προαιρετικό)' : 'Cover Image (optional)'}</FormLabel>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
                className="mt-2"
              />
            </div>

            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-semibold">{language === 'el' ? 'Ρυθμίσεις Κράτησης' : 'Reservation Settings'}</h3>
              
              <FormField
                control={form.control}
                name="accepts_reservations"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>{t.acceptsReservations || 'Accept Reservations'}</FormLabel>
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {language === 'el' ? 'Δημοσίευση Εκδήλωσης' : 'Publish Event'}
            </Button>
          </form>
        </Form>
      </CardContent>

      <ImageCropDialog
        open={cropDialogOpen}
        onClose={() => {
          setCropDialogOpen(false);
          setTempImageSrc("");
          setTempImageFile(null);
        }}
        imageSrc={tempImageSrc}
        onCropComplete={handleCropComplete}
      />
    </Card>
  );
};

export default EventCreationForm;

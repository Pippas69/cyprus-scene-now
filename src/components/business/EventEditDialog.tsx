import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { ImageCropDialog } from "./ImageCropDialog";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { compressImage } from "@/lib/imageCompression";
import { useLanguage } from "@/hooks/useLanguage";
import { businessTranslations, seatingOptions } from "./translations";
import { EventCategorySelector } from "./EventCategorySelector";
import { Switch } from "@/components/ui/switch";
import { validationTranslations, formatValidationMessage } from "@/translations/validationTranslations";
import { Upload, X } from "lucide-react";
import { toastTranslations } from "@/translations/toastTranslations";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const createEventSchema = (language: 'el' | 'en') => {
  const v = validationTranslations[language];
  
  return z.object({
    title: z.string().trim().min(3, v.titleRequired).max(100, formatValidationMessage(v.maxLength, { max: 100 })),
    description: z.string().trim().min(10, formatValidationMessage(v.minLength, { min: 10 })).max(1000, formatValidationMessage(v.maxLength, { max: 1000 })),
    location: z.string().trim().min(3, v.locationRequired),
    start_at: z.string().min(1, language === 'el' ? "Η ημερομηνία έναρξης είναι υποχρεωτική" : "Start date is required"),
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

interface EventEditDialogProps {
  event: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const EventEditDialog = ({ event, open, onOpenChange, onSuccess }: EventEditDialogProps) => {
  const { language } = useLanguage();
  const t = businessTranslations[language];
  const toastT = toastTranslations[language];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string>("");
  const [tempImageFile, setTempImageFile] = useState<File | null>(null);

  const form = useForm<EventFormData>({
    resolver: zodResolver(createEventSchema(language)),
    defaultValues: {
      title: event.title || "",
      description: event.description || "",
      location: event.location || "",
      start_at: event.start_at || "",
      end_at: event.end_at || "",
      category: event.category || [],
      price_tier: event.price_tier || "free",
      min_age_hint: event.min_age_hint || 0,
      accepts_reservations: event.accepts_reservations || false,
      max_reservations: event.max_reservations || undefined,
      requires_approval: event.requires_approval ?? true,
      seating_options: event.seating_options || [],
    },
  });

  useEffect(() => {
    if (event && open) {
      form.reset({
        title: event.title || "",
        description: event.description || "",
        location: event.location || "",
        start_at: event.start_at || "",
        end_at: event.end_at || "",
        category: event.category || [],
        price_tier: event.price_tier || "free",
        min_age_hint: event.min_age_hint || 0,
        accepts_reservations: event.accepts_reservations || false,
        max_reservations: event.max_reservations || undefined,
        requires_approval: event.requires_approval ?? true,
        seating_options: event.seating_options || [],
      });
      setCoverImage(null);
      setCoverImagePreview(null);
    }
  }, [event, open, form]);

  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setTempImageSrc(reader.result as string);
      setTempImageFile(file);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setIsCompressing(true);
    try {
      const croppedFile = new File([croppedBlob], tempImageFile?.name || "image.jpg", {
        type: "image/jpeg",
      });
      const compressedFile = await compressImage(croppedFile);
      setCoverImage(compressedFile);
      setCoverImagePreview(URL.createObjectURL(compressedFile));
      toast.success(language === 'el' ? "Η εικόνα ανέβηκε επιτυχώς" : "Image uploaded successfully");
    } catch (error) {
      console.error("Error compressing image:", error);
      toast.error(language === 'el' ? "Σφάλμα κατά τη συμπίεση της εικόνας" : "Error compressing image");
    } finally {
      setIsCompressing(false);
      setCropDialogOpen(false);
    }
  };

  const onSubmit = async (data: EventFormData) => {
    setIsSubmitting(true);

    try {
      let coverImageUrl = event.cover_image_url;

      if (coverImage) {
        const fileExt = coverImage.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${event.business_id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("event-covers")
          .upload(filePath, coverImage);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("event-covers")
          .getPublicUrl(filePath);

        coverImageUrl = urlData.publicUrl;
      }

      const { error } = await supabase
        .from("events")
        .update({
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
          max_reservations: data.accepts_reservations ? data.max_reservations : null,
          requires_approval: data.requires_approval,
          seating_options: data.seating_options || null,
        })
        .eq('id', event.id);

      if (error) throw error;

      toast.success(toastT.success, {
        description: language === 'el' ? "Η εκδήλωση ενημερώθηκε επιτυχώς" : "Event updated successfully"
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error updating event:", error);
      toast.error(toastT.error, {
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{language === 'el' ? 'Επεξεργασία Εκδήλωσης' : 'Edit Event'}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.eventTitle}</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Textarea {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.location}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_at"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t.startDate}</FormLabel>
                      <DateTimePicker
                        value={field.value ? new Date(field.value) : undefined}
                        onChange={(date) => field.onChange(date?.toISOString())}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_at"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t.endDate}</FormLabel>
                      <DateTimePicker
                        value={field.value ? new Date(field.value) : undefined}
                        onChange={(date) => field.onChange(date?.toISOString())}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="price_tier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.priceTier}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="free">{t.free}</SelectItem>
                        <SelectItem value="low">{t.low}</SelectItem>
                        <SelectItem value="medium">{t.medium}</SelectItem>
                        <SelectItem value="high">{t.high}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="min_age_hint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.minAge}</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.categories}</FormLabel>
                    <FormControl>
                      <EventCategorySelector
                        language={language}
                        selectedCategories={field.value || []}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>{t.coverImage}</FormLabel>
                {event.cover_image_url && !coverImage && (
                  <div className="mb-2">
                    <img 
                      src={event.cover_image_url} 
                      alt="Current cover" 
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      {language === 'el' ? 'Τρέχουσα εικόνα' : 'Current image'}
                    </p>
                  </div>
                )}
                <div className="flex items-start gap-4">
                  {(coverImagePreview || coverImage) ? (
                    <div className="relative">
                      <img
                        src={coverImagePreview || (coverImage ? URL.createObjectURL(coverImage) : '')}
                        alt="Preview"
                        className="w-32 h-32 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={() => {
                          setCoverImage(null);
                          setCoverImagePreview(null);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/10">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                      className="hidden"
                      id="event-cover-upload"
                      disabled={isCompressing}
                    />
                    <label htmlFor="event-cover-upload">
                      <Button type="button" variant="outline" asChild disabled={isCompressing}>
                        <span>
                          <Upload className="mr-2 h-4 w-4" />
                          {isCompressing 
                            ? (language === 'el' ? 'Επεξεργασία...' : 'Processing...') 
                            : (language === 'el' ? 'Επιλέξτε Αρχείο' : 'Select File')
                          }
                        </span>
                      </Button>
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {language === 'el' 
                        ? 'Μέγιστο μέγεθος: 2MB. Τύποι: JPEG, PNG, WebP'
                        : 'Maximum size: 2MB. Types: JPEG, PNG, WebP'}
                    </p>
                  </div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="accepts_reservations"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">{t.acceptsReservations}</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {form.watch("accepts_reservations") && (
                <>
                  <FormField
                    control={form.control}
                    name="max_reservations"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.maxReservations}</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={e => field.onChange(parseInt(e.target.value) || undefined)}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="requires_approval"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">{t.requiresApproval}</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="seating_options"
                    render={() => {
                      const options = [
                        { value: "table", label: { el: "Τραπέζι", en: "Table" } },
                        { value: "bar", label: { el: "Μπαρ", en: "Bar" } },
                        { value: "vip", label: { el: "VIP", en: "VIP" } },
                        { value: "outdoor", label: { el: "Εξωτερικός Χώρος", en: "Outdoor" } },
                        { value: "indoor", label: { el: "Εσωτερικός Χώρος", en: "Indoor" } },
                      ];
                      
                      return (
                        <FormItem>
                          <FormLabel>{t.seatingOptions}</FormLabel>
                          <div className="grid grid-cols-2 gap-2">
                            {options.map((option) => (
                              <FormField
                                key={option.value}
                                control={form.control}
                                name="seating_options"
                                render={({ field }) => (
                                  <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(option.value)}
                                        onCheckedChange={(checked) => {
                                          const current = field.value || [];
                                          field.onChange(
                                            checked
                                              ? [...current, option.value]
                                              : current.filter((val) => val !== option.value)
                                          );
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal cursor-pointer">
                                      {option.label[language]}
                                    </FormLabel>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  {language === 'el' ? 'Ακύρωση' : 'Cancel'}
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {language === 'el' ? 'Ενημέρωση Εκδήλωσης' : 'Update Event'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ImageCropDialog
        open={cropDialogOpen}
        onClose={() => setCropDialogOpen(false)}
        imageSrc={tempImageSrc}
        onCropComplete={handleCropComplete}
      />
    </>
  );
};

export default EventEditDialog;

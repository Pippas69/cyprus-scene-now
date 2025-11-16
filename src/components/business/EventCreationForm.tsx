import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
import { compressImage } from "@/lib/imageCompression";
import { useLanguage } from "@/hooks/useLanguage";
import { businessTranslations, eventCategories, seatingOptions } from "./translations";
import { Switch } from "@/components/ui/switch";

const createEventSchema = (language: 'el' | 'en') => {
  return z.object({
    title: z.string().trim().min(3, language === 'el' ? "Ο τίτλος πρέπει να έχει τουλάχιστον 3 χαρακτήρες" : "Title must be at least 3 characters").max(100, language === 'el' ? "Ο τίτλος δεν μπορεί να υπερβαίνει τους 100 χαρακτήρες" : "Title cannot exceed 100 characters"),
    description: z.string().trim().min(10, language === 'el' ? "Η περιγραφή πρέπει να έχει τουλάχιστον 10 χαρακτήρες" : "Description must be at least 10 characters").max(1000, language === 'el' ? "Η περιγραφή δεν μπορεί να υπερβαίνει τους 1000 χαρακτήρες" : "Description cannot exceed 1000 characters"),
    location: z.string().trim().min(3, language === 'el' ? "Η τοποθεσία είναι υποχρεωτική" : "Location is required"),
    start_at: z.string().min(1, language === 'el' ? "Η ημερομηνία έναρξης είναι υποχρεωτική" : "Start date is required"),
    end_at: z.string().min(1, language === 'el' ? "Η ημερομηνία λήξης είναι υποχρεωτική" : "End date is required"),
    category: z.array(z.string()).min(1, language === 'el' ? "Επιλέξτε τουλάχιστον μία κατηγορία" : "Select at least one category"),
    price_tier: z.enum(["free", "low", "medium", "high"]),
    min_age_hint: z.number().min(0).max(100).optional(),
    accepts_reservations: z.boolean().default(false),
    max_reservations: z.number().min(1).optional(),
    requires_approval: z.boolean().default(true),
    seating_options: z.array(z.string()).optional(),
  });
};

type EventFormData = z.infer<ReturnType<typeof createEventSchema>>;

interface EventCreationFormProps {
  businessId: string;
}

const EventCreationForm = ({ businessId }: EventCreationFormProps) => {
  const { language } = useLanguage();
  const t = businessTranslations[language];
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
          toast({
            title: "Σφάλμα",
            description: "Αποτυχία συμπίεσης εικόνας",
            variant: "destructive",
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

      toast({
        title: "Επιτυχία!",
        description: "Η εκδήλωση δημοσιεύθηκε επιτυχώς",
      });

      form.reset();
      setCoverImage(null);
    } catch (error: any) {
      toast({
        title: "Σφάλμα",
        description: error.message || "Κάτι πήγε στραβά",
        variant: "destructive",
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
                  <FormLabel>Τίτλος *</FormLabel>
                  <FormControl>
                    <Input placeholder="π.χ. Live Music Night" {...field} />
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
                  <FormLabel>Περιγραφή *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Περιγράψτε την εκδήλωσή σας..."
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
                label="Εικόνα Κάλυψης Εκδήλωσης"
                language={language}
                aspectRatio="16/9"
                maxSizeMB={5}
              />
              {isCompressing && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Συμπίεση εικόνας...</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Τοποθεσία *</FormLabel>
                    <FormControl>
                      <Input placeholder="π.χ. Λευκωσία" {...field} />
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
                    <FormLabel>Τιμή *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="free">Δωρεάν</SelectItem>
                        <SelectItem value="low">Χαμηλή (€)</SelectItem>
                        <SelectItem value="medium">Μέτρια (€€)</SelectItem>
                        <SelectItem value="high">Υψηλή (€€€)</SelectItem>
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
                    <FormLabel>Ημερομηνία Έναρξης *</FormLabel>
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
                    <FormLabel>Ημερομηνία Λήξης *</FormLabel>
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
              name="min_age_hint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ελάχιστη Ηλικία (προαιρετικό)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="18"
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
                  <FormLabel>Κατηγορίες *</FormLabel>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {categories.map((cat) => (
                      <FormField
                        key={cat.id}
                        control={form.control}
                        name="category"
                        render={({ field }) => {
                          return (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(cat.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, cat.id])
                                      : field.onChange(
                                          field.value?.filter((value) => value !== cat.id)
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {cat.label}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>Εικόνα Εξώφυλλου (προαιρετικό)</FormLabel>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
                className="mt-2"
              />
            </div>

            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-semibold">Ρυθμίσεις Κράτησης</h3>
              
              <FormField
                control={form.control}
                name="accepts_reservations"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>Αποδοχή Κρατήσεων</FormLabel>
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Δημοσίευση Εκδήλωσης
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

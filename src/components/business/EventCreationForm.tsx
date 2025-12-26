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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, X, Music, Car, Accessibility, Link, ImagePlus, Tag, MapPin, Ticket, Users } from "lucide-react";
import { ImageUploadField } from "./ImageUploadField";
import { ImageCropDialog } from "./ImageCropDialog";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { compressImage } from "@/lib/imageCompression";
import { useLanguage } from "@/hooks/useLanguage";
import { businessTranslations, eventCategories, seatingOptions } from "./translations";
import { Switch } from "@/components/ui/switch";
import { validationTranslations, formatValidationMessage } from "@/translations/validationTranslations";
import { toastTranslations } from "@/translations/toastTranslations";
import EventBoostDialog from "./EventBoostDialog";
import { useQuery } from "@tanstack/react-query";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { TicketTierEditor, type TicketTier } from "@/components/tickets/TicketTierEditor";
import { useCommissionRate } from "@/hooks/useCommissionRate";

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
    // New fields
    venue_name: z.string().optional(),
    is_indoor: z.boolean().default(true),
    performers: z.array(z.string()).optional(),
    dress_code: z.string().optional(),
    parking_info: z.string().optional(),
    accessibility_info: z.array(z.string()).optional(),
    external_ticket_url: z.string().url().optional().or(z.literal("")),
    tags: z.array(z.string()).optional(),
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
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);
  const [boostDialogOpen, setBoostDialogOpen] = useState(false);
  
  // New state for dynamic fields
  const [newPerformer, setNewPerformer] = useState("");
  const [newTag, setNewTag] = useState("");
  
  // Ticket tiers state
  const [ticketTiers, setTicketTiers] = useState<TicketTier[]>([]);
  
  // Get commission rate for ticket pricing
  const { data: commissionData } = useCommissionRate(businessId);
  const commissionPercent = commissionData?.commissionPercent ?? 12;
  
  // Collapsible sections state
  const [openSections, setOpenSections] = useState({
    basic: true,
    media: false,
    venue: false,
    tickets: false,
    reservations: false,
  });

  // Fetch subscription status
  const { data: subscriptionData } = useQuery({
    queryKey: ["subscription-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      return data;
    },
  });

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
      venue_name: "",
      is_indoor: true,
      performers: [],
      dress_code: "",
      parking_info: "",
      accessibility_info: [],
      external_ticket_url: "",
      tags: [],
    },
  });

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

  const addPerformer = () => {
    if (newPerformer.trim()) {
      const current = form.getValues("performers") || [];
      form.setValue("performers", [...current, newPerformer.trim()]);
      setNewPerformer("");
    }
  };

  const removePerformer = (index: number) => {
    const current = form.getValues("performers") || [];
    form.setValue("performers", current.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (newTag.trim()) {
      const current = form.getValues("tags") || [];
      if (!current.includes(newTag.trim())) {
        form.setValue("tags", [...current, newTag.trim()]);
      }
      setNewTag("");
    }
  };

  const removeTag = (index: number) => {
    const current = form.getValues("tags") || [];
    form.setValue("tags", current.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: EventFormData) => {
    setIsSubmitting(true);
    try {
      let coverImageUrl = null;

      if (coverImage) {
        try {
          setIsCompressing(true);
          const compressedBlob = await compressImage(coverImage, 1920, 1080, 0.85);
          const fileName = `${businessId}-${Date.now()}.jpg`;
          
          const { error: uploadError } = await supabase.storage
            .from('event-covers')
            .upload(fileName, compressedBlob, { contentType: 'image/jpeg' });

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

      const { data: eventData, error } = await supabase.from('events').insert({
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
        // New fields
        venue_name: data.venue_name || null,
        is_indoor: data.is_indoor,
        performers: data.performers || [],
        dress_code: data.dress_code || null,
        parking_info: data.parking_info || null,
        accessibility_info: data.accessibility_info || [],
        external_ticket_url: data.external_ticket_url || null,
        tags: data.tags || [],
      }).select().single();

      if (error) throw error;

      // Save ticket tiers if any
      if (ticketTiers.length > 0) {
        const tiersToInsert = ticketTiers.map((tier, index) => ({
          event_id: eventData.id,
          name: tier.name,
          description: tier.description || null,
          price_cents: tier.price_cents,
          currency: tier.currency,
          quantity_total: tier.quantity_total,
          max_per_order: tier.max_per_order,
          sort_order: index,
        }));

        const { error: tiersError } = await supabase
          .from('ticket_tiers')
          .insert(tiersToInsert);

        if (tiersError) {
          console.error('Error saving ticket tiers:', tiersError);
          toast.error(language === 'el' ? 'Σφάλμα αποθήκευσης εισιτηρίων' : 'Error saving ticket tiers');
        }
      }

      toast.success(toastT.success, {
        description: toastT.eventCreated,
        action: {
          label: language === 'el' ? 'Προώθηση' : 'Boost',
          onClick: () => {
            setCreatedEventId(eventData.id);
            setBoostDialogOpen(true);
          },
        },
      });

      form.reset();
      setCoverImage(null);
      setTicketTiers([]);
      setCreatedEventId(eventData.id);
    } catch (error: any) {
      toast.error(toastT.error, {
        description: error.message || toastT.eventCreateFailed
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const accessibilityOptions = [
    { id: "wheelchair", label: t.wheelchairAccessible || "Wheelchair Accessible" },
    { id: "elevator", label: t.elevator || "Elevator" },
    { id: "restroom", label: t.accessibleRestroom || "Accessible Restroom" },
    { id: "hearing", label: t.hearingLoop || "Hearing Loop" },
  ];

  const SectionHeader = ({ icon: Icon, title, isOpen, onToggle }: { icon: any; title: string; isOpen: boolean; onToggle: () => void }) => (
    <CollapsibleTrigger 
      onClick={onToggle}
      className="flex items-center justify-between w-full p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
    >
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-primary" />
        <span className="font-semibold">{title}</span>
      </div>
      <Plus className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-45' : ''}`} />
    </CollapsibleTrigger>
  );

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-6 w-6 text-primary" />
          {t.createEvent}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info Section - Always Open */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-semibold flex items-center gap-2">
                <Tag className="h-4 w-4" />
                {t.basicInfo || "Basic Information"}
              </h3>
              
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
                name="category"
                render={() => (
                  <FormItem>
                    <FormLabel>{t.categories || 'Categories'} *</FormLabel>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {eventCategories[language].map((cat, index) => {
                        const catKey = eventCategories.el[index];
                        return (
                          <FormField
                            key={catKey}
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(catKey)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, catKey])
                                        : field.onChange(field.value?.filter((value) => value !== catKey));
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal text-sm">{cat}</FormLabel>
                              </FormItem>
                            )}
                          />
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Cover Image Section */}
            <Collapsible open={openSections.media} onOpenChange={(open) => setOpenSections(s => ({ ...s, media: open }))}>
              <SectionHeader 
                icon={ImagePlus} 
                title={t.mediaSection || "Images & Media"} 
                isOpen={openSections.media}
                onToggle={() => setOpenSections(s => ({ ...s, media: !s.media }))}
              />
              <CollapsibleContent className="space-y-4 pt-4">
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
              </CollapsibleContent>
            </Collapsible>

            {/* Venue & Location Section */}
            <Collapsible open={openSections.venue} onOpenChange={(open) => setOpenSections(s => ({ ...s, venue: open }))}>
              <SectionHeader 
                icon={MapPin} 
                title={t.venueSection || "Venue & Location"} 
                isOpen={openSections.venue}
                onToggle={() => setOpenSections(s => ({ ...s, venue: !s.venue }))}
              />
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="venue_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.venueName || "Venue Name"}</FormLabel>
                        <FormControl>
                          <Input placeholder={t.venueNamePlaceholder || "e.g. Club XYZ"} {...field} />
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
                        <FormLabel>{t.location || 'Location'} *</FormLabel>
                        <FormControl>
                          <Input placeholder={language === 'el' ? "π.χ. Λευκωσία" : "e.g. Nicosia"} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="is_indoor"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">{t.isIndoor || "Indoor"} / {t.isOutdoor || "Outdoor"}</FormLabel>
                        <FormDescription>
                          {field.value 
                            ? (language === 'el' ? "Η εκδήλωση είναι σε εσωτερικό χώρο" : "Event is indoors")
                            : (language === 'el' ? "Η εκδήλωση είναι σε εξωτερικό χώρο" : "Event is outdoors")
                          }
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="parking_info"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        {t.parkingInfo || "Parking Info"}
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t.selectParking || "Select parking option"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="onsite">{t.parkingOnsite || "On-site"}</SelectItem>
                          <SelectItem value="street">{t.parkingStreet || "Street"}</SelectItem>
                          <SelectItem value="nearby">{t.parkingNearby || "Nearby Lot"}</SelectItem>
                          <SelectItem value="none">{t.parkingNone || "Public Transport"}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accessibility_info"
                  render={() => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Accessibility className="h-4 w-4" />
                        {t.accessibility || "Accessibility"}
                      </FormLabel>
                      <div className="grid grid-cols-2 gap-3">
                        {accessibilityOptions.map((option) => (
                          <FormField
                            key={option.id}
                            control={form.control}
                            name="accessibility_info"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(option.id)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value || [];
                                      return checked
                                        ? field.onChange([...current, option.id])
                                        : field.onChange(current.filter((value) => value !== option.id));
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal text-sm">{option.label}</FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CollapsibleContent>
            </Collapsible>

            {/* Tickets & Pricing Section */}
            <Collapsible open={openSections.tickets} onOpenChange={(open) => setOpenSections(s => ({ ...s, tickets: open }))}>
              <SectionHeader 
                icon={Ticket} 
                title={t.ticketsPricing || "Tickets & Pricing"} 
                isOpen={openSections.tickets}
                onToggle={() => setOpenSections(s => ({ ...s, tickets: !s.tickets }))}
              />
              <CollapsibleContent className="space-y-4 pt-4">
                {/* Native Ticket Tiers */}
                <TicketTierEditor
                  tiers={ticketTiers}
                  onTiersChange={setTicketTiers}
                  commissionPercent={commissionPercent}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price_tier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.priceTier || 'Price Indicator'}</FormLabel>
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
                        <FormDescription>
                          {language === 'el' ? "Δείκτης τιμής για χρήστες" : "Price indicator for users"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="min_age_hint"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.minAge || 'Minimum Age (optional)'}</FormLabel>
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
                </div>

                {ticketTiers.length === 0 && (
                  <FormField
                    control={form.control}
                    name="external_ticket_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Link className="h-4 w-4" />
                          {t.externalTicketUrl || "External Ticket URL"}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="url" 
                            placeholder={t.externalTicketUrlPlaceholder || "https://tickets.example.com/..."} 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          {language === 'el' ? "Χρησιμοποιήστε αν πουλάτε εισιτήρια εκτός πλατφόρμας" : "Use if selling tickets outside the platform"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="dress_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.dressCode || "Dress Code"}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t.selectDressCode || "Select dress code"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="casual">{t.casual || "Casual"}</SelectItem>
                          <SelectItem value="smart_casual">{t.smartCasual || "Smart Casual"}</SelectItem>
                          <SelectItem value="semi_formal">{t.semiFormal || "Semi-Formal"}</SelectItem>
                          <SelectItem value="formal">{t.formal || "Formal"}</SelectItem>
                          <SelectItem value="themed">{t.themed || "Themed / Costume"}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Performers */}
                <FormField
                  control={form.control}
                  name="performers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Music className="h-4 w-4" />
                        {t.performers || "Performers / Artists"}
                      </FormLabel>
                      <div className="flex gap-2">
                        <Input 
                          value={newPerformer}
                          onChange={(e) => setNewPerformer(e.target.value)}
                          placeholder={t.performersPlaceholder || "Add performers..."}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPerformer())}
                        />
                        <Button type="button" variant="outline" size="icon" onClick={addPerformer}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {field.value?.map((performer, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {performer}
                            <X 
                              className="h-3 w-3 cursor-pointer hover:text-destructive" 
                              onClick={() => removePerformer(index)} 
                            />
                          </Badge>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tags */}
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        {t.tags || "Tags"}
                      </FormLabel>
                      <div className="flex gap-2">
                        <Input 
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder={t.tagsPlaceholder || "Add tags..."}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        />
                        <Button type="button" variant="outline" size="icon" onClick={addTag}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {field.value?.map((tag, index) => (
                          <Badge key={index} variant="outline" className="flex items-center gap-1">
                            #{tag}
                            <X 
                              className="h-3 w-3 cursor-pointer hover:text-destructive" 
                              onClick={() => removeTag(index)} 
                            />
                          </Badge>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CollapsibleContent>
            </Collapsible>

            {/* Reservation Settings Section */}
            <Collapsible open={openSections.reservations} onOpenChange={(open) => setOpenSections(s => ({ ...s, reservations: open }))}>
              <SectionHeader 
                icon={Users} 
                title={language === 'el' ? 'Ρυθμίσεις Κράτησης' : 'Reservation Settings'} 
                isOpen={openSections.reservations}
                onToggle={() => setOpenSections(s => ({ ...s, reservations: !s.reservations }))}
              />
              <CollapsibleContent className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="accepts_reservations"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">{t.acceptsReservations || 'Accept Reservations'}</FormLabel>
                        <FormDescription>
                          {language === 'el' ? "Επιτρέπει στους χρήστες να κάνουν κράτηση" : "Allow users to make reservations"}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch("accepts_reservations") && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="max_reservations"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t.maxReservations || "Max Reservations"}</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="50"
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
                        name="requires_approval"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <FormLabel>{t.requiresApproval || 'Requires Approval'}</FormLabel>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="seating_options"
                      render={() => (
                        <FormItem>
                          <FormLabel>{t.seatingOptions || "Seating Options"}</FormLabel>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {seatingOptions[language].map((option, index) => {
                              const optionKey = seatingOptions.el[index];
                              return (
                                <FormField
                                  key={optionKey}
                                  control={form.control}
                                  name="seating_options"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(optionKey)}
                                          onCheckedChange={(checked) => {
                                            const current = field.value || [];
                                            return checked
                                              ? field.onChange([...current, optionKey])
                                              : field.onChange(current.filter((value) => value !== optionKey));
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal text-sm">{option}</FormLabel>
                                    </FormItem>
                                  )}
                                />
                              );
                            })}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </CollapsibleContent>
            </Collapsible>

            <Button type="submit" className="w-full" disabled={isSubmitting} size="lg">
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

      {createdEventId && (
        <EventBoostDialog
          open={boostDialogOpen}
          onOpenChange={(open) => {
            setBoostDialogOpen(open);
            if (!open) {
              navigate('/dashboard-business/events');
            }
          }}
          eventId={createdEventId}
          eventTitle={form.getValues("title")}
          hasActiveSubscription={subscriptionData?.subscribed || false}
          remainingBudgetCents={subscriptionData?.subscribed ? 100000 : 0}
        />
      )}
    </Card>
  );
};

export default EventCreationForm;

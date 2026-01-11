import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { Loader2, Plus, X, Music, Car, Accessibility, ImagePlus, Tag, MapPin, Ticket, Users, Clock, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { ImageUploadField } from "./ImageUploadField";
import { ImageCropDialog } from "./ImageCropDialog";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { compressImage } from "@/lib/imageCompression";
import { useLanguage } from "@/hooks/useLanguage";
import { businessTranslations, seatingOptions } from "./translations";
import { EventCategorySelector } from "./EventCategorySelector";
import { Switch } from "@/components/ui/switch";
import { validationTranslations, formatValidationMessage } from "@/translations/validationTranslations";
import { toastTranslations } from "@/translations/toastTranslations";
import EventBoostDialog from "./EventBoostDialog";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { TicketTierEditor, type TicketTier, validateTicketTiers } from "@/components/tickets/TicketTierEditor";
import { useCommissionRate } from "@/hooks/useCommissionRate";
import { EventTypeSelector, type EventType } from "./EventTypeSelector";
import { SeatingTypeEditor, type SeatingTypeConfig } from "./SeatingTypeEditor";
import { AppearanceDurationPicker, type AppearanceMode } from "./AppearanceDurationPicker";
import { FreeEntryDeclaration } from "./FreeEntryDeclaration";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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
    // Venue fields
    venue_name: z.string().optional(),
    is_indoor: z.boolean().default(true),
    parking_info: z.string().optional(),
    accessibility_info: z.array(z.string()).optional(),
    // Ticket event fields
    performers: z.array(z.string()).optional(),
    dress_code: z.string().optional(),
    tags: z.array(z.string()).optional(),
    // Reservation fields
    min_party_size: z.number().min(1).max(20).optional(),
    max_party_size: z.number().min(1).max(50).optional(),
    max_total_reservations: z.number().min(1).optional(),
    reservation_hours_from: z.string().optional(),
    reservation_hours_to: z.string().optional(),
  }).refine((data) => new Date(data.end_at) > new Date(data.start_at), {
    message: language === 'el' ? "Η ημερομηνία λήξης πρέπει να είναι μετά την ημερομηνία έναρξης" : "End date must be after start date",
    path: ["end_at"],
  });
};

type EventFormData = z.infer<ReturnType<typeof createEventSchema>>;

interface EventCreationFormProps {
  businessId: string;
}

const formTranslations = {
  el: {
    step1: "1. Βασικές Πληροφορίες",
    step2: "2. Εμφάνιση στο FOMO",
    step3: "3. Τοποθεσία",
    step4: "4. Τύπος Εκδήλωσης",
    step5Ticket: "5. Εισιτήρια & Τιμές",
    step5Reservation: "5. Ρυθμίσεις Κρατήσεων",
    step5FreeEntry: "5. Δήλωση Ελεύθερης Εισόδου",
    eventTypeRequired: "Πρέπει να επιλέξετε τύπο εκδήλωσης",
    freeEntryDeclarationRequired: "Πρέπει να αποδεχτείτε τη δήλωση ελεύθερης εισόδου",
    seatingTypeRequired: "Πρέπει να προσθέσετε τουλάχιστον έναν τύπο θέσης με τιμολόγηση",
    publishEvent: "Δημοσίευση Εκδήλωσης",
    reservationHours: "Ώρες Κρατήσεων",
    partySize: "Μέγεθος Παρέας",
    minPartySize: "Ελάχιστο",
    maxPartySize: "Μέγιστο",
    maxTotalReservations: "Μέγιστες Συνολικές Κρατήσεις",
    from: "Από",
    to: "Έως",
  },
  en: {
    step1: "1. Basic Information",
    step2: "2. FOMO Appearance",
    step3: "3. Location",
    step4: "4. Event Type",
    step5Ticket: "5. Tickets & Pricing",
    step5Reservation: "5. Reservation Settings",
    step5FreeEntry: "5. Free Entry Declaration",
    eventTypeRequired: "You must select an event type",
    freeEntryDeclarationRequired: "You must accept the free entry declaration",
    seatingTypeRequired: "You must add at least one seating type with pricing",
    publishEvent: "Publish Event",
    reservationHours: "Reservation Hours",
    partySize: "Party Size",
    minPartySize: "Minimum",
    maxPartySize: "Maximum",
    maxTotalReservations: "Max Total Reservations",
    from: "From",
    to: "To",
  },
};

const EventCreationForm = ({ businessId }: EventCreationFormProps) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = businessTranslations[language];
  const ft = formTranslations[language];
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
  
  // Event type state
  const [eventType, setEventType] = useState<EventType | null>(null);
  
  // Appearance duration state
  const [appearanceMode, setAppearanceMode] = useState<AppearanceMode>('date_range');
  const [appearanceStartAt, setAppearanceStartAt] = useState<Date | undefined>();
  const [appearanceEndAt, setAppearanceEndAt] = useState<Date | undefined>();
  
  // Free entry state
  const [freeEntryDeclaration, setFreeEntryDeclaration] = useState(false);
  const [wantsBoost, setWantsBoost] = useState(false);
  
  // Ticket tiers state
  const [ticketTiers, setTicketTiers] = useState<TicketTier[]>([]);
  const [ticketTierErrors, setTicketTierErrors] = useState<string[]>([]);
  
  // Seating types state (for reservation events)
  const [seatingTypes, setSeatingTypes] = useState<SeatingTypeConfig[]>([]);
  
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    appearance: true,
    venue: false,
    eventType: true,
    typeConfig: false,
  });
  
  // Get commission rate for ticket pricing
  const { data: commissionData } = useCommissionRate(businessId);
  const commissionPercent = commissionData?.commissionPercent ?? 12;

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
      venue_name: "",
      is_indoor: true,
      performers: [],
      dress_code: "",
      parking_info: "",
      accessibility_info: [],
      tags: [],
      min_party_size: 2,
      max_party_size: 10,
      max_total_reservations: undefined,
      reservation_hours_from: "",
      reservation_hours_to: "",
    },
  });

  // Use useWatch to avoid infinite re-render loops from inline form.watch() calls
  const watchedTitle = useWatch({ control: form.control, name: 'title' });
  const watchedDescription = useWatch({ control: form.control, name: 'description' });
  const watchedLocation = useWatch({ control: form.control, name: 'location' });
  const watchedMinPartySize = useWatch({ control: form.control, name: 'min_party_size' });
  const watchedMaxPartySize = useWatch({ control: form.control, name: 'max_party_size' });

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

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const onSubmit = async (data: EventFormData) => {
    // Validate event type is selected
    if (!eventType) {
      toast.error(ft.eventTypeRequired);
      setExpandedSections(prev => ({ ...prev, eventType: true }));
      return;
    }

    // Validate based on event type
    if (eventType === 'ticket' && ticketTiers.length > 0) {
      const tierErrors = validateTicketTiers(ticketTiers, language);
      setTicketTierErrors(tierErrors);
      if (tierErrors.length > 0) {
        setExpandedSections(prev => ({ ...prev, typeConfig: true }));
        toast.error(
          language === 'el' ? 'Σφάλμα επικύρωσης εισιτηρίων' : 'Ticket validation error',
          { description: language === 'el' ? 'Παρακαλώ συμπληρώστε τα ονόματα κατηγοριών εισιτηρίων' : 'Please fill in all ticket tier names' }
        );
        return;
      }
    }

    if (eventType === 'reservation') {
      const hasValidSeating = seatingTypes.length > 0 && 
        seatingTypes.every(st => st.tiers.length > 0);
      if (!hasValidSeating) {
        toast.error(ft.seatingTypeRequired);
        setExpandedSections(prev => ({ ...prev, typeConfig: true }));
        return;
      }
    }

    if (eventType === 'free_entry' && !freeEntryDeclaration) {
      toast.error(ft.freeEntryDeclarationRequired);
      setExpandedSections(prev => ({ ...prev, typeConfig: true }));
      return;
    }
    
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

      // Build event data
      const eventInsertData = {
        business_id: businessId,
        title: data.title,
        description: data.description,
        location: data.location,
        start_at: data.start_at,
        end_at: data.end_at,
        category: data.category,
        price_tier: (eventType === 'free_entry' ? 'free' : data.price_tier) as 'free' | 'low' | 'medium' | 'high',
        min_age_hint: data.min_age_hint || null,
        cover_image_url: coverImageUrl,
        venue_name: data.venue_name || null,
        is_indoor: data.is_indoor,
        parking_info: data.parking_info || null,
        accessibility_info: data.accessibility_info || [],
        // New fields
        event_type: eventType,
        appearance_mode: appearanceMode,
        appearance_start_at: appearanceStartAt?.toISOString() || null,
        appearance_end_at: appearanceEndAt?.toISOString() || null,
        free_entry_declaration: eventType === 'free_entry' ? freeEntryDeclaration : null,
        // Type-specific fields with defaults
        performers: eventType === 'ticket' ? (data.performers || []) : [],
        dress_code: eventType === 'ticket' ? (data.dress_code || null) : null,
        tags: eventType === 'ticket' ? (data.tags || []) : [],
        accepts_reservations: eventType === 'reservation',
        min_party_size: eventType === 'reservation' ? (data.min_party_size || 2) : null,
        max_party_size: eventType === 'reservation' ? (data.max_party_size || 10) : null,
        max_total_reservations: eventType === 'reservation' ? (data.max_total_reservations || null) : null,
        reservation_hours_from: eventType === 'reservation' ? (data.reservation_hours_from || null) : null,
        reservation_hours_to: eventType === 'reservation' ? (data.reservation_hours_to || null) : null,
        requires_approval: eventType === 'reservation',
      };

      const { data: eventData, error } = await supabase.from('events').insert(eventInsertData).select().single();

      if (error) throw error;

      // Save ticket tiers for ticket events
      if (eventType === 'ticket' && ticketTiers.length > 0) {
        const tiersToInsert = ticketTiers.map((tier, index) => ({
          event_id: eventData.id,
          name: tier.name,
          description: tier.description || null,
          price_cents: tier.price_cents,
          currency: tier.currency,
          quantity_total: tier.quantity_total,
          max_per_order: tier.max_per_order,
          sort_order: index,
          dress_code: tier.dress_code || null,
        }));

        const { error: tiersError } = await supabase
          .from('ticket_tiers')
          .insert(tiersToInsert);

        if (tiersError) {
          console.error('Error saving ticket tiers:', tiersError);
          toast.error(language === 'el' ? 'Σφάλμα αποθήκευσης εισιτηρίων' : 'Error saving ticket tiers');
        }
      }

      // Save seating types for reservation events
      if (eventType === 'reservation' && seatingTypes.length > 0) {
        for (const seatingConfig of seatingTypes) {
          // Insert seating type
          const { data: seatingData, error: seatingError } = await supabase
            .from('reservation_seating_types')
            .insert({
              event_id: eventData.id,
              seating_type: seatingConfig.seating_type,
              available_slots: seatingConfig.available_slots,
              dress_code: seatingConfig.dress_code,
              no_show_policy: seatingConfig.no_show_policy,
            })
            .select()
            .single();

          if (seatingError) {
            console.error('Error saving seating type:', seatingError);
            continue;
          }

          // Insert price tiers for this seating type
          if (seatingData && seatingConfig.tiers.length > 0) {
            const tiersToInsert = seatingConfig.tiers.map((tier, index) => ({
              seating_type_id: seatingData.id,
              min_people: tier.min_people,
              max_people: tier.max_people,
              prepaid_min_charge_cents: tier.prepaid_min_charge_cents,
              sort_order: index,
            }));

            const { error: tierError } = await supabase
              .from('seating_type_tiers')
              .insert(tiersToInsert);

            if (tierError) {
              console.error('Error saving seating tiers:', tierError);
            }
          }
        }
      }

      toast.success(toastT.success, {
        description: toastT.eventCreated,
        action: eventType !== 'free_entry' ? {
          label: language === 'el' ? 'Προώθηση' : 'Boost',
          onClick: () => {
            setCreatedEventId(eventData.id);
            setBoostDialogOpen(true);
          },
        } : undefined,
      });

      form.reset();
      setCoverImage(null);
      setTicketTiers([]);
      setSeatingTypes([]);
      setEventType(null);
      setFreeEntryDeclaration(false);
      setCreatedEventId(eventData.id);
      
      // Auto-open boost dialog for free entry events that want boost
      if (eventType === 'free_entry' && wantsBoost) {
        setBoostDialogOpen(true);
      } else if (eventType !== 'free_entry') {
        setBoostDialogOpen(true);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : toastT.eventCreateFailed;
      toast.error(toastT.error, {
        description: errorMessage
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

  const SectionHeader = ({ 
    title, 
    isOpen, 
    onToggle,
    required = false,
    completed = false,
  }: { 
    title: string; 
    isOpen: boolean; 
    onToggle: () => void;
    required?: boolean;
    completed?: boolean;
  }) => (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-between w-full p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors text-left"
    >
      <div className="flex items-center gap-3">
        <span className="font-semibold">{title}</span>
        {required && <Badge variant="outline" className="text-xs">Required</Badge>}
        {completed && <Badge variant="default" className="text-xs bg-green-500">✓</Badge>}
      </div>
      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
    </button>
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
            
            {/* STEP 1: Basic Info */}
            <div className="space-y-4">
              <SectionHeader 
                title={ft.step1}
                isOpen={expandedSections.basic}
                onToggle={() => toggleSection('basic')}
                required
                completed={!!watchedTitle && !!watchedDescription}
              />
              {expandedSections.basic && (
                <div className="space-y-4 p-4 border rounded-lg">
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
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.categories || 'Categories'} *</FormLabel>
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

                  {/* Cover Image */}
                  <div className="pt-2">
                    <ImageUploadField
                      label={language === 'el' ? "Εικόνα Κάλυψης Εκδήλωσης" : "Event Cover Image"}
                      language={language}
                      onFileSelect={handleFileSelect}
                      aspectRatio="16/9"
                      maxSizeMB={5}
                    />
                    {isCompressing && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{t.compressingImage}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* STEP 2: Appearance Duration */}
            <div className="space-y-4">
              <SectionHeader 
                title={ft.step2}
                isOpen={expandedSections.appearance}
                onToggle={() => toggleSection('appearance')}
                completed={!!appearanceStartAt && !!appearanceEndAt}
              />
              {expandedSections.appearance && (
                <div className="p-4 border rounded-lg">
                  <AppearanceDurationPicker
                    mode={appearanceMode}
                    onModeChange={setAppearanceMode}
                    startDate={appearanceStartAt}
                    endDate={appearanceEndAt}
                    onStartDateChange={setAppearanceStartAt}
                    onEndDateChange={setAppearanceEndAt}
                    language={language}
                  />
                </div>
              )}
            </div>

            {/* STEP 3: Venue & Location */}
            <div className="space-y-4">
              <SectionHeader 
                title={ft.step3}
                isOpen={expandedSections.venue}
                onToggle={() => toggleSection('venue')}
                completed={!!watchedLocation}
              />
              {expandedSections.venue && (
                <div className="space-y-4 p-4 border rounded-lg">
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
                </div>
              )}
            </div>

            {/* STEP 4: Event Type Selection */}
            <div className="space-y-4">
              <SectionHeader 
                title={ft.step4}
                isOpen={expandedSections.eventType}
                onToggle={() => toggleSection('eventType')}
                required
                completed={!!eventType}
              />
              {expandedSections.eventType && (
                <div className="p-4 border rounded-lg">
                  <EventTypeSelector
                    value={eventType}
                    onChange={(type) => {
                      setEventType(type);
                      setExpandedSections(prev => ({ ...prev, typeConfig: true }));
                    }}
                    language={language}
                  />
                  
                  {!eventType && (
                    <div className="flex items-center gap-2 mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span className="text-sm text-amber-700 dark:text-amber-400">
                        {language === 'el' 
                          ? 'Πρέπει να επιλέξετε τύπο εκδήλωσης για να συνεχίσετε' 
                          : 'You must select an event type to continue'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* STEP 5: Type-Specific Configuration */}
            {eventType && (
              <div className="space-y-4">
                <SectionHeader 
                  title={
                    eventType === 'ticket' ? ft.step5Ticket :
                    eventType === 'reservation' ? ft.step5Reservation :
                    ft.step5FreeEntry
                  }
                  isOpen={expandedSections.typeConfig}
                  onToggle={() => toggleSection('typeConfig')}
                  required
                />
                {expandedSections.typeConfig && (
                  <div className="p-4 border rounded-lg space-y-6">
                    
                    {/* TICKET EVENT CONFIG */}
                    {eventType === 'ticket' && (
                      <>
                        <TicketTierEditor
                          tiers={ticketTiers}
                          onTiersChange={(tiers) => {
                            setTicketTiers(tiers);
                            if (ticketTierErrors.length > 0) {
                              setTicketTierErrors([]);
                            }
                          }}
                          commissionPercent={commissionPercent}
                          validationErrors={ticketTierErrors}
                        />

                        <Separator />

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
                      </>
                    )}

                    {/* RESERVATION EVENT CONFIG */}
                    {eventType === 'reservation' && (
                      <>
                        {/* Reservation Hours */}
                        <div className="space-y-3">
                          <h4 className="font-medium flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {ft.reservationHours}
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="reservation_hours_from"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{ft.from}</FormLabel>
                                  <FormControl>
                                    <Input type="time" {...field} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="reservation_hours_to"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{ft.to}</FormLabel>
                                  <FormControl>
                                    <Input type="time" {...field} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <Separator />

                        {/* Party Size */}
                        <div className="space-y-3">
                          <h4 className="font-medium flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {ft.partySize}
                          </h4>
                          <div className="grid grid-cols-3 gap-4">
                            <FormField
                              control={form.control}
                              name="min_party_size"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{ft.minPartySize}</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      min={1}
                                      max={20}
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="max_party_size"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{ft.maxPartySize}</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      min={1}
                                      max={50}
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 10)}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="max_total_reservations"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{ft.maxTotalReservations}</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      min={1}
                                      placeholder="∞"
                                      {...field}
                                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <Separator />

                        {/* Seating Types */}
                        <SeatingTypeEditor
                          value={seatingTypes}
                          onChange={setSeatingTypes}
                          language={language}
                          minPartySize={Math.max(1, watchedMinPartySize ?? 2)}
                          maxPartySize={Math.max(watchedMinPartySize ?? 2, watchedMaxPartySize ?? 10)}
                        />
                      </>
                    )}

                    {/* FREE ENTRY CONFIG */}
                    {eventType === 'free_entry' && (
                      <FreeEntryDeclaration
                        checked={freeEntryDeclaration}
                        onChange={setFreeEntryDeclaration}
                        canBoost={true}
                        onBoostChange={setWantsBoost}
                        boostEnabled={wantsBoost}
                        language={language}
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting || !eventType} size="lg">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {ft.publishEvent}
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

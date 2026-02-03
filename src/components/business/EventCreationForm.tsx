import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Clock, MapPin, Ticket, Users, Gift, Plus, Trash2, AlertTriangle, Check, Sparkles } from "lucide-react";
import { ImageUploadField } from "./ImageUploadField";
import { ImageCropDialog } from "./ImageCropDialog";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { compressImage } from "@/lib/imageCompression";
import { useLanguage } from "@/hooks/useLanguage";
import { useCommissionRate } from "@/hooks/useCommissionRate";
import EventBoostDialog from "./EventBoostDialog";
import { cn } from "@/lib/utils";
import { TicketTierEditor, TicketTier, validateTicketTiers } from "@/components/tickets/TicketTierEditor";

// ============================================
// HELPER COMPONENTS (defined outside to prevent re-creation)
// ============================================

interface SectionCardProps {
  title: string;
  required?: boolean;
  requiredLabel: string;
  children: React.ReactNode;
}
const SectionCard: React.FC<SectionCardProps> = ({
  title,
  required = false,
  requiredLabel,
  children
}) => <div className="space-y-3 sm:space-y-4">
    <div className="flex items-center gap-2 sm:gap-3 pb-2 border-b">
      <h3 className="font-semibold text-[11px] sm:text-lg whitespace-normal leading-tight">{title}</h3>
      {required && <span className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1.5 sm:px-2 py-0.5 rounded-full">
          {requiredLabel}
        </span>}
    </div>
    <div className="space-y-3 sm:space-y-4">
      {children}
    </div>
  </div>;
interface CommissionBannerProps {
  platformFeeLabel: string;
  commissionPercent: number;
  upgradeHint: string;
}
const CommissionBanner: React.FC<CommissionBannerProps> = ({
  platformFeeLabel,
  commissionPercent,
  upgradeHint
}) => <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-2 sm:p-4">
    <div className="flex items-start gap-2 sm:gap-3">
      <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 mt-0.5 flex-shrink-0" />
      <div>
        <p className="font-medium text-[11px] sm:text-base text-amber-900 dark:text-amber-100">
          {platformFeeLabel} {commissionPercent}%
        </p>
        <p className="text-[10px] sm:text-sm text-amber-700 dark:text-amber-300">
          {upgradeHint}
        </p>
      </div>
    </div>
  </div>;

// ============================================
// TYPES
// ============================================

type EventType = 'ticket' | 'reservation' | 'free_entry';
type AppearanceMode = 'hours' | 'days';
type SeatingType = 'bar' | 'table' | 'vip' | 'sofa';
interface PersonTier {
  minPeople: number;
  maxPeople: number;
  prepaidChargeCents: number;
}
interface SeatingConfig {
  type: SeatingType;
  availableSlots: number;
  tiers: PersonTier[];
}
interface FormData {
  // Step 1: Title
  title: string;
  // Step 2: Description
  description: string;
  // Step 3: Start Date/Time
  startAt: Date | null;
  // Step 4: Appearance
  appearanceMode: AppearanceMode;
  appearanceHours: number;
  appearanceCustomHours: number;
  appearanceStartDate: Date | null;
  appearanceEndDate: Date | null;
  // Step 5: Venue
  venueName: string;
  address: string;
  // Step 6: Cover Image (handled separately)
  // Step 7: Event Type
  eventType: EventType | null;
  // Ticket fields - now supports multiple tiers
  ticketTiers: TicketTier[];
  // Reservation fields
  reservationFromTime: string;
  reservationToTime: string;
  selectedSeatingTypes: SeatingType[];
  seatingConfigs: Record<SeatingType, SeatingConfig>;
  // Free Entry fields
  freeEntryAccepted: {
    noTicket: boolean;
    noMinSpend: boolean;
    noReservation: boolean;
  };
  // Terms & Conditions (optional)
  termsAndConditions: string;
}

// ============================================
// TRANSLATIONS
// ============================================

const translations = {
  el: {
    createEvent: "Δημιουργία Εκδήλωσης",
    step1: "1. Τίτλος Εκδήλωσης",
    step2: "2. Περιγραφή Εκδήλωσης",
    step3: "3. Ημερομηνία & Ώρα Έναρξης",
    step4: "4. Διάρκεια Εμφάνισης στο ΦΟΜΟ",
    step5: "5. Τοποθεσία / Χώρος",
    step6: "6. Εικόνα Εκδήλωσης",
    step7: "7. Τύπος Εκδήλωσης",
    required: "Υποχρεωτικό",
    titlePlaceholder: "Δώστε έναν σύντομο και καθαρό τίτλο",
    descriptionPlaceholder: "Περιγράψτε την εκδήλωση (π.χ. party, DJ night, θεματικό βράδυ)...",
    wordsRemaining: "λέξεις απομένουν",
    wordsOver: "λέξεις πάνω από το όριο",
    selectDateTime: "Επιλέξτε ημερομηνία και ώρα",
    byHours: "Εμφάνιση με ώρες",
    byDays: "Εμφάνιση με ημέρες",
    hours: "ώρες",
    custom: "Προσαρμοσμένο",
    fromDate: "Από ημερομηνία",
    toDate: "Έως ημερομηνία",
    venueName: "Όνομα χώρου",
    venueNamePlaceholder: "π.χ. Club XYZ",
    location: "Τοποθεσία / Διεύθυνση",
    locationPlaceholder: "π.χ. Λεωφόρος Μακαρίου 45, Λευκωσία",
    coverImage: "Εικόνα Εκδήλωσης",
    chooseEventType: "Επιλέξτε τύπο εκδήλωσης",
    withTicket: "Με Εισιτήριο",
    withReservation: "Με Κράτηση",
    freeEntry: "Ελεύθερη Είσοδος",
    ticketConfig: "Ρυθμίσεις Εισιτηρίου",
    reservationConfig: "Ρυθμίσεις Κράτησης",
    freeEntryConfig: "Δήλωση Ελεύθερης Εισόδου",
    platformFee: "Προμήθεια πλατφόρμας:",
    upgradeHint: "Αναβαθμίστε το πλάνο σας για μικρότερη προμήθεια.",
    ticketNameLabel: "Όνομα εισιτηρίου",
    ticketDescLabel: "Σύντομη περιγραφή (προαιρετικό)",
    priceLabel: "Τιμή (€)",
    ticketsAvailable: "Διαθέσιμα εισιτήρια",
    maxPerOrder: "Μέγιστο ανά παραγγελία",
    dressCode: "Dress Code (προαιρετικό)",
    casual: "Casual",
    smartCasual: "Smart Casual",
    semiFormal: "Semi-Formal",
    formal: "Formal",
    costume: "Costume",
    reservationHours: "Ώρες αποδοχής κρατήσεων",
    from: "Από",
    to: "Έως",
    seatingTypes: "Τύποι Θέσεων",
    selectSeatingTypes: "Επιλέξτε από 1 έως 4 τύπους:",
    bar: "Bar",
    table: "Τραπέζι",
    vip: "VIP",
    sofa: "Καναπές",
    availableBookings: "Διαθέσιμες κρατήσεις",
    personRanges: "Εύρος ατόμων & Minimum Charge",
    rangeHint: "Έως 3 εύρη ανά τύπο. Το ποσό αφορά όλη την παρέα.",
    fromPersons: "Από άτομα",
    toPersons: "Έως άτομα",
    prepaidCharge: "Minimum Charge (€)",
    addRange: "Προσθήκη εύρους",
    cancellationPolicy: "Πολιτική Ακύρωσης",
    freeCancellationUpTo: "Δωρεάν ακύρωση έως",
    hoursBeforeEvent: "ώρες πριν",
    cancellationNote: "Αργές ακυρώσεις και no-shows δεν επιστρέφουν το ποσό.",
    freeEntryDeclarations: "Δηλώνω ότι:",
    noTicketRequired: "Δεν απαιτείται εισιτήριο στην είσοδο",
    noMinSpend: "Δεν υπάρχει υποχρεωτικό minimum spend",
    noReservationRequired: "Δεν απαιτείται κράτηση για είσοδο",
    freeEntryWarning: "Τα Free Entry events εμφανίζονται μόνο όταν γίνει boost. Υπάρχει σύστημα strike αν αποδειχθεί ότι ζητήθηκε πληρωμή στην είσοδο.",
    termsConditions: "Όροι & Προϋποθέσεις (προαιρετικό)",
    termsPlaceholder: "π.χ. Δεν επιτρέπεται η είσοδος σε ανηλίκους...",
    boostEvent: "Boost αυτή την εκδήλωση",
    publishEvent: "Δημοσίευση Εκδήλωσης",
    publishing: "Δημοσίευση...",
    allFieldsRequired: "Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία",
    eventCreated: "Η εκδήλωση δημιουργήθηκε επιτυχώς!",
    eventCreateFailed: "Αποτυχία δημιουργίας εκδήλωσης",
    acceptAllDeclarations: "Πρέπει να αποδεχτείτε όλες τις δηλώσεις",
    addAtLeastOneSeating: "Προσθέστε τουλάχιστον έναν τύπο θέσης",
    addAtLeastOneRange: "Κάθε τύπος θέσης χρειάζεται τουλάχιστον ένα εύρος ατόμων"
  },
  en: {
    createEvent: "Create Event",
    step1: "1. Event Title",
    step2: "2. Event Description",
    step3: "3. Start Date & Time",
    step4: "4. Duration of Appearance in ΦΟΜΟ",
    step5: "5. Venue / Location",
    step6: "6. Event Picture",
    step7: "7. Event Type",
    required: "Required",
    titlePlaceholder: "Give your event a short, clear title",
    descriptionPlaceholder: "Describe the event (e.g. party, DJ night, themed night)...",
    wordsRemaining: "words remaining",
    wordsOver: "words over limit",
    selectDateTime: "Select date and time",
    byHours: "Appearance by hours",
    byDays: "Appearance by days",
    hours: "hours",
    custom: "Custom",
    fromDate: "From date",
    toDate: "To date",
    venueName: "Venue name",
    venueNamePlaceholder: "e.g. Club XYZ",
    location: "Location / Address",
    locationPlaceholder: "e.g. 45 Makarios Avenue, Nicosia",
    coverImage: "Event Picture",
    chooseEventType: "Choose event type",
    withTicket: "With Ticket",
    withReservation: "With Reservation",
    freeEntry: "Free Entry",
    ticketConfig: "Ticket Settings",
    reservationConfig: "Reservation Settings",
    freeEntryConfig: "Free Entry Declaration",
    platformFee: "Platform fee:",
    upgradeHint: "Upgrade your plan for reduced commission.",
    ticketNameLabel: "Ticket name",
    ticketDescLabel: "Short description (optional)",
    priceLabel: "Price (€)",
    ticketsAvailable: "Tickets available",
    maxPerOrder: "Max per order",
    dressCode: "Dress Code (optional)",
    casual: "Casual",
    smartCasual: "Smart Casual",
    semiFormal: "Semi-Formal",
    formal: "Formal",
    costume: "Costume",
    reservationHours: "Reservation acceptance hours",
    from: "From",
    to: "To",
    seatingTypes: "Seating Types",
    selectSeatingTypes: "Select from 1 to 4 types:",
    bar: "Bar",
    table: "Table",
    vip: "VIP",
    sofa: "Sofa",
    availableBookings: "Available bookings",
    personRanges: "Person Range & Minimum Charge",
    rangeHint: "Up to 3 ranges per type. The amount is for the entire group.",
    fromPersons: "From persons",
    toPersons: "To persons",
    prepaidCharge: "Minimum Charge (€)",
    addRange: "Add range",
    cancellationPolicy: "Cancellation Policy",
    freeCancellationUpTo: "Free cancellation up to",
    hoursBeforeEvent: "hours before",
    cancellationNote: "Late cancellations and no-shows forfeit the prepaid amount.",
    freeEntryDeclarations: "I declare that:",
    noTicketRequired: "No ticket required at the entrance",
    noMinSpend: "No mandatory minimum spend",
    noReservationRequired: "No reservation required for entry",
    freeEntryWarning: "Free Entry events only appear when boosted. A strike system applies if users report payment was required at the door.",
    termsConditions: "Terms & Conditions (optional)",
    termsPlaceholder: "e.g. No entry for minors...",
    boostEvent: "Boost this event",
    publishEvent: "Publish Event",
    publishing: "Publishing...",
    allFieldsRequired: "Please fill in all required fields",
    eventCreated: "Event created successfully!",
    eventCreateFailed: "Failed to create event",
    acceptAllDeclarations: "You must accept all declarations",
    addAtLeastOneSeating: "Add at least one seating type",
    addAtLeastOneRange: "Each seating type needs at least one person range"
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};
const getDefaultSeatingConfig = (type: SeatingType): SeatingConfig => ({
  type,
  availableSlots: 10,
  tiers: [{
    minPeople: 2,
    maxPeople: 6,
    prepaidChargeCents: 10000
  }]
});

// ============================================
// MAIN COMPONENT
// ============================================

interface EventCreationFormProps {
  businessId: string;
}
const EventCreationForm = ({
  businessId
}: EventCreationFormProps) => {
  const navigate = useNavigate();
  const {
    language
  } = useLanguage();
  const t = translations[language];

  // Commission rate
  const {
    data: commissionData
  } = useCommissionRate(businessId);
  const commissionPercent = commissionData?.commissionPercent ?? 12;

  // Form state
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    startAt: null,
    appearanceMode: 'hours',
    appearanceHours: 24,
    appearanceCustomHours: 48,
    appearanceStartDate: null,
    appearanceEndDate: null,
    venueName: '',
    address: '',
    eventType: null,
    ticketTiers: [],
    reservationFromTime: '20:00',
    reservationToTime: '02:00',
    selectedSeatingTypes: [],
    seatingConfigs: {
      bar: getDefaultSeatingConfig('bar'),
      table: getDefaultSeatingConfig('table'),
      vip: getDefaultSeatingConfig('vip'),
      sofa: getDefaultSeatingConfig('sofa')
    },
    freeEntryAccepted: {
      noTicket: false,
      noMinSpend: false,
      noReservation: false
    },
    termsAndConditions: ''
  });

  // Ticket tier validation errors
  const [ticketValidationErrors, setTicketValidationErrors] = useState<string[]>([]);

  // Image state
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string>("");
  const [tempImageFile, setTempImageFile] = useState<File | null>(null);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);
  const [boostDialogOpen, setBoostDialogOpen] = useState(false);
  const [wantsBoost, setWantsBoost] = useState(false);

  // Simple field updater
  const updateField = <K extends keyof FormData,>(field: K, value: FormData[K]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Word count for description
  const descriptionWordCount = countWords(formData.description);
  const maxWords = 60;
  const wordsRemaining = maxWords - descriptionWordCount;

  // Image handling
  const handleFileSelect = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setTempImageSrc(reader.result as string);
      setTempImageFile(file);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };
  const handleCropComplete = async (croppedBlob: Blob) => {
    const croppedFile = new File([croppedBlob], tempImageFile?.name || "cropped-image.jpg", {
      type: "image/jpeg"
    });
    setCoverImage(croppedFile);
    setCropDialogOpen(false);
    setTempImageSrc("");
    setTempImageFile(null);
  };

  // Seating type toggle
  const toggleSeatingType = (type: SeatingType) => {
    const current = formData.selectedSeatingTypes;
    if (current.includes(type)) {
      updateField('selectedSeatingTypes', current.filter(t => t !== type));
    } else if (current.length < 4) {
      updateField('selectedSeatingTypes', [...current, type]);
    }
  };

  // Update seating config
  const updateSeatingConfig = (type: SeatingType, updates: Partial<SeatingConfig>) => {
    setFormData(prev => ({
      ...prev,
      seatingConfigs: {
        ...prev.seatingConfigs,
        [type]: {
          ...prev.seatingConfigs[type],
          ...updates
        }
      }
    }));
  };

  // Add/remove person tiers
  const addTier = (type: SeatingType) => {
    const config = formData.seatingConfigs[type];
    if (config.tiers.length >= 3) return;
    const lastTier = config.tiers[config.tiers.length - 1];
    const newTier: PersonTier = {
      minPeople: lastTier ? lastTier.maxPeople + 1 : 1,
      maxPeople: lastTier ? lastTier.maxPeople + 4 : 6,
      prepaidChargeCents: lastTier ? lastTier.prepaidChargeCents + 5000 : 10000
    };
    updateSeatingConfig(type, {
      tiers: [...config.tiers, newTier]
    });
  };
  const removeTier = (type: SeatingType, index: number) => {
    const config = formData.seatingConfigs[type];
    if (config.tiers.length <= 1) return;
    updateSeatingConfig(type, {
      tiers: config.tiers.filter((_, i) => i !== index)
    });
  };
  const updateTier = (type: SeatingType, index: number, updates: Partial<PersonTier>) => {
    const config = formData.seatingConfigs[type];
    const newTiers = config.tiers.map((tier, i) => i === index ? {
      ...tier,
      ...updates
    } : tier);
    updateSeatingConfig(type, {
      tiers: newTiers
    });
  };

  // Calculate appearance dates
  const calculateAppearanceDates = (): {
    start: Date | null;
    end: Date | null;
  } => {
    if (formData.appearanceMode === 'hours') {
      const hours = formData.appearanceHours === -1 ? formData.appearanceCustomHours : formData.appearanceHours;
      const now = new Date();
      const end = new Date(now.getTime() + hours * 60 * 60 * 1000);
      return {
        start: now,
        end
      };
    } else {
      return {
        start: formData.appearanceStartDate,
        end: formData.appearanceEndDate
      };
    }
  };

  // Validation
  const validate = (): string | null => {
    if (!formData.title.trim()) return t.allFieldsRequired;
    if (!formData.description.trim()) return t.allFieldsRequired;
    if (wordsRemaining < 0) return language === 'el' ? 'Η περιγραφή υπερβαίνει τις 60 λέξεις' : 'Description exceeds 60 words';
    if (!formData.startAt) return t.allFieldsRequired;
    if (formData.appearanceMode === 'days' && (!formData.appearanceStartDate || !formData.appearanceEndDate)) {
      return t.allFieldsRequired;
    }
    if (!formData.venueName.trim() || !formData.address.trim()) return t.allFieldsRequired;
    if (!coverImage) return t.allFieldsRequired;
    if (!formData.eventType) return t.allFieldsRequired;

    // Type-specific validation
    if (formData.eventType === 'ticket') {
      const tierErrors = validateTicketTiers(formData.ticketTiers, language);
      if (tierErrors.length > 0) {
        setTicketValidationErrors(tierErrors);
        return tierErrors[0];
      }
      if (formData.ticketTiers.length === 0) {
        return language === 'el' ? 'Προσθέστε τουλάχιστον μία κατηγορία εισιτηρίου' : 'Add at least one ticket tier';
      }
      setTicketValidationErrors([]);
    }
    if (formData.eventType === 'reservation') {
      if (formData.selectedSeatingTypes.length === 0) return t.addAtLeastOneSeating;
      for (const type of formData.selectedSeatingTypes) {
        const config = formData.seatingConfigs[type];
        if (config.tiers.length === 0) return t.addAtLeastOneRange;
      }
    }
    if (formData.eventType === 'free_entry') {
      const {
        noTicket,
        noMinSpend,
        noReservation
      } = formData.freeEntryAccepted;
      if (!noTicket || !noMinSpend || !noReservation) return t.acceptAllDeclarations;
    }
    return null;
  };

  // Submit handler
  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }
    setIsSubmitting(true);
    try {
      // Upload cover image
      let coverImageUrl = null;
      if (coverImage) {
        const compressedBlob = await compressImage(coverImage, 1920, 1080, 0.85);
        const fileName = `${businessId}-${Date.now()}.jpg`;
        const {
          error: uploadError
        } = await supabase.storage.from('event-covers').upload(fileName, compressedBlob, {
          contentType: 'image/jpeg'
        });
        if (uploadError) throw uploadError;
        const {
          data: {
            publicUrl
          }
        } = supabase.storage.from('event-covers').getPublicUrl(fileName);
        coverImageUrl = publicUrl;
      }

      // Calculate appearance dates
      const appearance = calculateAppearanceDates();

      // Calculate end_at (3 hours after start by default)
      const endAt = formData.startAt ? new Date(formData.startAt.getTime() + 3 * 60 * 60 * 1000) : new Date();

      // Build event data
      const eventData = {
        business_id: businessId,
        title: formData.title.trim(),
        description: formData.description.trim(),
        location: formData.address.trim(),
        venue_name: formData.venueName.trim(),
        start_at: formData.startAt?.toISOString() || new Date().toISOString(),
        end_at: endAt.toISOString(),
        cover_image_url: coverImageUrl,
        category: ['event'],
        price_tier: (formData.eventType === 'free_entry' ? 'free' : 'medium') as 'free' | 'low' | 'medium' | 'high',
        event_type: formData.eventType,
        appearance_mode: formData.appearanceMode === 'hours' ? 'hourly' : 'date_range',
        appearance_start_at: appearance.start?.toISOString() || null,
        appearance_end_at: appearance.end?.toISOString() || null,
        free_entry_declaration: formData.eventType === 'free_entry',
        accepts_reservations: formData.eventType === 'reservation',
        requires_approval: formData.eventType === 'reservation',
        dress_code: formData.eventType === 'ticket' && formData.ticketTiers.length > 0 ? formData.ticketTiers[0].dress_code : null,
        reservation_hours_from: formData.eventType === 'reservation' ? formData.reservationFromTime : null,
        reservation_hours_to: formData.eventType === 'reservation' ? formData.reservationToTime : null
      };
      const {
        data: createdEvent,
        error: insertError
      } = await supabase.from('events').insert(eventData).select().single();
      if (insertError) throw insertError;

      // Save ticket tiers for ticket events
      if (formData.eventType === 'ticket' && formData.ticketTiers.length > 0) {
        const tiersToInsert = formData.ticketTiers.map((tier, index) => ({
          event_id: createdEvent.id,
          name: tier.name,
          description: tier.description || null,
          price_cents: tier.price_cents,
          currency: tier.currency || 'EUR',
          quantity_total: tier.quantity_total,
          max_per_order: tier.max_per_order,
          sort_order: index,
          dress_code: tier.dress_code || null
        }));
        await supabase.from('ticket_tiers').insert(tiersToInsert);
      }

      // Save seating types and tiers for reservation events
      if (formData.eventType === 'reservation') {
        for (const seatingType of formData.selectedSeatingTypes) {
          const config = formData.seatingConfigs[seatingType];
          if (!config) {
            throw new Error(`Missing seating config for: ${seatingType}`);
          }
          const {
            data: seatingData,
            error: seatingError
          } = await supabase.from('reservation_seating_types').insert({
            event_id: createdEvent.id,
            seating_type: seatingType,
            available_slots: config.availableSlots,
            slots_booked: 0,
            dress_code: null,
            cancellation_policy: '3_strikes',
            no_show_policy: 'non_refundable'
          }).select().single();
          if (seatingError || !seatingData) {
            throw seatingError || new Error('Failed to create seating type');
          }

          // Insert price tiers
          const tiersToInsert = config.tiers.map(tier => ({
            seating_type_id: seatingData.id,
            min_people: tier.minPeople,
            max_people: tier.maxPeople,
            prepaid_min_charge_cents: tier.prepaidChargeCents
          }));
          const {
            error: tiersError
          } = await supabase.from('seating_type_tiers').insert(tiersToInsert);
          if (tiersError) throw tiersError;
        }
      }
      toast.success(t.eventCreated);
      setCreatedEventId(createdEvent.id);

      // Always show the optional boost prompt after publishing (same behavior as offer creation)
      setBoostDialogOpen(true);
    } catch (err) {
      console.error('Error creating event:', err);
      toast.error(t.eventCreateFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  return <Card className="max-w-3xl mx-auto">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Sparkles className="h-6 w-6 text-primary" />
          {t.createEvent}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6 space-y-8">
        {/* Step 1: Title */}
        <SectionCard title={t.step1} required requiredLabel={t.required}>
          <Input value={formData.title} onChange={e => updateField('title', e.target.value)} placeholder={t.titlePlaceholder} maxLength={100} className="text-xs sm:text-sm h-9 sm:h-10" />
        </SectionCard>

        {/* Step 2: Description */}
        <SectionCard title={t.step2} required requiredLabel={t.required}>
          <Textarea value={formData.description} onChange={e => updateField('description', e.target.value)} placeholder={t.descriptionPlaceholder} rows={4} className="text-xs sm:text-sm" />
          <p className={cn("text-xs sm:text-sm", wordsRemaining >= 0 ? "text-muted-foreground" : "text-destructive font-medium")}>
            {wordsRemaining >= 0 ? `${wordsRemaining} ${t.wordsRemaining}` : `${Math.abs(wordsRemaining)} ${t.wordsOver}`}
          </p>
        </SectionCard>

        {/* Step 3: Start Date & Time */}
        <SectionCard title={t.step3} required requiredLabel={t.required}>
          <DateTimePicker value={formData.startAt || undefined} onChange={date => updateField('startAt', date || null)} placeholder={t.selectDateTime} />
        </SectionCard>

        {/* Step 4: Appearance Duration */}
        <SectionCard title={t.step4} required requiredLabel={t.required}>
          <RadioGroup value={formData.appearanceMode} onValueChange={v => updateField('appearanceMode', v as AppearanceMode)} className="flex gap-3 sm:gap-4">
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <RadioGroupItem value="hours" id="hours" />
              <Label htmlFor="hours" className="flex items-center gap-1 sm:gap-2 cursor-pointer text-xs sm:text-sm whitespace-nowrap">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                {t.byHours}
              </Label>
            </div>
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <RadioGroupItem value="days" id="days" />
              <Label htmlFor="days" className="flex items-center gap-1 sm:gap-2 cursor-pointer text-xs sm:text-sm whitespace-nowrap">
                
                {t.byDays}
              </Label>
            </div>
          </RadioGroup>

          {formData.appearanceMode === 'hours' && <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {[1, 2, 3, 6, 12, 24].map(h => <Button key={h} type="button" variant={formData.appearanceHours === h ? "default" : "outline"} size="sm" onClick={() => updateField('appearanceHours', h)} className="text-xs sm:text-sm px-2 sm:px-3 h-7 sm:h-9">
                  {h}h
                </Button>)}
              <Button type="button" variant={formData.appearanceHours === -1 ? "default" : "outline"} size="sm" onClick={() => updateField('appearanceHours', -1)} className="text-xs sm:text-sm px-2 sm:px-3 h-7 sm:h-9 whitespace-nowrap">
                {t.custom}
              </Button>
            </div>}

          {formData.appearanceMode === 'hours' && formData.appearanceHours === -1 && <div className="flex items-center gap-2">
              <Input type="number" value={formData.appearanceCustomHours} onChange={e => updateField('appearanceCustomHours', parseInt(e.target.value) || 1)} min={1} max={168} className="w-24" />
              <span className="text-muted-foreground">{t.hours}</span>
            </div>}

          {formData.appearanceMode === 'days' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.fromDate}</Label>
                <DateTimePicker value={formData.appearanceStartDate || undefined} onChange={date => updateField('appearanceStartDate', date || null)} />
              </div>
              <div className="space-y-2">
                <Label>{t.toDate}</Label>
                <DateTimePicker value={formData.appearanceEndDate || undefined} onChange={date => updateField('appearanceEndDate', date || null)} minDate={formData.appearanceStartDate || undefined} />
              </div>
            </div>}
        </SectionCard>

        {/* Step 5: Venue */}
        <SectionCard title={t.step5} required requiredLabel={t.required}>
          <div className="space-y-3 sm:space-y-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">{t.venueName}</Label>
              <Input value={formData.venueName} onChange={e => updateField('venueName', e.target.value)} placeholder={t.venueNamePlaceholder} className="text-xs sm:text-sm h-9 sm:h-10" />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="flex items-center gap-2 text-xs sm:text-sm">
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                {t.location}
              </Label>
              <Input value={formData.address} onChange={e => updateField('address', e.target.value)} placeholder={t.locationPlaceholder} className="text-xs sm:text-sm h-9 sm:h-10" />
            </div>
          </div>
        </SectionCard>

        {/* Step 6: Cover Image */}
        <SectionCard title={t.step6} required requiredLabel={t.required}>
          <ImageUploadField label={t.coverImage} language={language} onFileSelect={handleFileSelect} aspectRatio="16/9" maxSizeMB={5} />
        </SectionCard>

        {/* Step 7: Event Type */}
        <SectionCard title={t.step7} required requiredLabel={t.required}>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {/* Ticket */}
            <button type="button" onClick={() => updateField('eventType', 'ticket')} className={cn("p-3 sm:p-6 rounded-xl border-2 transition-all text-center space-y-1 sm:space-y-3", formData.eventType === 'ticket' ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50")}>
              <Ticket className="h-5 w-5 sm:h-8 sm:w-8 mx-auto text-primary" />
              <p className="font-medium text-xs sm:text-base">{t.withTicket}</p>
            </button>

            {/* Reservation */}
            <button type="button" onClick={() => updateField('eventType', 'reservation')} className={cn("p-3 sm:p-6 rounded-xl border-2 transition-all text-center space-y-1 sm:space-y-3", formData.eventType === 'reservation' ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50")}>
              <Users className="h-5 w-5 sm:h-8 sm:w-8 mx-auto text-primary" />
              <p className="font-medium text-xs sm:text-base">{t.withReservation}</p>
            </button>

            {/* Free Entry */}
            <button type="button" onClick={() => updateField('eventType', 'free_entry')} className={cn("p-3 sm:p-6 rounded-xl border-2 transition-all text-center space-y-1 sm:space-y-3", formData.eventType === 'free_entry' ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50")}>
              <Gift className="h-5 w-5 sm:h-8 sm:w-8 mx-auto text-primary" />
              <p className="font-medium text-xs sm:text-base">{t.freeEntry}</p>
            </button>
          </div>

          {/* TICKET CONFIG */}
          {formData.eventType === 'ticket' && <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4 p-3 sm:p-4 bg-muted/30 rounded-lg">
              <h4 className="font-semibold text-xs sm:text-base flex items-center gap-2">
                <Ticket className="h-3 w-3 sm:h-4 sm:w-4" />
                {t.ticketConfig}
              </h4>
              
              <CommissionBanner platformFeeLabel={t.platformFee} commissionPercent={commissionPercent} upgradeHint={t.upgradeHint} />
              
              <TicketTierEditor tiers={formData.ticketTiers} onTiersChange={tiers => updateField('ticketTiers', tiers)} commissionPercent={commissionPercent} validationErrors={ticketValidationErrors} autoEnabled={true} />
            </div>}

          {/* RESERVATION CONFIG */}
          {formData.eventType === 'reservation' && <div className="mt-4 sm:mt-6 space-y-4 sm:space-y-6 p-3 sm:p-4 bg-muted/30 rounded-lg">
              <h4 className="font-semibold text-xs sm:text-base flex items-center gap-2">
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                {t.reservationConfig}
              </h4>
              
              <CommissionBanner platformFeeLabel={t.platformFee} commissionPercent={commissionPercent} upgradeHint={t.upgradeHint} />
              
              {/* Reservation Hours */}
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">{t.reservationHours}</Label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">{t.from}</span>
                    <Input type="time" value={formData.reservationFromTime} onChange={e => updateField('reservationFromTime', e.target.value)} className="w-28 sm:w-32 h-8 sm:h-10 text-xs sm:text-sm" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">{t.to}</span>
                    <Input type="time" value={formData.reservationToTime} onChange={e => updateField('reservationToTime', e.target.value)} className="w-28 sm:w-32 h-8 sm:h-10 text-xs sm:text-sm" />
                  </div>
                </div>
              </div>

              {/* Seating Types Selection */}
              <div className="space-y-2 sm:space-y-3">
                <Label className="text-xs sm:text-sm">{t.seatingTypes}</Label>
                <p className="text-[10px] sm:text-sm text-muted-foreground">{t.selectSeatingTypes}</p>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {(['bar', 'table', 'vip', 'sofa'] as SeatingType[]).map(type => <Button key={type} type="button" variant={formData.selectedSeatingTypes.includes(type) ? "default" : "outline"} size="sm" onClick={() => toggleSeatingType(type)} className="text-[10px] sm:text-sm h-7 sm:h-9 px-2 sm:px-3">
                      {formData.selectedSeatingTypes.includes(type) && <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />}
                      {t[type]}
                    </Button>)}
                </div>
              </div>

              {/* Config for each selected type */}
              {formData.selectedSeatingTypes.map(type => {
            const config = formData.seatingConfigs[type];
            return <div key={type} className="border rounded-lg p-2 sm:p-4 space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="font-medium capitalize text-xs sm:text-base">{t[type]}</h5>
                    </div>
                    
                    {/* Available Slots */}
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm">{t.availableBookings}</Label>
                      <Input type="number" value={config.availableSlots} onChange={e => updateSeatingConfig(type, {
                  availableSlots: parseInt(e.target.value) || 1
                })} min={1} className="w-24 sm:w-32 h-8 sm:h-10 text-xs sm:text-sm" />
                    </div>
                    
                    {/* Person Tiers */}
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs sm:text-sm">{t.personRanges}</Label>
                        {config.tiers.length < 3 && <Button type="button" variant="ghost" size="sm" onClick={() => addTier(type)} className="text-[10px] sm:text-sm h-7 sm:h-9">
                            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            {t.addRange}
                          </Button>}
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">{t.rangeHint}</p>
                      
                      {config.tiers.map((tier, index) => <div key={index} className="flex items-center gap-1.5 sm:gap-3 bg-background p-2 sm:p-3 rounded-lg flex-nowrap overflow-x-auto">
                          <div className="flex items-center gap-1 sm:gap-2 flex-nowrap">
                            <NumberInput 
                              value={tier.minPeople} 
                              onChange={value => updateTier(type, index, { minPeople: value })} 
                              min={1} 
                              max={99}
                              className="w-14 sm:w-16 h-7 sm:h-10 text-[11px] sm:text-sm" 
                            />
                            <span className="text-muted-foreground text-xs">-</span>
                            <NumberInput 
                              value={tier.maxPeople} 
                              onChange={value => updateTier(type, index, { maxPeople: value })} 
                              min={tier.minPeople} 
                              max={99}
                              className="w-14 sm:w-16 h-7 sm:h-10 text-[11px] sm:text-sm" 
                            />
                            <span className="text-[10px] sm:text-sm text-muted-foreground whitespace-nowrap">
                              {language === 'el' ? 'άτ.' : 'ppl'}
                            </span>
                          </div>
                          <span className="text-muted-foreground text-xs">→</span>
                          <div className="flex items-center gap-1 sm:gap-2 flex-nowrap">
                            <span className="text-muted-foreground text-xs">€</span>
                            <Input type="number" value={tier.prepaidChargeCents / 100} onChange={e => updateTier(type, index, {
                      prepaidChargeCents: Math.round(parseFloat(e.target.value || '0') * 100)
                    })} min={0} step={5} className="w-16 sm:w-24 h-7 sm:h-10 text-[11px] sm:text-sm" />
                          </div>
                          {config.tiers.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => removeTier(type, index)} className="h-6 w-6 sm:h-8 sm:w-8 text-destructive flex-shrink-0">
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>}
                        </div>)}
                    </div>
                  </div>;
          })}

            </div>}

          {/* FREE ENTRY CONFIG */}
          {formData.eventType === 'free_entry' && <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4 p-3 sm:p-4 bg-muted/30 rounded-lg">
              <h4 className="font-semibold text-xs sm:text-base flex items-center gap-2">
                <Gift className="h-3 w-3 sm:h-4 sm:w-4" />
                {t.freeEntryConfig}
              </h4>
              
              <p className="text-xs sm:text-sm font-medium">{t.freeEntryDeclarations}</p>
              
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Checkbox id="noTicket" checked={formData.freeEntryAccepted.noTicket} onCheckedChange={checked => updateField('freeEntryAccepted', {
                ...formData.freeEntryAccepted,
                noTicket: !!checked
              })} />
                  <Label htmlFor="noTicket" className="cursor-pointer text-xs sm:text-sm">{t.noTicketRequired}</Label>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <Checkbox id="noMinSpend" checked={formData.freeEntryAccepted.noMinSpend} onCheckedChange={checked => updateField('freeEntryAccepted', {
                ...formData.freeEntryAccepted,
                noMinSpend: !!checked
              })} />
                  <Label htmlFor="noMinSpend" className="cursor-pointer text-xs sm:text-sm">{t.noMinSpend}</Label>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <Checkbox id="noReservation" checked={formData.freeEntryAccepted.noReservation} onCheckedChange={checked => updateField('freeEntryAccepted', {
                ...formData.freeEntryAccepted,
                noReservation: !!checked
              })} />
                  <Label htmlFor="noReservation" className="cursor-pointer text-xs sm:text-sm">{t.noReservationRequired}</Label>
                </div>
              </div>
              
            </div>}
        </SectionCard>

        {/* Terms & Conditions (Optional) */}
        <div className="space-y-2">
          <Label className="text-xs sm:text-sm">{t.termsConditions}</Label>
          <Textarea value={formData.termsAndConditions} onChange={e => updateField('termsAndConditions', e.target.value)} placeholder={t.termsPlaceholder} className="min-h-[80px] text-xs sm:text-sm resize-none" maxLength={500} />
          <p className="text-[9px] sm:text-xs text-muted-foreground">
            {500 - formData.termsAndConditions.length} {language === 'el' ? 'χαρακτήρες απομένουν' : 'characters remaining'}
          </p>
        </div>

        {/* Submit Button */}
        <Button type="button" onClick={handleSubmit} disabled={isSubmitting} className="w-full h-10 sm:h-12 text-sm sm:text-lg" size="lg">
          {isSubmitting ? <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              {t.publishing}
            </> : t.publishEvent}
        </Button>
      </CardContent>

      {/* Crop Dialog */}
      <ImageCropDialog open={cropDialogOpen} onClose={() => setCropDialogOpen(false)} imageSrc={tempImageSrc} onCropComplete={handleCropComplete} />

      {/* Boost Dialog */}
      {createdEventId && <EventBoostDialog eventId={createdEventId} eventTitle={formData.title} hasActiveSubscription={false} remainingBudgetCents={0} open={boostDialogOpen} onOpenChange={open => {
      setBoostDialogOpen(open);
      if (!open) {
        navigate('/dashboard-business/events');
      }
    }} />}
    </Card>;
};
export default EventCreationForm;
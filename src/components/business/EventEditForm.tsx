import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Calendar, Clock, MapPin, Ticket, Users, Gift, Plus, Trash2, AlertTriangle, Check, Pencil } from "lucide-react";
import { ImageUploadField } from "./ImageUploadField";
import { ImageCropDialog } from "./ImageCropDialog";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { compressImage } from "@/lib/imageCompression";
import { useLanguage } from "@/hooks/useLanguage";
import { useCommissionRate } from "@/hooks/useCommissionRate";
import { cn } from "@/lib/utils";
import { TicketTierEditor, TicketTier, validateTicketTiers } from "@/components/tickets/TicketTierEditor";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
}) => (
  <div className="space-y-4">
    <div className="flex items-center gap-3 pb-2 border-b">
      <h3 className="font-semibold text-lg">{title}</h3>
      {required && (
        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
          {requiredLabel}
        </span>
      )}
    </div>
    <div className="space-y-4">
      {children}
    </div>
  </div>
);

interface CommissionBannerProps {
  platformFeeLabel: string;
  commissionPercent: number;
  upgradeHint: string;
}

const CommissionBanner: React.FC<CommissionBannerProps> = ({ 
  platformFeeLabel, 
  commissionPercent, 
  upgradeHint 
}) => (
  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
    <div className="flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
      <div>
        <p className="font-medium text-amber-900 dark:text-amber-100">
          {platformFeeLabel} {commissionPercent}%
        </p>
        <p className="text-sm text-amber-700 dark:text-amber-300">
          {upgradeHint}
        </p>
      </div>
    </div>
  </div>
);

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
  title: string;
  description: string;
  startAt: Date | null;
  appearanceMode: AppearanceMode;
  appearanceHours: number;
  appearanceCustomHours: number;
  appearanceStartDate: Date | null;
  appearanceEndDate: Date | null;
  venueName: string;
  address: string;
  eventType: EventType | null;
  ticketTiers: TicketTier[];
  reservationFromTime: string;
  reservationToTime: string;
  selectedSeatingTypes: SeatingType[];
  seatingConfigs: Record<SeatingType, SeatingConfig>;
  cancellationHours: number;
  freeEntryAccepted: {
    noTicket: boolean;
    noMinSpend: boolean;
    noReservation: boolean;
  };
}

// ============================================
// TRANSLATIONS
// ============================================

const translations = {
  el: {
    editEvent: "Επεξεργασία Εκδήλωσης",
    step1: "1. Τίτλος Εκδήλωσης",
    step2: "2. Περιγραφή Εκδήλωσης",
    step3: "3. Ημερομηνία & Ώρα Έναρξης",
    step4: "4. Διάρκεια Εμφάνισης στο FOMO",
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
    currentImage: "Τρέχουσα εικόνα",
    chooseEventType: "Επιλέξτε τύπο εκδήλωσης",
    withTicket: "Με Εισιτήριο",
    withReservation: "Με Κράτηση",
    freeEntry: "Ελεύθερη Είσοδος",
    ticketConfig: "Ρυθμίσεις Εισιτηρίου",
    reservationConfig: "Ρυθμίσεις Κράτησης",
    freeEntryConfig: "Δήλωση Ελεύθερης Εισόδου",
    platformFee: "Προμήθεια πλατφόρμας:",
    upgradeHint: "Αναβαθμίστε το πλάνο σας για μικρότερη προμήθεια.",
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
    personRanges: "Εύρος ατόμων & Prepaid Minimum Charge",
    rangeHint: "Έως 3 εύρη ανά τύπο. Το ποσό αφορά όλη την παρέα.",
    addRange: "Προσθήκη εύρους",
    cancellationPolicy: "Πολιτική Ακύρωσης",
    freeCancellationUpTo: "Δωρεάν ακύρωση έως",
    hoursBeforeEvent: "ώρες πριν",
    cancellationNote: "Αργές ακυρώσεις και no-shows δεν επιστρέφουν το ποσό.",
    freeEntryDeclarations: "Δηλώνω ότι:",
    noTicketRequired: "Δεν απαιτείται εισιτήριο στην είσοδο",
    noMinSpend: "Δεν υπάρχει υποχρεωτικό minimum spend",
    noReservationRequired: "Δεν απαιτείται κράτηση για είσοδο",
    updateEvent: "Ενημέρωση Εκδήλωσης",
    updating: "Ενημέρωση...",
    allFieldsRequired: "Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία",
    eventUpdated: "Η εκδήλωση ενημερώθηκε επιτυχώς!",
    eventUpdateFailed: "Αποτυχία ενημέρωσης εκδήλωσης",
    acceptAllDeclarations: "Πρέπει να αποδεχτείτε όλες τις δηλώσεις",
    addAtLeastOneSeating: "Προσθέστε τουλάχιστον έναν τύπο θέσης",
    addAtLeastOneRange: "Κάθε τύπος θέσης χρειάζεται τουλάχιστον ένα εύρος ατόμων",
    cancel: "Ακύρωση",
    eventTypeReadonly: "Ο τύπος εκδήλωσης δεν μπορεί να αλλάξει",
    loading: "Φόρτωση...",
  },
  en: {
    editEvent: "Edit Event",
    step1: "1. Event Title",
    step2: "2. Event Description",
    step3: "3. Start Date & Time",
    step4: "4. Duration of Appearance in FOMO",
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
    currentImage: "Current image",
    chooseEventType: "Choose event type",
    withTicket: "With Ticket",
    withReservation: "With Reservation",
    freeEntry: "Free Entry",
    ticketConfig: "Ticket Settings",
    reservationConfig: "Reservation Settings",
    freeEntryConfig: "Free Entry Declaration",
    platformFee: "Platform fee:",
    upgradeHint: "Upgrade your plan for reduced commission.",
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
    personRanges: "Person Range & Prepaid Minimum Charge",
    rangeHint: "Up to 3 ranges per type. The amount is for the entire group.",
    addRange: "Add range",
    cancellationPolicy: "Cancellation Policy",
    freeCancellationUpTo: "Free cancellation up to",
    hoursBeforeEvent: "hours before",
    cancellationNote: "Late cancellations and no-shows forfeit the prepaid amount.",
    freeEntryDeclarations: "I declare that:",
    noTicketRequired: "No ticket required at the entrance",
    noMinSpend: "No mandatory minimum spend",
    noReservationRequired: "No reservation required for entry",
    updateEvent: "Update Event",
    updating: "Updating...",
    allFieldsRequired: "Please fill in all required fields",
    eventUpdated: "Event updated successfully!",
    eventUpdateFailed: "Failed to update event",
    acceptAllDeclarations: "You must accept all declarations",
    addAtLeastOneSeating: "Add at least one seating type",
    addAtLeastOneRange: "Each seating type needs at least one person range",
    cancel: "Cancel",
    eventTypeReadonly: "Event type cannot be changed",
    loading: "Loading...",
  },
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
  tiers: [{ minPeople: 2, maxPeople: 6, prepaidChargeCents: 10000 }],
});

// ============================================
// MAIN COMPONENT
// ============================================

interface EventEditFormProps {
  event: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const EventEditForm = ({ event, open, onOpenChange, onSuccess }: EventEditFormProps) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language];
  
  const { data: commissionData } = useCommissionRate(event?.business_id);
  const commissionPercent = commissionData?.commissionPercent ?? 12;
  
  const [isLoading, setIsLoading] = useState(true);
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
      sofa: getDefaultSeatingConfig('sofa'),
    },
    cancellationHours: 12,
    freeEntryAccepted: {
      noTicket: false,
      noMinSpend: false,
      noReservation: false,
    },
  });
  
  const [ticketValidationErrors, setTicketValidationErrors] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string>("");
  const [tempImageFile, setTempImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load existing event data
  useEffect(() => {
    if (open && event) {
      loadEventData();
    }
  }, [open, event]);

  const loadEventData = async () => {
    setIsLoading(true);
    try {
      // Determine event type
      let eventType: EventType | null = null;
      if (event.event_type === 'ticket') eventType = 'ticket';
      else if (event.event_type === 'reservation') eventType = 'reservation';
      else if (event.event_type === 'free_entry' || event.free_entry_declaration) eventType = 'free_entry';

      // Determine appearance mode
      let appearanceMode: AppearanceMode = 'hours';
      let appearanceHours = 24;
      if (event.appearance_mode === 'date_range') {
        appearanceMode = 'days';
      }

      // Load ticket tiers if ticket event
      let ticketTiers: TicketTier[] = [];
      if (eventType === 'ticket') {
        const { data: tiers } = await supabase
          .from('ticket_tiers')
          .select('*')
          .eq('event_id', event.id)
          .order('sort_order');
        
        if (tiers) {
          ticketTiers = tiers.map((tier, index) => ({
            id: tier.id,
            name: tier.name,
            description: tier.description || '',
            price_cents: tier.price_cents,
            currency: tier.currency || 'EUR',
            quantity_total: tier.quantity_total,
            max_per_order: tier.max_per_order,
            sort_order: tier.sort_order ?? index,
            dress_code: tier.dress_code || null,
          }));
        }
      }

      // Load seating types if reservation event
      let selectedSeatingTypes: SeatingType[] = [];
      let seatingConfigs = {
        bar: getDefaultSeatingConfig('bar'),
        table: getDefaultSeatingConfig('table'),
        vip: getDefaultSeatingConfig('vip'),
        sofa: getDefaultSeatingConfig('sofa'),
      };

      if (eventType === 'reservation') {
        const { data: seatingTypes } = await supabase
          .from('reservation_seating_types')
          .select('*')
          .eq('event_id', event.id);

        if (seatingTypes && seatingTypes.length > 0) {
          for (const st of seatingTypes) {
            const type = st.seating_type as SeatingType;
            selectedSeatingTypes.push(type);

            const { data: tiers } = await supabase
              .from('seating_type_tiers')
              .select('*')
              .eq('seating_type_id', st.id)
              .order('min_people');

            seatingConfigs[type] = {
              type,
              availableSlots: st.available_slots,
              tiers: tiers?.map(tier => ({
                minPeople: tier.min_people,
                maxPeople: tier.max_people,
                prepaidChargeCents: tier.prepaid_min_charge_cents,
              })) || [{ minPeople: 2, maxPeople: 6, prepaidChargeCents: 10000 }],
            };
          }
        }
      }

      setFormData({
        title: event.title || '',
        description: event.description || '',
        startAt: event.start_at ? new Date(event.start_at) : null,
        appearanceMode,
        appearanceHours,
        appearanceCustomHours: 48,
        appearanceStartDate: event.appearance_start_at ? new Date(event.appearance_start_at) : null,
        appearanceEndDate: event.appearance_end_at ? new Date(event.appearance_end_at) : null,
        venueName: event.venue_name || '',
        address: event.location || '',
        eventType,
        ticketTiers,
        reservationFromTime: event.reservation_hours_from?.substring(0, 5) || '20:00',
        reservationToTime: event.reservation_hours_to?.substring(0, 5) || '02:00',
        selectedSeatingTypes,
        seatingConfigs,
        cancellationHours: 12,
        freeEntryAccepted: {
          noTicket: event.free_entry_declaration || false,
          noMinSpend: event.free_entry_declaration || false,
          noReservation: event.free_entry_declaration || false,
        },
      });

      setExistingCoverUrl(event.cover_image_url || null);
    } catch (error) {
      console.error('Error loading event data:', error);
      toast.error(t.eventUpdateFailed);
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const descriptionWordCount = countWords(formData.description);
  const maxWords = 60;
  const wordsRemaining = maxWords - descriptionWordCount;

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

  const toggleSeatingType = (type: SeatingType) => {
    const current = formData.selectedSeatingTypes;
    if (current.includes(type)) {
      updateField('selectedSeatingTypes', current.filter(t => t !== type));
    } else if (current.length < 4) {
      updateField('selectedSeatingTypes', [...current, type]);
    }
  };

  const updateSeatingConfig = (type: SeatingType, updates: Partial<SeatingConfig>) => {
    setFormData(prev => ({
      ...prev,
      seatingConfigs: {
        ...prev.seatingConfigs,
        [type]: { ...prev.seatingConfigs[type], ...updates },
      },
    }));
  };

  const addTier = (type: SeatingType) => {
    const config = formData.seatingConfigs[type];
    if (config.tiers.length >= 3) return;
    const lastTier = config.tiers[config.tiers.length - 1];
    const newTier: PersonTier = {
      minPeople: lastTier ? lastTier.maxPeople + 1 : 1,
      maxPeople: lastTier ? lastTier.maxPeople + 4 : 6,
      prepaidChargeCents: lastTier ? lastTier.prepaidChargeCents + 5000 : 10000,
    };
    updateSeatingConfig(type, { tiers: [...config.tiers, newTier] });
  };

  const removeTier = (type: SeatingType, index: number) => {
    const config = formData.seatingConfigs[type];
    if (config.tiers.length <= 1) return;
    updateSeatingConfig(type, { tiers: config.tiers.filter((_, i) => i !== index) });
  };

  const updateTier = (type: SeatingType, index: number, updates: Partial<PersonTier>) => {
    const config = formData.seatingConfigs[type];
    const newTiers = config.tiers.map((tier, i) => 
      i === index ? { ...tier, ...updates } : tier
    );
    updateSeatingConfig(type, { tiers: newTiers });
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.title.trim() || !formData.description.trim() || !formData.startAt || !formData.address.trim()) {
      toast.error(t.allFieldsRequired);
      return;
    }

    if (formData.eventType === 'free_entry') {
      const { noTicket, noMinSpend, noReservation } = formData.freeEntryAccepted;
      if (!noTicket || !noMinSpend || !noReservation) {
        toast.error(t.acceptAllDeclarations);
        return;
      }
    }

    if (formData.eventType === 'reservation') {
      if (formData.selectedSeatingTypes.length === 0) {
        toast.error(t.addAtLeastOneSeating);
        return;
      }
      for (const type of formData.selectedSeatingTypes) {
        if (formData.seatingConfigs[type].tiers.length === 0) {
          toast.error(t.addAtLeastOneRange);
          return;
        }
      }
    }

    if (formData.eventType === 'ticket') {
      const errors = validateTicketTiers(formData.ticketTiers, language);
      if (errors.length > 0) {
        setTicketValidationErrors(errors);
        toast.error(t.allFieldsRequired);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Upload new cover image if changed
      let coverImageUrl = existingCoverUrl;
      if (coverImage) {
        const compressed = await compressImage(coverImage);
        const fileName = `${event.business_id}-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('event-covers')
          .upload(fileName, compressed);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('event-covers')
          .getPublicUrl(fileName);

        coverImageUrl = urlData.publicUrl;
      }

      // Calculate appearance dates
      let appearanceStart: Date | null = null;
      let appearanceEnd: Date | null = null;

      if (formData.appearanceMode === 'hours') {
        const hours = formData.appearanceHours === -1 
          ? formData.appearanceCustomHours 
          : formData.appearanceHours;
        appearanceStart = new Date();
        appearanceEnd = new Date(formData.startAt!.getTime() + hours * 60 * 60 * 1000);
      } else {
        appearanceStart = formData.appearanceStartDate;
        appearanceEnd = formData.appearanceEndDate;
      }

      // Calculate end time (3 hours after start)
      const endAt = new Date(formData.startAt!.getTime() + 3 * 60 * 60 * 1000);

      // Update event
      const { error: updateError } = await supabase
        .from('events')
        .update({
          title: formData.title.trim(),
          description: formData.description.trim(),
          location: formData.address.trim(),
          venue_name: formData.venueName.trim(),
          start_at: formData.startAt?.toISOString(),
          end_at: endAt.toISOString(),
          cover_image_url: coverImageUrl,
          appearance_mode: formData.appearanceMode === 'hours' ? 'hourly' : 'date_range',
          appearance_start_at: appearanceStart?.toISOString() || null,
          appearance_end_at: appearanceEnd?.toISOString() || null,
          reservation_hours_from: formData.eventType === 'reservation' ? formData.reservationFromTime : null,
          reservation_hours_to: formData.eventType === 'reservation' ? formData.reservationToTime : null,
        })
        .eq('id', event.id);

      if (updateError) throw updateError;

      // Update ticket tiers if ticket event
      if (formData.eventType === 'ticket') {
        // Delete existing tiers
        await supabase.from('ticket_tiers').delete().eq('event_id', event.id);
        
        // Insert new tiers
        const tiersToInsert = formData.ticketTiers.map((tier, index) => ({
          event_id: event.id,
          name: tier.name,
          description: tier.description || null,
          price_cents: tier.price_cents,
          currency: tier.currency || 'EUR',
          quantity_total: tier.quantity_total,
          max_per_order: tier.max_per_order,
          sort_order: index,
          dress_code: tier.dress_code || null,
        }));
        
        if (tiersToInsert.length > 0) {
          await supabase.from('ticket_tiers').insert(tiersToInsert);
        }
      }

      // Update seating types if reservation event
      if (formData.eventType === 'reservation') {
        // Get existing seating types
        const { data: existingSeating } = await supabase
          .from('reservation_seating_types')
          .select('id')
          .eq('event_id', event.id);

        // Delete existing tiers and seating types
        if (existingSeating) {
          for (const s of existingSeating) {
            await supabase.from('seating_type_tiers').delete().eq('seating_type_id', s.id);
          }
        }
        await supabase.from('reservation_seating_types').delete().eq('event_id', event.id);

        // Insert new seating types
        for (const seatingType of formData.selectedSeatingTypes) {
          const config = formData.seatingConfigs[seatingType];

          const { data: seatingData, error: seatingError } = await supabase
            .from('reservation_seating_types')
            .insert({
              event_id: event.id,
              seating_type: seatingType,
              available_slots: config.availableSlots,
              slots_booked: 0,
              no_show_policy: 'non_refundable',
            })
            .select()
            .single();

          if (seatingError || !seatingData) throw seatingError || new Error('Failed to create seating type');

          const tiersToInsert = config.tiers.map((tier) => ({
            seating_type_id: seatingData.id,
            min_people: tier.minPeople,
            max_people: tier.maxPeople,
            prepaid_min_charge_cents: tier.prepaidChargeCents,
          }));

          const { error: tiersError } = await supabase.from('seating_type_tiers').insert(tiersToInsert);
          if (tiersError) throw tiersError;
        }
      }

      toast.success(t.eventUpdated);
      onOpenChange(false);
      onSuccess();

    } catch (err) {
      console.error('Error updating event:', err);
      toast.error(t.eventUpdateFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <div className="space-y-8 p-6 max-h-[80vh] overflow-y-auto">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">{t.loading}</span>
        </div>
      ) : (
        <>
          {/* Step 1: Title */}
          <SectionCard title={t.step1} required requiredLabel={t.required}>
            <Input
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder={t.titlePlaceholder}
              maxLength={100}
            />
          </SectionCard>

          {/* Step 2: Description */}
          <SectionCard title={t.step2} required requiredLabel={t.required}>
            <Textarea
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder={t.descriptionPlaceholder}
              rows={4}
            />
            <p className={cn(
              "text-sm",
              wordsRemaining >= 0 ? "text-muted-foreground" : "text-destructive font-medium"
            )}>
              {wordsRemaining >= 0 
                ? `${wordsRemaining} ${t.wordsRemaining}`
                : `${Math.abs(wordsRemaining)} ${t.wordsOver}`
              }
            </p>
          </SectionCard>

          {/* Step 3: Start Date & Time */}
          <SectionCard title={t.step3} required requiredLabel={t.required}>
            <DateTimePicker
              value={formData.startAt || undefined}
              onChange={(date) => updateField('startAt', date || null)}
              placeholder={t.selectDateTime}
            />
          </SectionCard>

          {/* Step 4: Appearance Duration */}
          <SectionCard title={t.step4} required requiredLabel={t.required}>
            <RadioGroup
              value={formData.appearanceMode}
              onValueChange={(v) => updateField('appearanceMode', v as AppearanceMode)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hours" id="edit-hours" />
                <Label htmlFor="edit-hours" className="flex items-center gap-2 cursor-pointer">
                  <Clock className="h-4 w-4" />
                  {t.byHours}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="days" id="edit-days" />
                <Label htmlFor="edit-days" className="flex items-center gap-2 cursor-pointer">
                  <Calendar className="h-4 w-4" />
                  {t.byDays}
                </Label>
              </div>
            </RadioGroup>

            {formData.appearanceMode === 'hours' && (
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 6, 12, 24].map((h) => (
                  <Button
                    key={h}
                    type="button"
                    variant={formData.appearanceHours === h ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateField('appearanceHours', h)}
                  >
                    {h} {t.hours}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant={formData.appearanceHours === -1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateField('appearanceHours', -1)}
                >
                  {t.custom}
                </Button>
              </div>
            )}

            {formData.appearanceMode === 'hours' && formData.appearanceHours === -1 && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={formData.appearanceCustomHours}
                  onChange={(e) => updateField('appearanceCustomHours', parseInt(e.target.value) || 1)}
                  min={1}
                  max={168}
                  className="w-24"
                />
                <span className="text-muted-foreground">{t.hours}</span>
              </div>
            )}

            {formData.appearanceMode === 'days' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.fromDate}</Label>
                  <DateTimePicker
                    value={formData.appearanceStartDate || undefined}
                    onChange={(date) => updateField('appearanceStartDate', date || null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.toDate}</Label>
                  <DateTimePicker
                    value={formData.appearanceEndDate || undefined}
                    onChange={(date) => updateField('appearanceEndDate', date || null)}
                  />
                </div>
              </div>
            )}
          </SectionCard>

          {/* Step 5: Venue */}
          <SectionCard title={t.step5} required requiredLabel={t.required}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t.venueName}</Label>
                <Input
                  value={formData.venueName}
                  onChange={(e) => updateField('venueName', e.target.value)}
                  placeholder={t.venueNamePlaceholder}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {t.location}
                </Label>
                <Input
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder={t.locationPlaceholder}
                />
              </div>
            </div>
          </SectionCard>

          {/* Step 6: Cover Image */}
          <SectionCard title={t.step6} required requiredLabel={t.required}>
            {existingCoverUrl && !coverImage && (
              <div className="mb-4">
                <img 
                  src={existingCoverUrl} 
                  alt="Current cover" 
                  className="w-full h-48 object-cover rounded-lg"
                />
                <p className="text-sm text-muted-foreground mt-1">{t.currentImage}</p>
              </div>
            )}
            <ImageUploadField
              label={t.coverImage}
              language={language}
              onFileSelect={handleFileSelect}
              aspectRatio="16/9"
              maxSizeMB={5}
            />
          </SectionCard>

          {/* Step 7: Event Type (Read-only display) */}
          <SectionCard title={t.step7} required requiredLabel={t.required}>
            <p className="text-sm text-muted-foreground mb-4">{t.eventTypeReadonly}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className={cn(
                "p-6 rounded-xl border-2 text-center space-y-3",
                formData.eventType === 'ticket' ? "border-primary bg-primary/5" : "border-muted opacity-50"
              )}>
                <Ticket className="h-8 w-8 mx-auto text-primary" />
                <p className="font-medium">{t.withTicket}</p>
              </div>
              <div className={cn(
                "p-6 rounded-xl border-2 text-center space-y-3",
                formData.eventType === 'reservation' ? "border-primary bg-primary/5" : "border-muted opacity-50"
              )}>
                <Users className="h-8 w-8 mx-auto text-primary" />
                <p className="font-medium">{t.withReservation}</p>
              </div>
              <div className={cn(
                "p-6 rounded-xl border-2 text-center space-y-3",
                formData.eventType === 'free_entry' ? "border-primary bg-primary/5" : "border-muted opacity-50"
              )}>
                <Gift className="h-8 w-8 mx-auto text-primary" />
                <p className="font-medium">{t.freeEntry}</p>
              </div>
            </div>

            {/* TICKET CONFIG */}
            {formData.eventType === 'ticket' && (
              <div className="mt-6 space-y-4 p-4 bg-muted/30 rounded-lg">
                <h4 className="font-semibold flex items-center gap-2">
                  <Ticket className="h-4 w-4" />
                  {t.ticketConfig}
                </h4>
                <TicketTierEditor
                  tiers={formData.ticketTiers}
                  onTiersChange={(tiers) => updateField('ticketTiers', tiers)}
                  commissionPercent={commissionPercent}
                  validationErrors={ticketValidationErrors}
                />
              </div>
            )}

            {/* RESERVATION CONFIG */}
            {formData.eventType === 'reservation' && (
              <div className="mt-6 space-y-6 p-4 bg-muted/30 rounded-lg">
                <h4 className="font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {t.reservationConfig}
                </h4>
                
                <CommissionBanner platformFeeLabel={t.platformFee} commissionPercent={commissionPercent} upgradeHint={t.upgradeHint} />
                
                {/* Reservation Hours */}
                <div className="space-y-2">
                  <Label>{t.reservationHours}</Label>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{t.from}</span>
                      <Input
                        type="time"
                        value={formData.reservationFromTime}
                        onChange={(e) => updateField('reservationFromTime', e.target.value)}
                        className="w-32"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{t.to}</span>
                      <Input
                        type="time"
                        value={formData.reservationToTime}
                        onChange={(e) => updateField('reservationToTime', e.target.value)}
                        className="w-32"
                      />
                    </div>
                  </div>
                </div>

                {/* Seating Types Selection */}
                <div className="space-y-3">
                  <Label>{t.seatingTypes}</Label>
                  <p className="text-sm text-muted-foreground">{t.selectSeatingTypes}</p>
                  <div className="flex flex-wrap gap-2">
                    {(['bar', 'table', 'vip', 'sofa'] as SeatingType[]).map((type) => (
                      <Button
                        key={type}
                        type="button"
                        variant={formData.selectedSeatingTypes.includes(type) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleSeatingType(type)}
                      >
                        {formData.selectedSeatingTypes.includes(type) && <Check className="h-3 w-3 mr-1" />}
                        {t[type]}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Config for each selected type */}
                {formData.selectedSeatingTypes.map((type) => {
                  const config = formData.seatingConfigs[type];
                  return (
                    <div key={type} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium capitalize">{t[type]}</h5>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>{t.availableBookings}</Label>
                        <Input
                          type="number"
                          value={config.availableSlots}
                          onChange={(e) => updateSeatingConfig(type, { availableSlots: parseInt(e.target.value) || 1 })}
                          min={1}
                          className="w-32"
                        />
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>{t.personRanges}</Label>
                          {config.tiers.length < 3 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => addTier(type)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              {t.addRange}
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{t.rangeHint}</p>
                        
                        {config.tiers.map((tier, index) => (
                          <div key={index} className="flex items-center gap-3 bg-background p-3 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={tier.minPeople}
                                onChange={(e) => updateTier(type, index, { minPeople: parseInt(e.target.value) || 1 })}
                                min={1}
                                className="w-16"
                              />
                              <span className="text-muted-foreground">-</span>
                              <Input
                                type="number"
                                value={tier.maxPeople}
                                onChange={(e) => updateTier(type, index, { maxPeople: parseInt(e.target.value) || 1 })}
                                min={tier.minPeople}
                                className="w-16"
                              />
                              <span className="text-sm text-muted-foreground whitespace-nowrap">
                                {language === 'el' ? 'άτομα' : 'people'}
                              </span>
                            </div>
                            <span className="text-muted-foreground">→</span>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">€</span>
                              <Input
                                type="number"
                                value={tier.prepaidChargeCents / 100}
                                onChange={(e) => updateTier(type, index, { prepaidChargeCents: Math.round(parseFloat(e.target.value || '0') * 100) })}
                                min={0}
                                step={5}
                                className="w-24"
                              />
                            </div>
                            {config.tiers.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeTier(type, index)}
                                className="h-8 w-8 text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Cancellation Policy */}
                <div className="space-y-3 pt-4 border-t">
                  <Label>{t.cancellationPolicy}</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{t.freeCancellationUpTo}</span>
                    <Select
                      value={String(formData.cancellationHours)}
                      onValueChange={(v) => updateField('cancellationHours', parseInt(v))}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6</SelectItem>
                        <SelectItem value="12">12</SelectItem>
                        <SelectItem value="24">24</SelectItem>
                        <SelectItem value="48">48</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">{t.hoursBeforeEvent}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t.cancellationNote}</p>
                </div>
              </div>
            )}

            {/* FREE ENTRY CONFIG */}
            {formData.eventType === 'free_entry' && (
              <div className="mt-6 space-y-4 p-4 bg-muted/30 rounded-lg">
                <h4 className="font-semibold flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  {t.freeEntryConfig}
                </h4>
                
                <p className="text-sm font-medium">{t.freeEntryDeclarations}</p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="edit-noTicket"
                      checked={formData.freeEntryAccepted.noTicket}
                      onCheckedChange={(checked) => 
                        updateField('freeEntryAccepted', { ...formData.freeEntryAccepted, noTicket: !!checked })
                      }
                    />
                    <Label htmlFor="edit-noTicket" className="cursor-pointer">{t.noTicketRequired}</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="edit-noMinSpend"
                      checked={formData.freeEntryAccepted.noMinSpend}
                      onCheckedChange={(checked) => 
                        updateField('freeEntryAccepted', { ...formData.freeEntryAccepted, noMinSpend: !!checked })
                      }
                    />
                    <Label htmlFor="edit-noMinSpend" className="cursor-pointer">{t.noMinSpend}</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="edit-noReservation"
                      checked={formData.freeEntryAccepted.noReservation}
                      onCheckedChange={(checked) => 
                        updateField('freeEntryAccepted', { ...formData.freeEntryAccepted, noReservation: !!checked })
                      }
                    />
                    <Label htmlFor="edit-noReservation" className="cursor-pointer">{t.noReservationRequired}</Label>
                  </div>
                </div>
              </div>
            )}
          </SectionCard>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              {t.cancel}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t.updating}
                </>
              ) : (
                t.updateEvent
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Pencil className="h-6 w-6 text-primary" />
              {t.editEvent}
            </DialogTitle>
          </DialogHeader>
          {content}
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

export default EventEditForm;

import { useState, useEffect } from "react";
import { DeferredPaymentSection } from "./DeferredPaymentSection";
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
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Clock, MapPin, Ticket, Users, Gift, Plus, Trash2, AlertTriangle, Check, Pencil } from "lucide-react";
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
// HELPER COMPONENTS
// ============================================

interface SectionCardProps {
  title: string;
  required?: boolean;
  requiredLabel: string;
  children: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({ title, required = false, requiredLabel, children }) => (
  <div className="space-y-3 sm:space-y-4">
    <div className="flex items-center gap-2 sm:gap-3 pb-2 border-b">
      <h3 className="font-semibold text-[11px] sm:text-lg whitespace-normal leading-tight">{title}</h3>
      {required && (
        <span className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1.5 sm:px-2 py-0.5 rounded-full">
          {requiredLabel}
        </span>
      )}
    </div>
    <div className="space-y-3 sm:space-y-4">{children}</div>
  </div>
);

interface CommissionBannerProps {
  platformFeeLabel: string;
  commissionPercent: number;
  upgradeHint: string;
  isElitePlan?: boolean;
}

const CommissionBanner: React.FC<CommissionBannerProps> = ({ platformFeeLabel, commissionPercent, upgradeHint, isElitePlan = false }) => (
  <div className={cn(
    "rounded-lg p-2 sm:p-4 border",
    isElitePlan
      ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
      : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
  )}>
    <div className="flex items-start gap-2 sm:gap-3">
      {isElitePlan ? (
        <Check className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
      ) : (
        <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 mt-0.5 flex-shrink-0" />
      )}
      <div>
        <p className={cn(
          "font-medium text-[11px] sm:text-base",
          isElitePlan ? "text-emerald-900 dark:text-emerald-100" : "text-amber-900 dark:text-amber-100"
        )}>
          {platformFeeLabel} {commissionPercent}%
        </p>
        {!isElitePlan && (
          <p className="text-[10px] sm:text-sm text-amber-700 dark:text-amber-300">{upgradeHint}</p>
        )}
      </div>
    </div>
  </div>
);

// ============================================
// TYPES
// ============================================

type EventType = 'ticket' | 'reservation' | 'free_entry' | 'ticket_and_reservation';
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
  ticketCategoryName: string;
  ticketPriceCents: number;
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
  freeEntryAccepted: {
    noTicket: boolean;
    noMinSpend: boolean;
    noReservation: boolean;
  };
  termsAndConditions: string;
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
    currentImage: "Τρέχουσα εικόνα",
    chooseEventType: "Επιλέξτε τύπο εκδήλωσης",
    withTicket: "Με Εισιτήριο",
    withReservation: "Με Κράτηση",
    freeEntry: "Ελεύθερη Είσοδος",
    ticketAndReservation: "Εισιτήριο & Κράτηση",
    ticketConfig: "Ρυθμίσεις Εισιτηρίου",
    reservationConfig: "Ρυθμίσεις Κράτησης",
    freeEntryConfig: "Δήλωση Ελεύθερης Εισόδου",
    platformFee: "Προμήθεια πλατφόρμας:",
    upgradeHint: "Αναβαθμίστε το πλάνο σας για μικρότερη προμήθεια.",
    ticketNameLabel: "Όνομα κατηγορίας",
    priceLabel: "Τιμή (€)",
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
    personRanges: "Εύρος ατόμων & Τιμή",
    rangeHint: "Έως 3 εύρη ανά τύπο. Το ποσό αφορά όλη την παρέα.",
    addRange: "Προσθήκη εύρους",
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
    loading: "Φόρτωση...",
    termsConditions: "Όροι & Προϋποθέσεις (προαιρετικό)",
    termsPlaceholder: "π.χ. Δεν επιτρέπεται η είσοδος σε ανηλίκους...",
  },
  en: {
    editEvent: "Edit Event",
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
    currentImage: "Current image",
    chooseEventType: "Choose event type",
    withTicket: "With Ticket",
    withReservation: "With Reservation",
    freeEntry: "Free Entry",
    ticketAndReservation: "Ticket & Reservation",
    ticketConfig: "Ticket Settings",
    reservationConfig: "Reservation Settings",
    freeEntryConfig: "Free Entry Declaration",
    platformFee: "Platform fee:",
    upgradeHint: "Upgrade your plan for reduced commission.",
    ticketNameLabel: "Category name",
    priceLabel: "Price (€)",
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
    personRanges: "Person Range & Price",
    rangeHint: "Up to 3 ranges per type. The amount is for the entire group.",
    addRange: "Add range",
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
    loading: "Loading...",
    termsConditions: "Terms & Conditions (optional)",
    termsPlaceholder: "e.g. No minors allowed...",
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
  ticketCategoryName: type === 'bar' ? 'Bar' : type === 'table' ? 'Table' : type === 'vip' ? 'VIP' : 'Sofa',
  ticketPriceCents: 0,
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
  const isElitePlan = commissionData?.planSlug === 'elite';
  
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
    freeEntryAccepted: {
      noTicket: false,
      noMinSpend: false,
      noReservation: false,
    },
    termsAndConditions: '',
  });
  
  const [ticketValidationErrors, setTicketValidationErrors] = useState<string[]>([]);
  const [walkInEnabled, setWalkInEnabled] = useState(false);
  const [walkInTicketTiers, setWalkInTicketTiers] = useState<TicketTier[]>([]);
  const [walkInTicketValidationErrors, setWalkInTicketValidationErrors] = useState<string[]>([]);
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
      if (event.event_type === 'ticket_and_reservation') eventType = 'ticket_and_reservation';
      else if (event.event_type === 'ticket') eventType = 'ticket';
      else if (event.event_type === 'reservation') eventType = 'reservation';
      else if (event.event_type === 'free_entry' || event.free_entry_declaration) eventType = 'free_entry';

      // Determine appearance mode
      let appearanceMode: AppearanceMode = 'hours';
      let appearanceHours = 24;
      if (event.appearance_mode === 'date_range') {
        appearanceMode = 'days';
      }

      // Load ticket tiers
      let ticketTiers: TicketTier[] = [];
      let walkInTiers: TicketTier[] = [];
      let hasWalkIn = false;

      if (eventType === 'ticket' || eventType === 'ticket_and_reservation') {
        const { data: tiers } = await supabase
          .from('ticket_tiers')
          .select('*')
          .eq('event_id', event.id)
          .eq('active', true)
          .order('sort_order');
        
        if (tiers && eventType === 'ticket') {
          // For ticket-only events, all tiers are regular ticket tiers
          ticketTiers = tiers.map((tier, index) => ({
            id: tier.id,
            name: tier.name,
            description: tier.description || '',
            price_cents: tier.price_cents,
            currency: tier.currency || 'EUR',
            quantity_total: tier.quantity_total,
            max_per_order: tier.max_per_order,
            sort_order: tier.sort_order ?? index,
            dress_code: null,
          }));
        }
        // For hybrid events, tiers with quantity_total=999999 are reservation-linked
        // Others are walk-in tiers
        if (tiers && eventType === 'ticket_and_reservation') {
          for (const tier of tiers) {
            if (tier.quantity_total === 999999) {
              // This is a reservation-linked tier - will be matched to seating configs below
            } else {
              hasWalkIn = true;
              walkInTiers.push({
                id: tier.id,
                name: tier.name,
                description: tier.description || '',
                price_cents: tier.price_cents,
                currency: tier.currency || 'EUR',
                quantity_total: tier.quantity_total,
                max_per_order: tier.max_per_order,
                sort_order: tier.sort_order ?? 0,
                dress_code: null,
              });
            }
          }
          // Store reservation-linked tiers for matching
          const reservationLinkedTiers = tiers.filter(t => t.quantity_total === 999999);
          // We'll use these below when loading seating configs
          (window as any).__tempReservationLinkedTiers = reservationLinkedTiers;
        }
      }

      // Load seating types
      let selectedSeatingTypes: SeatingType[] = [];
      let seatingConfigs = {
        bar: getDefaultSeatingConfig('bar'),
        table: getDefaultSeatingConfig('table'),
        vip: getDefaultSeatingConfig('vip'),
        sofa: getDefaultSeatingConfig('sofa'),
      };

      if (eventType === 'reservation' || eventType === 'ticket_and_reservation') {
        const { data: seatingTypes } = await supabase
          .from('reservation_seating_types')
          .select('*')
          .eq('event_id', event.id)
          .eq('paused', false);

        const reservationLinkedTiers = (window as any).__tempReservationLinkedTiers || [];
        delete (window as any).__tempReservationLinkedTiers;

        if (seatingTypes && seatingTypes.length > 0) {
          for (let i = 0; i < seatingTypes.length; i++) {
            const st = seatingTypes[i];
            const type = st.seating_type as SeatingType;
            selectedSeatingTypes.push(type);

            const { data: tiers } = await supabase
              .from('seating_type_tiers')
              .select('*')
              .eq('seating_type_id', st.id)
              .order('min_people');

            // Match reservation-linked ticket tier by sort_order index
            const linkedTier = reservationLinkedTiers[i];

            seatingConfigs[type] = {
              type,
              availableSlots: st.available_slots,
              ticketCategoryName: linkedTier?.name || getDefaultSeatingConfig(type).ticketCategoryName,
              ticketPriceCents: linkedTier?.price_cents || 0,
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
        freeEntryAccepted: {
          noTicket: event.free_entry_declaration || false,
          noMinSpend: event.free_entry_declaration || false,
          noReservation: event.free_entry_declaration || false,
        },
        termsAndConditions: event.terms_and_conditions || '',
      });

      setWalkInEnabled(hasWalkIn);
      setWalkInTicketTiers(walkInTiers);
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

    const isHybrid = formData.eventType === 'ticket_and_reservation';
    const hasReservation = formData.eventType === 'reservation' || isHybrid;

    if (hasReservation) {
      if (formData.selectedSeatingTypes.length === 0) {
        toast.error(t.addAtLeastOneSeating);
        return;
      }
      for (const type of formData.selectedSeatingTypes) {
        if (formData.seatingConfigs[type].tiers.length === 0) {
          toast.error(t.addAtLeastOneRange);
          return;
        }
        // ticketCategoryName auto-derived from seating type, no validation needed
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

    if (isHybrid && walkInEnabled) {
      const walkInErrors = validateTicketTiers(walkInTicketTiers, language);
      if (walkInErrors.length > 0) {
        setWalkInTicketValidationErrors(walkInErrors);
        toast.error(walkInErrors[0]);
        return;
      }
      if (walkInTicketTiers.length === 0) {
        toast.error(language === 'el'
          ? 'Προσθέστε τουλάχιστον μία κατηγορία Walk-in εισιτηρίου'
          : 'Add at least one walk-in ticket tier');
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
          event_type: formData.eventType === 'free_entry' ? 'free' : formData.eventType,
          accepts_reservations: hasReservation,
          reservation_hours_from: hasReservation ? formData.reservationFromTime : null,
          reservation_hours_to: hasReservation ? formData.reservationToTime : null,
          dress_code: null,
          terms_and_conditions: formData.termsAndConditions.trim() ? formData.termsAndConditions.trim() : null,
        })
        .eq('id', event.id);

      if (updateError) throw updateError;

      // ── Handle ticket tiers ──
      if (formData.eventType === 'ticket' || isHybrid) {
        // Get existing tiers
        const { data: existingTiers } = await supabase
          .from('ticket_tiers')
          .select('id, name, quantity_total')
          .eq('event_id', event.id);

        const existingTierIds = new Set(existingTiers?.map(t => t.id) || []);

        // Build new tiers list
        let allNewTiers: Array<{
          id?: string;
          event_id: string;
          name: string;
          description: string | null;
          price_cents: number;
          currency: string;
          quantity_total: number;
          max_per_order: number;
          sort_order: number;
          dress_code: string | null;
          active: boolean;
        }> = [];

        if (formData.eventType === 'ticket') {
          // Ticket-only: use formData.ticketTiers
          allNewTiers = formData.ticketTiers.map((tier, index) => ({
            id: tier.id,
            event_id: event.id,
            name: tier.name,
            description: tier.description || null,
            price_cents: tier.price_cents,
            currency: tier.currency || 'EUR',
            quantity_total: tier.quantity_total,
            max_per_order: tier.max_per_order,
            sort_order: index,
            dress_code: null,
            active: true,
          }));
        } else {
          // Hybrid: reservation-linked tiers from seating configs + walk-in tiers
          // Match existing ACTIVE reservation-linked tiers by name to preserve IDs (so updates work instead of creating duplicates)
          const existingReservationLinked = (existingTiers || []).filter(t => t.quantity_total === 999999);
          // Build a map: for each name, prefer the active tier ID
          const existingByName = new Map<string, string>();
          for (const t of existingReservationLinked) {
            // Only set if we haven't seen this name yet, or this one could be the "current" one
            if (!existingByName.has(t.name)) {
              existingByName.set(t.name, t.id);
            }
          }

          const reservationLinked = formData.selectedSeatingTypes.map((seatingType, index) => {
            const config = formData.seatingConfigs[seatingType];
            const maxPartySize = Math.max(...config.tiers.map(t => t.maxPeople), 1);
            const autoName = seatingType === 'bar' ? 'Bar' : seatingType === 'table' ? 'Table' : seatingType === 'vip' ? 'VIP' : 'Sofa';
            return {
              id: existingByName.get(autoName), // preserve existing tier ID for proper update
              event_id: event.id,
              name: autoName,
              description: null,
              price_cents: config.ticketPriceCents,
              currency: 'EUR',
              quantity_total: 999999,
              max_per_order: maxPartySize,
              sort_order: index,
              dress_code: null as string | null,
              active: true,
            };
          });

          const walkInTiersToSave = walkInEnabled
            ? walkInTicketTiers.map((tier, index) => ({
                id: tier.id,
                event_id: event.id,
                name: tier.name,
                description: tier.description || null,
                price_cents: tier.price_cents,
                currency: tier.currency || 'EUR',
                quantity_total: tier.quantity_total,
                max_per_order: tier.max_per_order,
                sort_order: reservationLinked.length + index,
                dress_code: null,
                active: true,
              }))
            : [];

          allNewTiers = [...reservationLinked, ...walkInTiersToSave];
        }

        const newTierIds = new Set(allNewTiers.filter(t => t.id).map(t => t.id));

        // Deactivate or delete removed tiers
        for (const existingTier of existingTiers || []) {
          if (!newTierIds.has(existingTier.id)) {
            const { count } = await supabase
              .from('tickets')
              .select('id', { count: 'exact', head: true })
              .eq('tier_id', existingTier.id);

            if (count && count > 0) {
              await supabase.from('ticket_tiers').update({ active: false }).eq('id', existingTier.id);
            } else {
              await supabase.from('ticket_tiers').delete().eq('id', existingTier.id);
            }
          }
        }

        // Upsert tiers
        for (const tier of allNewTiers) {
          const tierData = {
            event_id: tier.event_id,
            name: tier.name,
            description: tier.description,
            price_cents: tier.price_cents,
            currency: tier.currency,
            quantity_total: tier.quantity_total,
            max_per_order: tier.max_per_order,
            sort_order: tier.sort_order,
            dress_code: null,
            active: true,
          };

          if (tier.id && existingTierIds.has(tier.id)) {
            await supabase.from('ticket_tiers').update(tierData).eq('id', tier.id);
          } else {
            await supabase.from('ticket_tiers').insert(tierData);
          }
        }
      }

      // ── Handle seating types ──
      if (hasReservation) {
        const { data: existingSeating } = await supabase
          .from('reservation_seating_types')
          .select('id, seating_type')
          .eq('event_id', event.id);

        const existingMap = new Map(existingSeating?.map(s => [s.seating_type, s.id]) || []);
        const newSeatingTypes = new Set(formData.selectedSeatingTypes as string[]);

        // Remove old seating types
        const toRemove = existingSeating?.filter(s => !newSeatingTypes.has(s.seating_type)) || [];
        for (const s of toRemove) {
          const { count } = await supabase
            .from('reservations')
            .select('id', { count: 'exact', head: true })
            .eq('seating_type_id', s.id);
          if (!count || count === 0) {
            await supabase.from('seating_type_tiers').delete().eq('seating_type_id', s.id);
            await supabase.from('reservation_seating_types').delete().eq('id', s.id);
          } else {
            await supabase.from('reservation_seating_types').update({ paused: true }).eq('id', s.id);
          }
        }

        // Upsert seating types
        for (const seatingType of formData.selectedSeatingTypes) {
          const config = formData.seatingConfigs[seatingType];
          const existingId = existingMap.get(seatingType);

          let seatingId: string;

          if (existingId) {
            await supabase.from('reservation_seating_types')
              .update({ available_slots: config.availableSlots, paused: false })
              .eq('id', existingId);
            seatingId = existingId;
            await supabase.from('seating_type_tiers').delete().eq('seating_type_id', existingId);
          } else {
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
            seatingId = seatingData.id;
          }

          const tiersToInsert = config.tiers.map(tier => ({
            seating_type_id: seatingId,
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
      const message = (err as any)?.message || (err as any)?.error_description || t.eventUpdateFailed;
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <div className="space-y-5 sm:space-y-8 p-3 sm:p-6 max-h-[80vh] overflow-y-auto">
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
              className="text-xs sm:text-sm h-9 sm:h-10"
            />
          </SectionCard>

          {/* Step 2: Description */}
          <SectionCard title={t.step2} required requiredLabel={t.required}>
            <Textarea
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder={t.descriptionPlaceholder}
              rows={4}
              className="text-xs sm:text-sm"
            />
            <p className={cn(
              "text-xs sm:text-sm",
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
              className="flex gap-3 sm:gap-4"
            >
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <RadioGroupItem value="hours" id="edit-hours" />
                <Label htmlFor="edit-hours" className="flex items-center gap-1 sm:gap-2 cursor-pointer text-xs sm:text-sm whitespace-nowrap">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                  {t.byHours}
                </Label>
              </div>
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <RadioGroupItem value="days" id="edit-days" />
                <Label htmlFor="edit-days" className="flex items-center gap-1 sm:gap-2 cursor-pointer text-xs sm:text-sm whitespace-nowrap">
                  {t.byDays}
                </Label>
              </div>
            </RadioGroup>

            {formData.appearanceMode === 'hours' && (
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {[1, 2, 3, 6, 12, 24].map((h) => (
                  <Button
                    key={h}
                    type="button"
                    variant={formData.appearanceHours === h ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateField('appearanceHours', h)}
                    className="text-xs sm:text-sm px-2 sm:px-3 h-7 sm:h-9"
                  >
                    {h}h
                  </Button>
                ))}
                <Button
                  type="button"
                  variant={formData.appearanceHours === -1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateField('appearanceHours', -1)}
                  className="text-xs sm:text-sm px-2 sm:px-3 h-7 sm:h-9 whitespace-nowrap"
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
            <div className="space-y-3 sm:space-y-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm">{t.venueName}</Label>
                <Input
                  value={formData.venueName}
                  onChange={(e) => updateField('venueName', e.target.value)}
                  placeholder={t.venueNamePlaceholder}
                  className="text-xs sm:text-sm h-9 sm:h-10"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="flex items-center gap-2 text-xs sm:text-sm">
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                  {t.location}
                </Label>
                <Input
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder={t.locationPlaceholder}
                  className="text-xs sm:text-sm h-9 sm:h-10"
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

          {/* Step 7: Event Type - matches creation form grid style */}
          <SectionCard title={t.step7} required requiredLabel={t.required}>
            {(() => {
              const isTicketSelected = formData.eventType === 'ticket' || formData.eventType === 'ticket_and_reservation';
              const isReservationSelected = formData.eventType === 'reservation' || formData.eventType === 'ticket_and_reservation';
              const isFreeEntrySelected = formData.eventType === 'free_entry';

              const toggleTicket = () => {
                if (isTicketSelected && isReservationSelected) {
                  updateField('eventType', 'reservation');
                } else if (isTicketSelected) {
                  updateField('eventType', null);
                } else if (isReservationSelected) {
                  updateField('eventType', 'ticket_and_reservation');
                } else {
                  updateField('eventType', 'ticket');
                }
              };

              const toggleReservation = () => {
                if (isReservationSelected && isTicketSelected) {
                  updateField('eventType', 'ticket');
                } else if (isReservationSelected) {
                  updateField('eventType', null);
                } else if (isTicketSelected) {
                  updateField('eventType', 'ticket_and_reservation');
                } else {
                  updateField('eventType', 'reservation');
                }
              };

              const selectFreeEntry = () => {
                updateField('eventType', isFreeEntrySelected ? null : 'free_entry');
              };

              return (
                <>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-4">{t.chooseEventType}</p>
                  <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    {/* Ticket */}
                    <button type="button" onClick={toggleTicket} className={cn(
                      "p-3 sm:p-6 rounded-xl border-2 transition-all text-center space-y-1 sm:space-y-3",
                      isTicketSelected ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
                    )}>
                      <Ticket className="h-5 w-5 sm:h-8 sm:w-8 mx-auto text-primary" />
                      <p className="font-medium text-xs sm:text-base">{t.withTicket}</p>
                    </button>

                    {/* Reservation */}
                    <button type="button" onClick={toggleReservation} className={cn(
                      "p-3 sm:p-6 rounded-xl border-2 transition-all text-center space-y-1 sm:space-y-3",
                      isReservationSelected ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
                    )}>
                      <Users className="h-5 w-5 sm:h-8 sm:w-8 mx-auto text-primary" />
                      <p className="font-medium text-xs sm:text-base">{t.withReservation}</p>
                    </button>

                    {/* Free Entry */}
                    <button type="button" onClick={selectFreeEntry} className={cn(
                      "p-3 sm:p-6 rounded-xl border-2 transition-all text-center space-y-1 sm:space-y-3",
                      isFreeEntrySelected ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
                    )}>
                      <Gift className="h-5 w-5 sm:h-8 sm:w-8 mx-auto text-primary" />
                      <p className="font-medium text-xs sm:text-base">{t.freeEntry}</p>
                    </button>
                  </div>

                  {isTicketSelected && isReservationSelected && (
                    <div className="mt-2 p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
                      <p className="text-xs sm:text-sm font-medium text-primary text-center">{t.ticketAndReservation}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
                        {language === 'el'
                          ? 'Η αγορά εισιτηρίων δημιουργεί αυτόματα κράτηση. Η τιμή των εισιτηρίων πιστώνεται στο minimum charge.'
                          : 'Ticket purchases automatically create a reservation. Ticket prices are credited towards the minimum charge.'}
                      </p>
                    </div>
                  )}

                  {/* TICKET CONFIG - only for ticket-only events */}
                  {isTicketSelected && !isReservationSelected && (
                    <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4 p-3 sm:p-4 bg-muted/30 rounded-lg">
                      <TicketTierEditor
                        tiers={formData.ticketTiers}
                        onTiersChange={(tiers) => updateField('ticketTiers', tiers)}
                        commissionPercent={commissionPercent}
                        validationErrors={ticketValidationErrors}
                        autoEnabled={true}
                        hideQuantity={false}
                      />
                    </div>
                  )}

                  {/* RESERVATION CONFIG */}
                  {isReservationSelected && (
                    <div className="mt-4 sm:mt-6 space-y-4 sm:space-y-6 p-3 sm:p-4 bg-muted/30 rounded-lg">
                      {/* Reservation Hours */}
                      <div className="space-y-2">
                        <Label className="text-xs sm:text-sm">{t.reservationHours}</Label>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm text-muted-foreground">{t.from}</span>
                            <Input
                              type="time"
                              value={formData.reservationFromTime}
                              onChange={(e) => updateField('reservationFromTime', e.target.value)}
                              className="w-28 sm:w-32 h-8 sm:h-10 text-xs sm:text-sm"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm text-muted-foreground">{t.to}</span>
                            <Input
                              type="time"
                              value={formData.reservationToTime}
                              onChange={(e) => updateField('reservationToTime', e.target.value)}
                              className="w-28 sm:w-32 h-8 sm:h-10 text-xs sm:text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Seating Types Selection */}
                      <div className="space-y-2 sm:space-y-3">
                        <Label className="text-xs sm:text-sm">{t.seatingTypes}</Label>
                        <p className="text-[10px] sm:text-sm text-muted-foreground">{t.selectSeatingTypes}</p>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {(['bar', 'table', 'vip', 'sofa'] as SeatingType[]).map((type) => (
                            <Button
                              key={type}
                              type="button"
                              variant={formData.selectedSeatingTypes.includes(type) ? "default" : "outline"}
                              size="sm"
                              onClick={() => toggleSeatingType(type)}
                              className="text-[10px] sm:text-sm h-7 sm:h-9 px-2 sm:px-3"
                            >
                              {formData.selectedSeatingTypes.includes(type) && <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />}
                              {t[type]}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Config for each selected type */}
                      {formData.selectedSeatingTypes.map((type) => {
                        const config = formData.seatingConfigs[type];
                        return (
                          <div key={type} className="border rounded-lg p-2 sm:p-4 space-y-3 sm:space-y-4">
                            <div className="flex items-center justify-between">
                              <h5 className="font-medium capitalize text-xs sm:text-base">{t[type]}</h5>
                            </div>

                            {/* Price & Available Slots - compact for hybrid events */}
                            {isTicketSelected && isReservationSelected && (
                              <div className="flex items-end gap-3 sm:gap-4">
                                <div className="space-y-1.5 sm:space-y-2 shrink-0">
                                  <Label className="text-xs sm:text-sm">{t.priceLabel}</Label>
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    value={config.ticketPriceCents / 100}
                                    onChange={(e) => {
                                      const cleaned = e.target.value.replace(/[^0-9.]/g, '');
                                      const [euros, decimals = ''] = cleaned.split('.');
                                      const normalized = decimals ? `${euros}.${decimals.slice(0, 2)}` : euros;
                                      updateSeatingConfig(type, {
                                        ticketPriceCents: Math.round(parseFloat(normalized || '0') * 100)
                                      });
                                    }}
                                    className="w-20 sm:w-24 h-8 sm:h-10 text-xs sm:text-sm"
                                  />
                                </div>
                                <div className="space-y-1.5 sm:space-y-2">
                                  <Label className="text-xs sm:text-sm whitespace-nowrap">{t.availableBookings}</Label>
                                  <NumberInput
                                    value={config.availableSlots}
                                    onChange={(value) => updateSeatingConfig(type, { availableSlots: value })}
                                    min={1}
                                    max={999}
                                    className="w-20 sm:w-24 h-8 sm:h-10 text-xs sm:text-sm"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Available Slots - only show separately for non-hybrid */}
                            {!(isTicketSelected && isReservationSelected) && (
                            <div className="space-y-1.5 sm:space-y-2">
                              <Label className="text-xs sm:text-sm">{t.availableBookings}</Label>
                              <NumberInput
                                value={config.availableSlots}
                                onChange={(value) => updateSeatingConfig(type, { availableSlots: value })}
                                min={1}
                                max={999}
                                className="w-20 sm:w-24 h-8 sm:h-10 text-xs sm:text-sm"
                              />
                            </div>
                            )}

                            {/* Person Tiers */}
                            <div className="space-y-2 sm:space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs sm:text-sm">{t.personRanges}</Label>
                                {config.tiers.length < 3 && (
                                  <Button type="button" variant="ghost" size="sm" onClick={() => addTier(type)} className="text-[10px] sm:text-sm h-7 sm:h-9">
                                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                    {t.addRange}
                                  </Button>
                                )}
                              </div>
                              <p className="text-[10px] sm:text-xs text-muted-foreground">{t.rangeHint}</p>

                              {config.tiers.map((tier, index) => (
                                <div key={index} className="flex items-center gap-1 sm:gap-3 bg-background p-1.5 sm:p-3 rounded-lg flex-nowrap">
                                  <div className="flex items-center gap-0.5 sm:gap-2 flex-nowrap shrink-0">
                                    <NumberInput
                                      value={tier.minPeople}
                                      onChange={(value) => updateTier(type, index, { minPeople: value })}
                                      min={1}
                                      max={99}
                                      className="w-11 sm:w-16 h-6 sm:h-10 text-[10px] sm:text-sm"
                                    />
                                    <span className="text-muted-foreground text-[10px] sm:text-xs">-</span>
                                    <NumberInput
                                      value={tier.maxPeople}
                                      onChange={(value) => updateTier(type, index, { maxPeople: value })}
                                      min={tier.minPeople}
                                      max={99}
                                      className="w-11 sm:w-16 h-6 sm:h-10 text-[10px] sm:text-sm"
                                    />
                                    <span className="text-[9px] sm:text-sm text-muted-foreground whitespace-nowrap shrink-0 ml-0.5">
                                      {language === 'el' ? 'άτ.' : 'ppl'}
                                    </span>
                                  </div>
                                  <span className="text-muted-foreground text-[10px] sm:text-xs">→</span>
                                  <div className="flex items-center gap-0.5 sm:gap-2 flex-nowrap">
                                    <span className="text-muted-foreground text-[10px] sm:text-xs">€</span>
                                    <NumberInput
                                      value={Math.round(tier.prepaidChargeCents / 100)}
                                      onChange={(value) => updateTier(type, index, { prepaidChargeCents: value * 100 })}
                                      min={0}
                                      max={9999}
                                      className="w-14 sm:w-20 h-6 sm:h-10 text-[10px] sm:text-sm"
                                    />
                                  </div>
                                  {config.tiers.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeTier(type, index)}
                                      className="h-5 w-5 sm:h-8 sm:w-8 text-destructive flex-shrink-0 p-0"
                                    >
                                      <Trash2 className="h-2.5 w-2.5 sm:h-4 sm:w-4" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* FREE ENTRY CONFIG */}
                  {isFreeEntrySelected && (
                    <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4 p-3 sm:p-4 bg-muted/30 rounded-lg">
                      <h4 className="font-semibold text-xs sm:text-base flex items-center gap-2">
                        <Gift className="h-3 w-3 sm:h-4 sm:w-4" />
                        {t.freeEntryConfig}
                      </h4>

                      <p className="text-xs sm:text-sm font-medium">{t.freeEntryDeclarations}</p>

                      <div className="space-y-2 sm:space-y-3">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <Checkbox
                            id="edit-noTicket"
                            checked={formData.freeEntryAccepted.noTicket}
                            onCheckedChange={(checked) =>
                              updateField('freeEntryAccepted', { ...formData.freeEntryAccepted, noTicket: !!checked })
                            }
                          />
                          <Label htmlFor="edit-noTicket" className="cursor-pointer text-xs sm:text-sm">{t.noTicketRequired}</Label>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <Checkbox
                            id="edit-noMinSpend"
                            checked={formData.freeEntryAccepted.noMinSpend}
                            onCheckedChange={(checked) =>
                              updateField('freeEntryAccepted', { ...formData.freeEntryAccepted, noMinSpend: !!checked })
                            }
                          />
                          <Label htmlFor="edit-noMinSpend" className="cursor-pointer text-xs sm:text-sm">{t.noMinSpend}</Label>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <Checkbox
                            id="edit-noReservation"
                            checked={formData.freeEntryAccepted.noReservation}
                            onCheckedChange={(checked) =>
                              updateField('freeEntryAccepted', { ...formData.freeEntryAccepted, noReservation: !!checked })
                            }
                          />
                          <Label htmlFor="edit-noReservation" className="cursor-pointer text-xs sm:text-sm">{t.noReservationRequired}</Label>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </SectionCard>

          {/* Walk-in toggle for hybrid events - placed above Terms */}
          {formData.eventType === 'ticket_and_reservation' && (
            <>
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="space-y-0.5">
                  <p className="font-medium text-xs sm:text-sm">
                    {language === 'el' ? 'Ενεργοποίηση Walk-in Εισιτηρίων' : 'Enable Walk-in Tickets'}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    {language === 'el'
                      ? 'Επιτρέψτε αγορά εισιτηρίων χωρίς κράτηση (ξεχωριστό απόθεμα)'
                      : 'Allow ticket purchases without reservation (separate inventory)'}
                  </p>
                </div>
                <Switch
                  checked={walkInEnabled}
                  onCheckedChange={(enabled) => {
                    setWalkInEnabled(enabled);
                    if (!enabled) {
                      setWalkInTicketTiers([]);
                      setWalkInTicketValidationErrors([]);
                    }
                  }}
                />
              </div>

              {walkInEnabled && (
                <div className="mt-4 space-y-3 sm:space-y-4 p-3 sm:p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-semibold text-xs sm:text-base flex items-center gap-2">
                    <Ticket className="h-3 w-3 sm:h-4 sm:w-4" />
                    {language === 'el' ? 'Walk-in Εισιτήρια' : 'Walk-in Tickets'}
                  </h4>

                  <TicketTierEditor
                    tiers={walkInTicketTiers}
                    onTiersChange={setWalkInTicketTiers}
                    commissionPercent={commissionPercent}
                    validationErrors={walkInTicketValidationErrors}
                    autoEnabled={true}
                    hideQuantity={false}
                  />
                </div>
              )}
            </>
          )}

          {/* Terms & Conditions (Optional) */}
          <div className="space-y-1 sm:space-y-2">
            <Label className="text-xs sm:text-sm">{t.termsConditions}</Label>
            <Textarea
              value={formData.termsAndConditions}
              onChange={(e) => updateField('termsAndConditions', e.target.value)}
              placeholder={t.termsPlaceholder}
              className="min-h-[50px] sm:min-h-[80px] text-xs sm:text-sm resize-none py-1.5 sm:py-2"
              maxLength={500}
            />
            <p className="text-[9px] sm:text-xs text-muted-foreground">
              {500 - formData.termsAndConditions.length} {language === 'el' ? 'χαρακτήρες απομένουν' : 'characters remaining'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 sm:gap-3 pt-6 pb-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 text-xs sm:text-sm h-9 sm:h-10"
            >
              {t.cancel}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 text-xs sm:text-sm h-9 sm:h-10"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0 w-[calc(100%-1rem)] sm:w-full mx-auto">
          <DialogHeader className="p-3 sm:p-6 pb-0">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-2xl whitespace-nowrap">
              <Pencil className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
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

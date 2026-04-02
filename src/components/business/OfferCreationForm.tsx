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
import { Switch } from "@/components/ui/switch";
import { Loader2, Tag, Clock, Calendar, AlertTriangle, Check, Info, Percent, Users, QrCode, CalendarCheck, ImageIcon, Upload } from "lucide-react";
import { ImageCropDialog } from "./ImageCropDialog";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery } from "@tanstack/react-query";
import { compressImage } from "@/lib/imageCompression";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import OfferBoostDialog from "./OfferBoostDialog";
import OfferBoostSection, { BoostTier, DurationMode } from "./OfferBoostSection";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ============================================
// TYPES
// ============================================

type OfferCategory = 'drink' | 'food' | 'account_total';
type DiscountType = 'percentage' | 'special_deal';
type AppearanceMode = 'hours' | 'days';

type ImageSourceType = 'profile' | 'custom';

interface FormData {
  // Section 1: Title
  title: string;
  // Section 2: Description
  description: string;
  // Section 2.5: Image Source
  imageSource: ImageSourceType;
  customImageBlob: Blob | null;
  // Section 3: Category
  category: OfferCategory;
  // Section 4: Discount/Benefit
  discountType: DiscountType;
  percentOff: number;
  specialDealText: string;
  // Section 5: When Discount Applies
  validDays: string[];
  allDays: boolean;
  validStartTime: string;
  validEndTime: string;
  allDay: boolean;
  // Section 6: Appearance Duration
  appearanceMode: AppearanceMode;
  appearanceHours: number; // -1 for custom
  appearanceCustomHours: number;
  appearanceStartDate: Date | null;
  appearanceEndDate: Date | null;
  // Section 7: Availability (People-Based)
  totalPeople: number;
  maxPeoplePerRedemption: number;
  onePerUser: boolean;
  // Section 9: Optional Booking CTA
  showReservationCta: boolean;
  // Terms & Conditions (optional)
  termsAndConditions: string;
}

// ============================================
// TRANSLATIONS
// ============================================

const translations = {
  el: {
    createOffer: "Δημιουργία Προσφοράς",
    step1: "1. Τίτλος Προσφοράς",
    step2: "2. Περιγραφή Προσφοράς",
    step3: "3. Εφαρμογή Προσφοράς",
    step4: "4. Έκπτωση / Όφελος",
    step5: "5. Πότε Ισχύει η Έκπτωση",
    step6: "6. Διάρκεια Εμφάνισης στο ΦΟΜΟ",
    step7: "7. Διαθεσιμότητα (Άτομα)",
    step8: "8. Τρόπος Εξαργύρωσης",
    step9: "9. Προαιρετική Κράτηση",
    required: "Υποχρεωτικό",
    titlePlaceholder: "π.χ. -10% στο λογαριασμό, 2 Cocktails στην τιμή του 1",
    descriptionPlaceholder: "Περιγράψτε τι λαμβάνει ο χρήστης και πώς χρησιμοποιείται η προσφορά...",
    wordsRemaining: "λέξεις απομένουν",
    wordsOver: "λέξεις πάνω από το όριο",
    // Category
    categoryLabel: "Η προσφορά αφορά",
    drink: "Ποτό",
    food: "Φαγητό",
    accountTotal: "Σύνολο Λογαριασμού",
    // Discount
    discountTypeLabel: "Τύπος Έκπτωσης",
    percentageDiscount: "Ποσοστό Έκπτωσης",
    specialDeal: "Ειδική Προσφορά",
    percentOffLabel: "Ποσοστό (%)",
    specialDealLabel: "Περιγραφή Προσφοράς",
    specialDealPlaceholder: "π.χ. 2-for-1, Δωρεάν επιδόρπιο",
    // When applies
    validDaysLabel: "Ημέρες Ισχύος",
    monday: "Δευτέρα",
    tuesday: "Τρίτη",
    wednesday: "Τετάρτη",
    thursday: "Πέμπτη",
    friday: "Παρασκευή",
    saturday: "Σάββατο",
    sunday: "Κυριακή",
    allDays: "Κάθε μέρα",
    validHoursLabel: "Ώρες Λειτουργίας",
    allDay: "Όλη την ημέρα",
    fromTime: "Από",
    toTime: "Έως",
    // Appearance
    byHours: "Με Ώρες",
    byDays: "Με Ημερομηνίες",
    appearanceDesc: "Πόσο καιρό θα εμφανίζεται η προσφορά στο ΦΟΜΟ",
    customHours: "Προσαρμοσμένες ώρες",
    startDate: "Ημερομηνία Έναρξης",
    endDate: "Ημερομηνία Λήξης",
    hours: "ώρες",
    // Availability
    totalPeople: "Συνολικά Διαθέσιμα Άτομα",
    totalPeopleDesc: "Όταν φτάσει το 0, η προσφορά κλείνει αυτόματα",
    maxPerRedemption: "Μέγιστα Άτομα ανά Εξαργύρωση",
    maxPerRedemptionDesc: "Πόσα άτομα μπορούν να δηλωθούν σε μία εξαργύρωση",
    onePerUser: "Μία Εξαργύρωση ανά Χρήστη",
    onePerUserTooltip: "Αν ενεργοποιηθεί, κάθε χρήστης μπορεί να εξαργυρώσει μόνο μία φορά",
    // Redemption
    redemptionTitle: "Show & Redeem (QR)",
    redemptionDesc: "Ο χρήστης πατάει 'Εξαργύρωση' → Δηλώνει αριθμό ατόμων → Λαμβάνει QR Code → Το δείχνει στο κατάστημα",
    noPayment: "Χωρίς πληρωμή",
    noHold: "Χωρίς κράτηση θέσης",
    noCommission: "Χωρίς προμήθεια",
    walkInNote: "Η προσφορά ισχύει για walk-in πελάτες και δεν εγγυάται θέση",
    // Image Source
    offerImage: 'Εικόνα Προσφοράς',
    useProfileImage: "Χρήση Εικόνας Προφίλ",
    useCustomImage: "Ανέβασμα Νέας Εικόνας",
    profileImageDesc: "Θα χρησιμοποιηθεί η εικόνα εξωφύλλου της επιχείρησής σας",
    customImageDesc: "Ανεβάστε μια ξεχωριστή εικόνα για αυτή την προσφορά",
    // Reservation CTA
    reservationCtaLabel: "Εμφάνιση επιλογής κράτησης μετά το QR",
    reservationCtaDesc: "Μετά την εμφάνιση του QR Code, εμφανίζεται η επιλογή: 'Θέλετε να κάνετε κράτηση;'",
    // Submit
    publishOffer: "Δημοσίευση Προσφοράς",
    publishing: "Δημοσίευση...",
    allFieldsRequired: "Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία",
    offerCreated: "Η προσφορά δημιουργήθηκε επιτυχώς!",
    offerCreateFailed: "Αποτυχία δημιουργίας προσφοράς",
    selectAtLeastOneDay: "Επιλέξτε τουλάχιστον μία ημέρα",
    verificationWarning: "Η επιχείρησή σας πρέπει να επαληθευτεί πριν δημοσιεύσετε προσφορές",
    termsConditions: "Όροι & Προϋποθέσεις (προαιρετικό)",
    termsPlaceholder: "π.χ. Ισχύει μόνο για νέους πελάτες, Δεν συνδυάζεται με άλλες προσφορές...",
  },
  en: {
    createOffer: "Create Offer",
    step1: "1. Offer Title",
    step2: "2. Offer Description",
    step3: "3. Offer Category",
    step4: "4. Discount / Benefit",
    step5: "5. When Discount Applies",
    step6: "6. ΦΟΜΟ Appearance Duration",
    step7: "7. Availability (People)",
    step8: "8. Redemption Method",
    step9: "9. Optional Booking",
    required: "Required",
    titlePlaceholder: "e.g. -10% off total, 2 Cocktails for the price of 1",
    descriptionPlaceholder: "Describe what the user receives and how the offer is used...",
    wordsRemaining: "words remaining",
    wordsOver: "words over limit",
    // Category
    categoryLabel: "This offer applies to",
    drink: "Drink",
    food: "Food",
    accountTotal: "Account Total",
    // Discount
    discountTypeLabel: "Discount Type",
    percentageDiscount: "Percentage Discount",
    specialDeal: "Special Deal",
    percentOffLabel: "Percentage (%)",
    specialDealLabel: "Deal Description",
    specialDealPlaceholder: "e.g. 2-for-1, Free dessert",
    // When applies
    validDaysLabel: "Valid Days",
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday",
    allDays: "Every day",
    validHoursLabel: "Operating Hours",
    allDay: "All day",
    fromTime: "From",
    toTime: "To",
    // Appearance
    byHours: "By Hours",
    byDays: "By Days",
    appearanceDesc: "How long the offer will appear in ΦΟΜΟ",
    customHours: "Custom hours",
    startDate: "Start Date",
    endDate: "End Date",
    hours: "hours",
    // Availability
    totalPeople: "Total Available People",
    totalPeopleDesc: "When it reaches 0, the offer closes automatically",
    maxPerRedemption: "Max People Per Redemption",
    maxPerRedemptionDesc: "How many people can be claimed in one group",
    onePerUser: "One Redemption Per User",
    onePerUserTooltip: "If enabled, each user can redeem only once",
    // Redemption
    redemptionTitle: "Show & Redeem (QR)",
    redemptionDesc: "User taps 'Redeem' → States number of people → Gets QR Code → Shows it at venue",
    noPayment: "No payment",
    noHold: "No hold",
    noCommission: "No commission",
    walkInNote: "This offer is for walk-in customers and does not guarantee a seat",
    // Image Source
    offerImage: 'Offer Image',
    useProfileImage: "Use Profile Image",
    useCustomImage: "Upload Custom Image",
    profileImageDesc: "Your business cover image will be used",
    customImageDesc: "Upload a specific image for this offer",
    // Reservation CTA
    reservationCtaLabel: "Show reservation option after QR",
    reservationCtaDesc: "After the QR Code appears, show option: 'Would you like to make a reservation?'",
    // Submit
    publishOffer: "Publish Offer",
    publishing: "Publishing...",
    allFieldsRequired: "Please fill in all required fields",
    offerCreated: "Offer created successfully!",
    offerCreateFailed: "Failed to create offer",
    selectAtLeastOneDay: "Select at least one day",
    verificationWarning: "Your business must be verified before publishing offers",
    termsConditions: "Terms & Conditions (optional)",
    termsPlaceholder: "e.g. Valid for new customers only, Cannot be combined with other offers...",
  },
};

// ============================================
// CONSTANTS
// ============================================

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

const HOUR_PRESETS = [3, 6, 12, 24, 48];

const CATEGORY_ICONS: Record<OfferCategory, string> = {
  drink: '🍹',
  food: '🍽️',
  account_total: '💳',
};

// ============================================
// HELPERS
// ============================================

const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(Boolean).length;
};

const generateQRToken = (businessId: string) => {
  return `${businessId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
};

const calculateAppearanceEndDate = (startDate: Date, hours: number): Date => {
  const end = new Date(startDate);
  end.setTime(end.getTime() + hours * 60 * 60 * 1000);
  return end;
};

// ============================================
// SECTION CARD COMPONENT
// ============================================

const SectionCard = ({ 
  title, 
  required = false, 
  children 
}: { 
  title: string; 
  required?: boolean; 
  children: React.ReactNode;
}) => (
  <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
    <CardHeader className="pb-1 p-3 sm:p-4 md:p-6 sm:pb-0 md:pb-0">
      <CardTitle className="text-[11px] sm:text-lg font-semibold flex items-start gap-2 whitespace-normal leading-tight">
        {title}
        {required && (
          <span className="text-[9px] sm:text-xs font-medium text-primary bg-primary/10 px-1.5 sm:px-2 py-0.5 rounded-full">
            {translations.en.required}
          </span>
        )}
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-2 p-3 sm:p-4 md:p-6 pt-1 sm:pt-1 md:pt-1">
      {children}
    </CardContent>
  </Card>
);

// Helper component for custom image upload in offer form
const ImageSourceCustomUpload = ({ 
  language, 
  onImageReady, 
  preview 
}: { 
  language: 'el' | 'en'; 
  onImageReady: (blob: Blob | null) => void;
  preview: string | null;
}) => {
  const [showCrop, setShowCrop] = useState(false);
  const [rawSrc, setRawSrc] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert(language === 'el' ? 'Μέγιστο 5MB' : 'Max 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setRawSrc(reader.result as string);
      setShowCrop(true);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      {preview ? (
        <div className="relative inline-block">
          <img src={preview} alt="Custom" className="w-full max-w-[200px] h-auto rounded-lg border object-cover" style={{ aspectRatio: '4/5' }} />
          <button type="button" onClick={() => onImageReady(null)} className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs">✕</button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full max-w-[200px] h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/20">
          <Upload className="h-6 w-6 text-muted-foreground mb-1" />
          <span className="text-xs text-muted-foreground">{language === 'el' ? 'Επιλέξτε' : 'Select'}</span>
          <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
        </label>
      )}
      {rawSrc && (
        <ImageCropDialog
          open={showCrop}
          onClose={() => { setShowCrop(false); setRawSrc(null); }}
          imageSrc={rawSrc}
          onCropComplete={(blob) => { onImageReady(blob); setShowCrop(false); setRawSrc(null); }}
          aspectRatio="4:5"
          language={language}
        />
      )}
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

interface OfferCreationFormProps {
  businessId: string;
}

const OfferCreationForm = ({ businessId }: OfferCreationFormProps) => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const t = translations[language];

  // Form state
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    imageSource: 'profile',
    customImageBlob: null,
    category: 'account_total',
    discountType: 'percentage',
    percentOff: 10,
    specialDealText: '',
    validDays: [...DAYS_OF_WEEK],
    allDays: true,
    validStartTime: '00:00',
    validEndTime: '23:59',
    allDay: true,
    appearanceMode: 'hours',
    appearanceHours: 6,
    appearanceCustomHours: 12,
    appearanceStartDate: new Date(),
    appearanceEndDate: calculateAppearanceEndDate(new Date(), 6),
    totalPeople: 30,
    maxPeoplePerRedemption: 5,
    onePerUser: true,
    showReservationCta: false,
    termsAndConditions: '',
  });
  
  const [customImagePreview, setCustomImagePreview] = useState<string | null>(null);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBoostDialog, setShowBoostDialog] = useState(false);
  const [createdOfferId, setCreatedOfferId] = useState<string | null>(null);
  const [createdOfferTitle, setCreatedOfferTitle] = useState<string>("");
  
  // Boost state for pre-publish boost section
  const [boostData, setBoostData] = useState<{
    enabled: boolean;
    tier: BoostTier;
    durationMode: DurationMode;
    startDate: Date;
    endDate: Date;
    durationHours?: number;
    totalCostCents: number;
    dailyRateCents: number;
    hourlyRateCents?: number;
    targetingQuality: number;
  } | null>(null);


  // Fetch business data including cover image
  const { data: businessData } = useQuery({
    queryKey: ["business-data", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("verified, name, accepts_direct_reservations, cover_url, logo_url")
        .eq("id", businessId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const isBusinessVerified = businessData?.verified === true;

  // Word count
  const wordCount = countWords(formData.description);
  const maxWords = 60;
  const wordsRemaining = maxWords - wordCount;

  // Field updater
  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      
      // Auto-calculate end date when appearance settings change
      if (field === 'appearanceHours' || field === 'appearanceCustomHours' || field === 'appearanceStartDate') {
        if (next.appearanceMode === 'hours' && next.appearanceStartDate) {
          const hours = next.appearanceHours === -1 ? next.appearanceCustomHours : next.appearanceHours;
          next.appearanceEndDate = calculateAppearanceEndDate(next.appearanceStartDate, hours);
        }
      }
      
      // When switching to hours mode, recalculate end date
      if (field === 'appearanceMode' && value === 'hours' && next.appearanceStartDate) {
        const hours = next.appearanceHours === -1 ? next.appearanceCustomHours : next.appearanceHours;
        next.appearanceEndDate = calculateAppearanceEndDate(next.appearanceStartDate, hours);
      }

      // Handle allDays toggle
      if (field === 'allDays') {
        if (value === true) {
          next.validDays = [...DAYS_OF_WEEK];
        }
      }

      // Handle allDay toggle
      if (field === 'allDay') {
        if (value === true) {
          next.validStartTime = '00:00';
          next.validEndTime = '23:59';
        }
      }
      
      return next;
    });
  };

  // Toggle day selection
  const toggleDay = (day: string) => {
    const newDays = formData.validDays.includes(day)
      ? formData.validDays.filter(d => d !== day)
      : [...formData.validDays, day];
    updateField('validDays', newDays);
    if (newDays.length !== 7) {
      updateField('allDays', false);
    }
  };

  // Calculate final appearance dates for submission
  const getAppearanceDates = () => {
    if (formData.appearanceMode === 'hours') {
      const hours = formData.appearanceHours === -1 ? formData.appearanceCustomHours : formData.appearanceHours;
      const start = formData.appearanceStartDate || new Date();
      const end = calculateAppearanceEndDate(start, hours);
      return { start, end };
    }
    return {
      start: formData.appearanceStartDate || new Date(),
      end: formData.appearanceEndDate || new Date(),
    };
  };

  // Validation
  const validate = (): string | null => {
    if (!formData.title.trim()) return t.allFieldsRequired;
    if (wordsRemaining < 0) return language === 'el' ? 'Η περιγραφή υπερβαίνει τις 60 λέξεις' : 'Description exceeds 60 words';
    
    if (formData.discountType === 'percentage' && (formData.percentOff < 1 || formData.percentOff > 99)) {
      return t.allFieldsRequired;
    }
    
    if (formData.discountType === 'special_deal' && !formData.specialDealText.trim()) {
      return t.allFieldsRequired;
    }
    
    if (formData.validDays.length === 0) {
      return t.selectAtLeastOneDay;
    }
    
    const { start, end } = getAppearanceDates();
    if (!start || !end) return t.allFieldsRequired;
    
    if (formData.totalPeople < 1) return t.allFieldsRequired;
    if (formData.maxPeoplePerRedemption < 1) return t.allFieldsRequired;
    
    return null;
  };

  // Fetch subscription status for boost dialog
  const { data: subscriptionData } = useQuery({
    queryKey: ["subscription-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      return data;
    },
  });

  // Submit handler
  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    setIsSubmitting(true);

    try {
      const appearance = getAppearanceDates();

      // Handle image upload
      let offerImageUrl: string | null = null;
      
      if (formData.imageSource === 'custom' && formData.customImageBlob) {
        // Upload custom image
        const file = new File([formData.customImageBlob], `offer-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const compressedFile = await compressImage(file, 1920, 1080, 0.85);
        const fileName = `${businessId}-${Date.now()}.jpg`;
        
        const { error: uploadError } = await supabase.storage
          .from('offer-images')
          .upload(fileName, compressedFile, { contentType: 'image/jpeg' });
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage.from('offer-images').getPublicUrl(fileName);
        offerImageUrl = publicUrl;
      } else if (formData.imageSource === 'profile') {
        // Use business profile image
        offerImageUrl = (businessData?.cover_url || businessData?.logo_url) as string | null;
      }

      const { data: offerData, error: insertError } = await supabase.from('discounts').insert({
        business_id: businessId,
        title: formData.title,
        description: formData.description || null,
        category: formData.category,
        discount_type: formData.discountType,
        percent_off: formData.discountType === 'percentage' ? formData.percentOff : null,
        special_deal_text: formData.discountType === 'special_deal' ? formData.specialDealText : null,
        terms: formData.termsAndConditions.trim() ? formData.termsAndConditions.trim() : null,
        valid_days: formData.validDays,
        valid_start_time: formData.validStartTime,
        valid_end_time: formData.validEndTime,
        start_at: appearance.start.toISOString(),
        end_at: appearance.end.toISOString(),
        total_people: formData.totalPeople,
        people_remaining: formData.totalPeople,
        max_people_per_redemption: formData.maxPeoplePerRedemption,
        one_per_user: formData.onePerUser,
        show_reservation_cta: formData.showReservationCta,
        pricing_type: 'single',
        qr_code_token: generateQRToken(businessId),
        active: true,
        offer_image_url: offerImageUrl,
      }).select().single();

      if (insertError) throw insertError;

      // If boost was enabled in the form, call the edge function to create boost properly
      let boostCreatedSuccessfully = false;
      if (boostData?.enabled && offerData) {
        try {
          // Determine if we can use subscription budget
          const canUseSubscriptionBudget = subscriptionData?.subscribed && 
            (subscriptionData.monthly_budget_remaining_cents || 0) >= boostData.totalCostCents;

          const boostPayload = {
            discountId: offerData.id,
            tier: boostData.tier,
            durationMode: boostData.durationMode,
            startDate: boostData.startDate.toISOString(),
            endDate: boostData.endDate.toISOString(),
            durationHours: boostData.durationHours || null,
            useSubscriptionBudget: canUseSubscriptionBudget,
          };

          const { data: boostResult, error: boostFnError } = await supabase.functions.invoke(
            "create-offer-boost",
            { body: boostPayload }
          );

          if (boostFnError) {
            console.error("Boost function error:", boostFnError);
            toast.error(language === "el" ? "Σφάλμα προώθησης" : "Boost error");
          } else if (boostResult?.needsPayment) {
            // Redirect directly to Stripe checkout with already-configured boost params
            toast.success(t.offerCreated);
            toast.info(language === "el" 
              ? "Ανακατεύθυνση στην πληρωμή προώθησης..." 
              : "Redirecting to boost payment...");
            
            const partialBudgetCents = (subscriptionData?.subscribed && (subscriptionData.monthly_budget_remaining_cents || 0) > 0)
              ? Math.min(subscriptionData.monthly_budget_remaining_cents || 0, boostData.totalCostCents)
              : 0;

            const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
              "create-offer-boost-checkout",
              {
                body: {
                  discountId: offerData.id,
                  tier: boostData.tier,
                  durationMode: boostData.durationMode,
                  startDate: boostData.startDate.toISOString().split('T')[0],
                  endDate: boostData.endDate.toISOString().split('T')[0],
                  durationHours: boostData.durationMode === "hourly" ? boostData.durationHours : undefined,
                  partialBudgetCents,
                },
              }
            );

            if (checkoutError || !checkoutData?.url) {
              console.error("Checkout error:", checkoutError);
              toast.error(language === "el" ? "Σφάλμα πληρωμής προώθησης" : "Boost payment error");
              navigate('/dashboard-business/offers');
            } else {
              window.location.assign(checkoutData.url);
            }
            return;
          } else if (boostResult?.success) {
            boostCreatedSuccessfully = true;
            toast.success(language === "el" 
              ? "Η προσφορά δημιουργήθηκε και η προώθηση ενεργοποιήθηκε!" 
              : "Offer created and boost activated!");
          }
        } catch (boostErr) {
          console.error("Boost creation exception:", boostErr);
          toast.error(language === "el" ? "Σφάλμα προώθησης" : "Boost error");
        }
      }

      // Show success toast if boost wasn't already shown
      if (!boostCreatedSuccessfully) {
        toast.success(t.offerCreated);
      }
      
      // Only show boost dialog if boost was NOT already enabled/created during form submission
      if (offerData && !boostData?.enabled) {
        // User didn't enable boost in form, show optional boost dialog
        setCreatedOfferId(offerData.id);
        setCreatedOfferTitle(formData.title);
        setShowBoostDialog(true);
      } else {
        // Boost was already handled (or created), navigate directly to offers
        navigate('/dashboard-business/offers');
      }

    } catch (err) {
      console.error("Offer creation error:", err);
      toast.error(t.offerCreateFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle boost dialog close
  const handleBoostDialogClose = (open: boolean) => {
    if (!open) {
      setShowBoostDialog(false);
      navigate('/dashboard-business/offers');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">{t.createOffer}</h1>
      </div>

      {/* Verification Warning */}
      {!isBusinessVerified && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{language === 'el' ? 'Επιχείρηση Μη Επαληθευμένη' : 'Business Not Verified'}</AlertTitle>
          <AlertDescription>{t.verificationWarning}</AlertDescription>
        </Alert>
      )}

      {/* Section 1: Offer Title */}
      <SectionCard title={t.step1} required>
        <Input
          value={formData.title}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder={t.titlePlaceholder}
          maxLength={100}
          className="text-xs sm:text-base"
        />
      </SectionCard>

      {/* Section 2: Offer Description + Image */}
      <SectionCard title={t.step2} required>
        <div className="space-y-4">
          {/* Description */}
          <div className="space-y-2">
            <Textarea
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder={t.descriptionPlaceholder}
              rows={3}
              className="resize-none"
            />
            <p className={cn(
              "text-xs text-right",
              wordsRemaining < 0 ? "text-destructive" : "text-muted-foreground"
            )}>
              {wordsRemaining >= 0 
                ? `${wordsRemaining} ${t.wordsRemaining}`
                : `${Math.abs(wordsRemaining)} ${t.wordsOver}`
              }
            </p>
          </div>

          {/* Image Source - Integrated into Description section */}
          <div className="pt-3 sm:pt-4 border-t border-border/50 space-y-3 sm:space-y-4">
            <Label className="text-xs sm:text-sm font-semibold">{t.offerImage}</Label>
            
            {/* Image Source Toggle */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => updateField('imageSource', 'profile')}
                className={cn(
                  "p-2.5 sm:p-4 rounded-xl border-2 transition-all text-left",
                  formData.imageSource === 'profile'
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                  <span className="font-medium text-[10px] sm:text-sm whitespace-nowrap">{t.useProfileImage}</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => updateField('imageSource', 'custom')}
                className={cn(
                  "p-2.5 sm:p-4 rounded-xl border-2 transition-all text-left",
                  formData.imageSource === 'custom'
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                  <span className="font-medium text-[10px] sm:text-sm whitespace-nowrap">{t.useCustomImage}</span>
                </div>
              </button>
            </div>

            {/* Preview based on selection */}
            {formData.imageSource === 'profile' && (businessData?.cover_url || businessData?.logo_url) && (
              <div className="p-3 rounded-lg bg-muted/30 border">
                <p className="text-xs text-muted-foreground mb-2">
                  {language === 'el' ? 'Προεπισκόπηση:' : 'Preview:'}
                </p>
                <img
                  src={(businessData.cover_url || businessData.logo_url) as string}
                  alt="Profile"
                  className="w-full max-w-[200px] h-auto rounded-lg border object-cover"
                  style={{ aspectRatio: '4/5' }}
                />
              </div>
            )}

            {formData.imageSource === 'custom' && (
              <ImageSourceCustomUpload
                language={language}
                onImageReady={(blob) => {
                  updateField('customImageBlob', blob);
                  if (blob) {
                    setCustomImagePreview(URL.createObjectURL(blob));
                  } else {
                    setCustomImagePreview(null);
                  }
                }}
                preview={customImagePreview}
              />
            )}
          </div>
        </div>
      </SectionCard>

      {/* Section 3: Offer Category */}
      <SectionCard title={t.step3} required>
        <div className="space-y-2">
          <Label>{t.categoryLabel}</Label>
          <Select
            value={formData.category}
            onValueChange={(value: OfferCategory) => updateField('category', value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="drink">
                <span className="flex items-center gap-2">
                  {CATEGORY_ICONS.drink} {t.drink}
                </span>
              </SelectItem>
              <SelectItem value="food">
                <span className="flex items-center gap-2">
                  {CATEGORY_ICONS.food} {t.food}
                </span>
              </SelectItem>
              <SelectItem value="account_total">
                <span className="flex items-center gap-2">
                  {CATEGORY_ICONS.account_total} {t.accountTotal}
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SectionCard>

      {/* Section 4: Discount / Benefit */}
      <SectionCard title={t.step4} required>
        <div className="space-y-4">
          {/* Discount Type Selection */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => updateField('discountType', 'percentage')}
              className={cn(
                "p-3 sm:p-4 rounded-xl border-2 transition-all text-left",
                formData.discountType === 'percentage'
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Percent className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                <span className="font-medium text-xs sm:text-sm whitespace-nowrap">{t.percentageDiscount}</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => updateField('discountType', 'special_deal')}
              className={cn(
                "p-3 sm:p-4 rounded-xl border-2 transition-all text-left",
                formData.discountType === 'special_deal'
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Tag className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                <span className="font-medium text-xs sm:text-sm whitespace-nowrap">{t.specialDeal}</span>
              </div>
            </button>
          </div>

          {/* Discount Value Input */}
          {formData.discountType === 'percentage' ? (
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">{t.percentOffLabel}</Label>
              <div className="flex items-center gap-2">
                <NumberInput
                  value={formData.percentOff}
                  onChange={(value) => updateField('percentOff', Math.max(1, Math.min(99, value)))}
                  min={1}
                  max={99}
                  className="w-20 sm:w-24 text-sm sm:text-base"
                />
                <span className="text-lg sm:text-2xl font-bold text-primary">%</span>
                <span className="text-xs sm:text-sm text-muted-foreground ml-1 sm:ml-2">off</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">{t.specialDealLabel}</Label>
              <Input
                value={formData.specialDealText}
                onChange={(e) => updateField('specialDealText', e.target.value)}
                placeholder={t.specialDealPlaceholder}
                className="text-xs sm:text-base"
              />
            </div>
          )}
        </div>
      </SectionCard>

      {/* Section 5: When Discount Applies */}
      <SectionCard title={t.step5} required>
        <div className="space-y-4 sm:space-y-6">
          {/* Valid Days */}
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs sm:text-sm">{t.validDaysLabel}</Label>
              <div className="flex items-center gap-2">
                <Label htmlFor="all-days" className="text-[10px] sm:text-sm text-muted-foreground">{t.allDays}</Label>
                <Switch
                  id="all-days"
                  checked={formData.allDays}
                  onCheckedChange={(checked) => updateField('allDays', checked)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  disabled={formData.allDays}
                  className={cn(
                    "py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg text-[10px] sm:text-sm font-medium transition-all",
                    formData.validDays.includes(day)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80",
                    formData.allDays && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {t[day as keyof typeof t]}
                </button>
              ))}
            </div>
          </div>

          {/* Valid Hours */}
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs sm:text-sm">{t.validHoursLabel}</Label>
              <div className="flex items-center gap-2">
                <Label htmlFor="all-day" className="text-[10px] sm:text-sm text-muted-foreground">{t.allDay}</Label>
                <Switch
                  id="all-day"
                  checked={formData.allDay}
                  onCheckedChange={(checked) => updateField('allDay', checked)}
                />
              </div>
            </div>
            
            {!formData.allDay && (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex-1">
                  <Label className="text-[10px] sm:text-xs text-muted-foreground mb-1">{t.fromTime}</Label>
                  <Input
                    type="time"
                    value={formData.validStartTime}
                    onChange={(e) => updateField('validStartTime', e.target.value)}
                    className="w-full text-xs sm:text-sm"
                  />
                </div>
                <span className="text-muted-foreground mt-4 sm:mt-5">→</span>
                <div className="flex-1">
                  <Label className="text-[10px] sm:text-xs text-muted-foreground mb-1">{t.toTime}</Label>
                  <Input
                    type="time"
                    value={formData.validEndTime}
                    onChange={(e) => updateField('validEndTime', e.target.value)}
                    className="w-full text-xs sm:text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Section 6: Appearance Duration */}
      <SectionCard title={t.step6} required>
        <div className="space-y-3 sm:space-y-4">
          {/* Mode Toggle */}
          <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
            <button
              type="button"
              onClick={() => updateField('appearanceMode', 'hours')}
              className={cn(
                "p-2 sm:p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-1 sm:gap-2",
                formData.appearanceMode === 'hours'
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="font-medium text-[10px] sm:text-sm whitespace-nowrap">{t.byHours}</span>
            </button>
            <button
              type="button"
              onClick={() => updateField('appearanceMode', 'days')}
              className={cn(
                "p-2 sm:p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-1 sm:gap-2",
                formData.appearanceMode === 'days'
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="font-medium text-[10px] sm:text-sm whitespace-nowrap">{t.byDays}</span>
            </button>
          </div>

          {/* Hours Mode */}
          {formData.appearanceMode === 'hours' && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-wrap gap-1 sm:gap-2">
                {HOUR_PRESETS.map((hours) => (
                  <button
                    key={hours}
                    type="button"
                    onClick={() => updateField('appearanceHours', hours)}
                    className={cn(
                      "px-2 sm:px-4 py-1 sm:py-2 rounded-full font-medium transition-all text-[10px] sm:text-sm",
                      formData.appearanceHours === hours
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {hours}h
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => updateField('appearanceHours', -1)}
                  className={cn(
                    "px-2 sm:px-4 py-1 sm:py-2 rounded-full font-medium transition-all text-[10px] sm:text-sm whitespace-nowrap",
                    formData.appearanceHours === -1
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {t.customHours}
                </button>
              </div>
              
              {formData.appearanceHours === -1 && (
                <div className="flex items-center gap-2">
                  <NumberInput
                    value={formData.appearanceCustomHours}
                    onChange={(value) => updateField('appearanceCustomHours', Math.max(1, value))}
                    min={1}
                    max={168}
                    className="w-20 sm:w-24 text-xs sm:text-base"
                  />
                  <span className="text-xs sm:text-sm text-muted-foreground">{t.hours}</span>
                </div>
              )}
            </div>
          )}

          {/* Days Mode */}
          {formData.appearanceMode === 'days' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.startDate}</Label>
                <DateTimePicker
                  value={formData.appearanceStartDate || undefined}
                  onChange={(date) => updateField('appearanceStartDate', date || null)}
                  minDate={new Date()}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.endDate}</Label>
                <DateTimePicker
                  value={formData.appearanceEndDate || undefined}
                  onChange={(date) => updateField('appearanceEndDate', date || null)}
                  minDate={formData.appearanceStartDate || new Date()}
                />
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Section 7: Availability (People-Based) */}
      <SectionCard title={t.step7} required>
        <div className="space-y-4 sm:space-y-6">
          {/* Total People */}
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
              <Label className="text-xs sm:text-sm">{t.totalPeople}</Label>
            </div>
            <NumberInput
              value={formData.totalPeople}
              onChange={(value) => updateField('totalPeople', Math.max(1, value))}
              min={1}
              max={9999}
              className="w-28 sm:w-32 text-xs sm:text-base"
            />
            <p className="text-[10px] sm:text-xs text-muted-foreground">{t.totalPeopleDesc}</p>
          </div>

          {/* Max Per Redemption */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label className="text-xs sm:text-sm">{t.maxPerRedemption}</Label>
            <NumberInput
              value={formData.maxPeoplePerRedemption}
              onChange={(value) => updateField('maxPeoplePerRedemption', Math.max(1, value))}
              min={1}
              max={formData.totalPeople}
              className="w-28 sm:w-32 text-xs sm:text-base"
            />
            <p className="text-[10px] sm:text-xs text-muted-foreground">{t.maxPerRedemptionDesc}</p>
          </div>

          {/* One Per User */}
          <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Label htmlFor="one-per-user" className="cursor-pointer text-xs sm:text-sm">{t.onePerUser}</Label>
              <span title={t.onePerUserTooltip} className="cursor-help">
                <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              </span>
            </div>
            <Switch
              id="one-per-user"
              checked={formData.onePerUser}
              onCheckedChange={(checked) => updateField('onePerUser', checked)}
            />
          </div>
        </div>
      </SectionCard>

      {/* Section 8: Redemption Method (Informational) */}
      <SectionCard title={t.step8}>
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
            <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10">
              <QrCode className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <span className="font-semibold text-sm sm:text-lg">{t.redemptionTitle}</span>
          </div>
          
          <p className="text-xs sm:text-sm text-muted-foreground">{t.redemptionDesc}</p>
          
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm text-green-600 dark:text-green-400">
              <Check className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
              <span>{t.noPayment}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm text-green-600 dark:text-green-400">
              <Check className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
              <span>{t.noHold}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm text-green-600 dark:text-green-400">
              <Check className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
              <span>{t.noCommission}</span>
            </div>
          </div>
          
          <div className="flex items-start gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 text-[10px] sm:text-sm">
            <Info className="w-3 h-3 sm:w-4 sm:h-4 mt-0.5 flex-shrink-0" />
            <span>{t.walkInNote}</span>
          </div>
        </div>
      </SectionCard>

      {/* Section 9: Optional Booking CTA */}
      <SectionCard title={t.step9}>
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <CalendarCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
              <Label htmlFor="show-cta" className="cursor-pointer text-[10px] sm:text-sm whitespace-nowrap">{t.reservationCtaLabel}</Label>
            </div>
            <Switch
              id="show-cta"
              checked={formData.showReservationCta}
              onCheckedChange={(checked) => updateField('showReservationCta', checked)}
            />
          </div>
        </div>
      </SectionCard>

      {/* Terms & Conditions (Optional) */}
      <div className="space-y-1 sm:space-y-2">
        <Label className="text-xs sm:text-sm font-medium">{t.termsConditions}</Label>
        <Textarea
          value={formData.termsAndConditions}
          onChange={(e) => updateField('termsAndConditions', e.target.value)}
          placeholder={t.termsPlaceholder}
          className="min-h-[40px] sm:min-h-[60px] text-xs sm:text-sm resize-none py-1.5 sm:py-2"
          rows={2}
        />
      </div>

      {/* Section 10: Boost (Optional) */}
      <OfferBoostSection
        onBoostChange={setBoostData}
        hasActiveSubscription={subscriptionData?.subscribed || false}
        remainingBudgetCents={subscriptionData?.monthly_budget_remaining_cents || 0}
        offerEndAt={getAppearanceDates().end.toISOString()}
      />

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || !isBusinessVerified}
        className="w-full h-10 sm:h-14 text-sm sm:text-lg font-semibold"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
            {t.publishing}
          </>
        ) : (
          t.publishOffer
        )}
      </Button>

      {/* Boost Dialog - shown after offer creation */}
      {createdOfferId && (
        <OfferBoostDialog
          open={showBoostDialog}
          onOpenChange={handleBoostDialogClose}
          offerId={createdOfferId}
          offerTitle={createdOfferTitle}
          hasActiveSubscription={subscriptionData?.subscribed || false}
          remainingBudgetCents={subscriptionData?.monthly_budget_remaining_cents || 0}
          offerEndAt={getAppearanceDates().end.toISOString()}
        />
      )}
    </div>
  );
};

export default OfferCreationForm;

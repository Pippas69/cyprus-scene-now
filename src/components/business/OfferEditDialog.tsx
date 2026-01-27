import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Clock, Calendar, Check, Percent, Users, Image as ImageIcon } from "lucide-react";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";
import { ImageUploadField } from "./ImageUploadField";
import { ImageCropDialog } from "./ImageCropDialog";
import { compressImage } from "@/lib/imageCompression";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface FormData {
  title: string;
  description: string;
  category: OfferCategory;
  discountType: DiscountType;
  percentOff: number;
  specialDealText: string;
  validDays: string[];
  allDays: boolean;
  validStartTime: string;
  validEndTime: string;
  allDay: boolean;
  appearanceMode: AppearanceMode;
  appearanceStartDate: Date | null;
  appearanceEndDate: Date | null;
  totalPeople: number;
  maxPeoplePerRedemption: number;
  onePerUser: boolean;
  showReservationCta: boolean;
  termsAndConditions: string;
}

interface OfferEditDialogProps {
  offer: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// ============================================
// CONSTANTS
// ============================================

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// ============================================
// TRANSLATIONS
// ============================================

const translations = {
  el: {
    editOffer: "Επεξεργασία Προσφοράς",
    step1: "1. Τίτλος Προσφοράς",
    step2: "2. Περιγραφή Προσφοράς",
    step2b: "2β. Εικόνα Προσφοράς",
    step3: "3. Εφαρμογή Προσφοράς",
    step4: "4. Έκπτωση / Όφελος",
    step5: "5. Πότε Ισχύει η Έκπτωση",
    step6: "6. Διάρκεια Εμφάνισης στο ΦΟΜΟ",
    step7: "7. Διαθεσιμότητα (Άτομα)",
    step9: "8. Προαιρετική Κράτηση",
    required: "Υποχρεωτικό",
    titlePlaceholder: "π.χ. -10% στο λογαριασμό",
    descriptionPlaceholder: "Περιγράψτε τι λαμβάνει ο χρήστης...",
    wordsRemaining: "λέξεις απομένουν",
    wordsOver: "λέξεις πάνω από το όριο",
    categoryLabel: "Η προσφορά αφορά",
    drink: "Ποτό",
    food: "Φαγητό",
    accountTotal: "Σύνολο Λογαριασμού",
    discountTypeLabel: "Τύπος Έκπτωσης",
    percentageDiscount: "Ποσοστό Έκπτωσης",
    specialDeal: "Ειδική Προσφορά",
    percentOffLabel: "Ποσοστό (%)",
    specialDealLabel: "Περιγραφή Προσφοράς",
    specialDealPlaceholder: "π.χ. 2-for-1, Δωρεάν επιδόρπιο",
    validDaysLabel: "Ημέρες Ισχύος",
    allDays: "Όλες τις ημέρες",
    validHoursLabel: "Ώρες Ισχύος",
    allDay: "Όλη μέρα",
    fromTime: "Από",
    toTime: "Έως",
    monday: "Δευ",
    tuesday: "Τρί",
    wednesday: "Τετ",
    thursday: "Πέμ",
    friday: "Παρ",
    saturday: "Σάβ",
    sunday: "Κυρ",
    byDays: "Με ημερομηνίες",
    fromDate: "Από ημερομηνία",
    toDate: "Έως ημερομηνία",
    totalPeopleLabel: "Συνολικά Διαθέσιμα Άτομα",
    maxPerRedemptionLabel: "Μέγιστα Άτομα ανά Εξαργύρωση",
    onePerUserLabel: "Μία φορά ανά χρήστη",
    onePerUserDesc: "Κάθε χρήστης μπορεί να κάνει claim μία φορά",
    showReservationCta: "Εμφάνιση κουμπιού κράτησης",
    showReservationCtaDesc: "Προτείνετε στους χρήστες να κλείσουν τραπέζι",
    updateOffer: "Ενημέρωση Προσφοράς",
    updating: "Ενημέρωση...",
    allFieldsRequired: "Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία",
    offerUpdated: "Η προσφορά ενημερώθηκε επιτυχώς!",
    offerUpdateFailed: "Αποτυχία ενημέρωσης προσφοράς",
    cancel: "Ακύρωση",
    loading: "Φόρτωση...",
    offerImage: "Εικόνα Προσφοράς",
    currentImage: "Τρέχουσα εικόνα",
    termsConditions: "Όροι & Προϋποθέσεις (προαιρετικό)",
    termsPlaceholder: "π.χ. Ισχύει μόνο για νέους πελάτες...",
  },
  en: {
    editOffer: "Edit Offer",
    step1: "1. Offer Title",
    step2: "2. Offer Description",
    step2b: "2b. Offer Image",
    step3: "3. Offer Category",
    step4: "4. Discount / Benefit",
    step5: "5. When Discount Applies",
    step6: "6. ΦΟΜΟ Appearance Duration",
    step7: "7. Availability (People)",
    step9: "8. Optional Booking",
    required: "Required",
    titlePlaceholder: "e.g. -10% on total",
    descriptionPlaceholder: "Describe what the user gets...",
    wordsRemaining: "words remaining",
    wordsOver: "words over limit",
    categoryLabel: "This offer applies to",
    drink: "Drink",
    food: "Food",
    accountTotal: "Account Total",
    discountTypeLabel: "Discount Type",
    percentageDiscount: "Percentage Discount",
    specialDeal: "Special Deal",
    percentOffLabel: "Percentage (%)",
    specialDealLabel: "Deal Description",
    specialDealPlaceholder: "e.g. 2-for-1, Free dessert",
    validDaysLabel: "Valid Days",
    allDays: "All days",
    validHoursLabel: "Valid Hours",
    allDay: "All day",
    fromTime: "From",
    toTime: "To",
    monday: "Mon",
    tuesday: "Tue",
    wednesday: "Wed",
    thursday: "Thu",
    friday: "Fri",
    saturday: "Sat",
    sunday: "Sun",
    byDays: "By dates",
    fromDate: "From date",
    toDate: "To date",
    totalPeopleLabel: "Total Available People",
    maxPerRedemptionLabel: "Max People per Redemption",
    onePerUserLabel: "One per user",
    onePerUserDesc: "Each user can claim once",
    showReservationCta: "Show reservation button",
    showReservationCtaDesc: "Suggest users to book a table",
    updateOffer: "Update Offer",
    updating: "Updating...",
    allFieldsRequired: "Please fill in all required fields",
    offerUpdated: "Offer updated successfully!",
    offerUpdateFailed: "Failed to update offer",
    cancel: "Cancel",
    loading: "Loading...",
    offerImage: "Offer Image",
    currentImage: "Current image",
    termsConditions: "Terms & Conditions (optional)",
    termsPlaceholder: "e.g. Valid for new customers only...",
  },
};

// ============================================
// COMPONENT
// ============================================

const OfferEditDialog = ({ offer, open, onOpenChange, onSuccess }: OfferEditDialogProps) => {
  const { language } = useLanguage();
  const t = translations[language];
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customImage, setCustomImage] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string>("");
  const [tempImageFile, setTempImageFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    category: 'drink',
    discountType: 'percentage',
    percentOff: 10,
    specialDealText: '',
    validDays: DAYS_OF_WEEK,
    allDays: true,
    validStartTime: '00:00',
    validEndTime: '23:59',
    allDay: true,
    appearanceMode: 'days',
    appearanceStartDate: null,
    appearanceEndDate: null,
    totalPeople: 100,
    maxPeoplePerRedemption: 4,
    onePerUser: false,
    showReservationCta: false,
    termsAndConditions: '',
  });

  // Load existing offer data
  useEffect(() => {
    if (open && offer) {
      loadOfferData();
    }
  }, [open, offer]);

  // Reset image states when dialog opens
  useEffect(() => {
    if (open && offer) {
      setCustomImage(null);
      setExistingImageUrl(null);
      setCropDialogOpen(false);
      setTempImageSrc("");
      setTempImageFile(null);
    }
  }, [open, offer]);

  const loadOfferData = async () => {
    setIsLoading(true);
    try {
      const allDays = !offer.valid_days || offer.valid_days.length === 7;
      const allDay = !offer.valid_start_time || (offer.valid_start_time === '00:00' && offer.valid_end_time === '23:59');
      
      // Fetch business cover image as fallback
      const { data: business } = await supabase
        .from('businesses')
        .select('cover_url')
        .eq('id', offer.business_id)
        .single();
      
      // Use offer's own image if it has one, otherwise use business cover
      setExistingImageUrl(offer.offer_image_url || business?.cover_url || null);
      
      setFormData({
        title: offer.title || '',
        description: offer.description || '',
        category: (offer.category as OfferCategory) || 'drink',
        discountType: offer.discount_type === 'special_deal' ? 'special_deal' : 'percentage',
        percentOff: offer.percent_off || 10,
        specialDealText: offer.special_deal_text || '',
        validDays: offer.valid_days || DAYS_OF_WEEK,
        allDays,
        validStartTime: offer.valid_start_time?.substring(0, 5) || '00:00',
        validEndTime: offer.valid_end_time?.substring(0, 5) || '23:59',
        allDay,
        appearanceMode: 'days',
        appearanceStartDate: offer.start_at ? new Date(offer.start_at) : null,
        appearanceEndDate: offer.end_at ? new Date(offer.end_at) : null,
        totalPeople: offer.total_people || 100,
        maxPeoplePerRedemption: offer.max_people_per_redemption || 4,
        onePerUser: offer.one_per_user || false,
        showReservationCta: offer.show_reservation_cta || false,
        termsAndConditions: offer.terms || '',
      });
    } finally {
      setIsLoading(false);
    }
  };

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
    setCustomImage(croppedFile);
    setCropDialogOpen(false);
    setTempImageSrc("");
    setTempImageFile(null);
  };

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleDay = (day: string) => {
    setFormData(prev => {
      const newDays = prev.validDays.includes(day)
        ? prev.validDays.filter(d => d !== day)
        : [...prev.validDays, day];
      return { ...prev, validDays: newDays };
    });
  };

  const wordCount = formData.description.trim().split(/\s+/).filter(Boolean).length;
  const wordsRemaining = 60 - wordCount;

  const validate = (): string | null => {
    if (!formData.title.trim()) return t.allFieldsRequired;
    if (!formData.appearanceStartDate || !formData.appearanceEndDate) return t.allFieldsRequired;
    if (formData.totalPeople < 1) return t.allFieldsRequired;
    if (formData.maxPeoplePerRedemption < 1) return t.allFieldsRequired;
    return null;
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    setIsSubmitting(true);

    try {
      // Handle image upload if a new custom image was selected
      let offerImageUrl: string | null | undefined = undefined; // undefined means don't update
      
      if (customImage) {
        // Upload new custom image
        const compressedFile = await compressImage(customImage, 1920, 1080, 0.85);
        const fileName = `${offer.business_id}-${Date.now()}.jpg`;
        
        const { error: uploadError } = await supabase.storage
          .from('offer-images')
          .upload(fileName, compressedFile, { contentType: 'image/jpeg' });
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage.from('offer-images').getPublicUrl(fileName);
        offerImageUrl = publicUrl;
      }

      const updateData: Record<string, unknown> = {
        title: formData.title,
        description: formData.description || null,
        category: formData.category,
        discount_type: formData.discountType,
        percent_off: formData.discountType === 'percentage' ? formData.percentOff : null,
        special_deal_text: formData.discountType === 'special_deal' ? formData.specialDealText : null,
        valid_days: formData.allDays ? DAYS_OF_WEEK : formData.validDays,
        valid_start_time: formData.allDay ? '00:00' : formData.validStartTime,
        valid_end_time: formData.allDay ? '23:59' : formData.validEndTime,
        start_at: formData.appearanceStartDate!.toISOString(),
        end_at: formData.appearanceEndDate!.toISOString(),
        total_people: formData.totalPeople,
        max_people_per_redemption: formData.maxPeoplePerRedemption,
        one_per_user: formData.onePerUser,
        show_reservation_cta: formData.showReservationCta,
      };

      // Only update image URL if a new image was uploaded
      if (offerImageUrl !== undefined) {
        updateData.offer_image_url = offerImageUrl;
      }

      const { error: updateError } = await supabase
        .from('discounts')
        .update(updateData)
        .eq('id', offer.id);

      if (updateError) throw updateError;

      toast.success(t.offerUpdated);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error("Offer update error:", err);
      toast.error(t.offerUpdateFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[calc(100%-1rem)] sm:w-full mx-auto p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-sm sm:text-lg whitespace-nowrap">{t.editOffer}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" />
            <span className="ml-2 text-sm sm:text-base">{t.loading}</span>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {/* Section 1: Title */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="font-semibold text-xs sm:text-sm whitespace-nowrap">{t.step1}</Label>
              <Input
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder={t.titlePlaceholder}
                maxLength={100}
                className="h-9 sm:h-10 text-sm"
              />
            </div>

            {/* Section 2: Description */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="font-semibold text-xs sm:text-sm whitespace-nowrap">{t.step2}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder={t.descriptionPlaceholder}
                rows={3}
                className="resize-none text-sm"
              />
              <p className={cn(
                "text-[10px] sm:text-xs text-right",
                wordsRemaining < 0 ? "text-destructive" : "text-muted-foreground"
              )}>
                {wordsRemaining >= 0 
                  ? `${wordsRemaining} ${t.wordsRemaining}`
                  : `${Math.abs(wordsRemaining)} ${t.wordsOver}`
                }
              </p>
            </div>

            {/* Section 2b: Image */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="font-semibold text-xs sm:text-sm whitespace-nowrap">{t.step2b}</Label>
              {existingImageUrl && !customImage && (
                <div className="mb-3">
                  <img 
                    src={existingImageUrl} 
                    alt="Current" 
                    className="w-full h-32 sm:h-48 object-cover rounded-lg"
                  />
                  <p className="text-[10px] sm:text-sm text-muted-foreground mt-1">{t.currentImage}</p>
                </div>
              )}
              {customImage && (
                <div className="mb-3">
                  <img 
                    src={URL.createObjectURL(customImage)} 
                    alt="New" 
                    className="w-full h-32 sm:h-48 object-cover rounded-lg"
                  />
                </div>
              )}
              <ImageUploadField
                label={t.offerImage}
                language={language}
                onFileSelect={handleFileSelect}
                aspectRatio="16/9"
                maxSizeMB={5}
              />
            </div>

            {/* Section 3: Category */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="font-semibold text-xs sm:text-sm whitespace-nowrap">{t.step3}</Label>
              <Select
                value={formData.category}
                onValueChange={(value: OfferCategory) => updateField('category', value)}
              >
                <SelectTrigger className="h-9 sm:h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="drink">{t.drink}</SelectItem>
                  <SelectItem value="food">{t.food}</SelectItem>
                  <SelectItem value="account_total">{t.accountTotal}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Section 4: Discount Type */}
            <div className="space-y-2 sm:space-y-3">
              <Label className="font-semibold text-xs sm:text-sm whitespace-nowrap">{t.step4}</Label>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => updateField('discountType', 'percentage')}
                  className={cn(
                    "p-2 sm:p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-1 sm:gap-2",
                    formData.discountType === 'percentage'
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <Percent className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="font-medium text-[10px] sm:text-sm">{t.percentageDiscount}</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateField('discountType', 'special_deal')}
                  className={cn(
                    "p-2 sm:p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-1 sm:gap-2",
                    formData.discountType === 'special_deal'
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="font-medium text-[10px] sm:text-sm">{t.specialDeal}</span>
                </button>
              </div>

              {formData.discountType === 'percentage' && (
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-xs sm:text-sm">{t.percentOffLabel}</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={formData.percentOff}
                    onChange={(e) => updateField('percentOff', parseInt(e.target.value) || 0)}
                    className="h-9 sm:h-10 text-sm"
                  />
                </div>
              )}

              {formData.discountType === 'special_deal' && (
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-xs sm:text-sm">{t.specialDealLabel}</Label>
                  <Input
                    value={formData.specialDealText}
                    onChange={(e) => updateField('specialDealText', e.target.value)}
                    placeholder={t.specialDealPlaceholder}
                    className="h-9 sm:h-10 text-sm"
                  />
                </div>
              )}
            </div>

            {/* Section 5: When Discount Applies */}
            <div className="space-y-3 sm:space-y-4">
              <Label className="font-semibold text-xs sm:text-sm whitespace-nowrap">{t.step5}</Label>
              
              {/* Valid Days */}
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] sm:text-sm">{t.validDaysLabel}</Label>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Label htmlFor="all-days" className="text-[10px] sm:text-sm text-muted-foreground">{t.allDays}</Label>
                    <Switch
                      id="all-days"
                      checked={formData.allDays}
                      onCheckedChange={(checked) => updateField('allDays', checked)}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      disabled={formData.allDays}
                      className={cn(
                        "py-1.5 sm:py-2 px-0.5 sm:px-1 rounded-lg text-[9px] sm:text-xs font-medium transition-all",
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
                  <Label className="text-[10px] sm:text-sm">{t.validHoursLabel}</Label>
                  <div className="flex items-center gap-1.5 sm:gap-2">
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
                        className="h-8 sm:h-10 text-xs sm:text-sm"
                      />
                    </div>
                    <span className="text-muted-foreground mt-5 text-xs">→</span>
                    <div className="flex-1">
                      <Label className="text-[10px] sm:text-xs text-muted-foreground mb-1">{t.toTime}</Label>
                      <Input
                        type="time"
                        value={formData.validEndTime}
                        onChange={(e) => updateField('validEndTime', e.target.value)}
                        className="h-8 sm:h-10 text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3">
              <Label className="font-semibold text-xs sm:text-sm whitespace-nowrap">{t.step6}</Label>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="space-y-1 sm:space-y-2">
                  <Label className="text-[8px] sm:text-xs text-muted-foreground">{t.fromDate}</Label>
                  <div className="[&_button]:text-[9px] [&_button]:sm:text-sm [&_button]:h-8 [&_button]:sm:h-10 [&_button]:px-1.5 [&_button]:sm:px-3">
                    <DateTimePicker
                      value={formData.appearanceStartDate || undefined}
                      onChange={(date) => updateField('appearanceStartDate', date || null)}
                      dateOnlyDisplay
                    />
                  </div>
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label className="text-[8px] sm:text-xs text-muted-foreground">{t.toDate}</Label>
                  <div className="[&_button]:text-[9px] [&_button]:sm:text-sm [&_button]:h-8 [&_button]:sm:h-10 [&_button]:px-1.5 [&_button]:sm:px-3">
                    <DateTimePicker
                      value={formData.appearanceEndDate || undefined}
                      onChange={(date) => updateField('appearanceEndDate', date || null)}
                      dateOnlyDisplay
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 7: Availability */}
            <div className="space-y-3 sm:space-y-4">
              <Label className="font-semibold text-xs sm:text-sm whitespace-nowrap">{t.step7}</Label>
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div className="space-y-1 sm:space-y-2">
                  <Label className="text-[9px] sm:text-sm whitespace-nowrap">{t.totalPeopleLabel}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.totalPeople}
                    onChange={(e) => updateField('totalPeople', parseInt(e.target.value) || 1)}
                    className="h-8 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label className="text-[9px] sm:text-sm whitespace-nowrap">{t.maxPerRedemptionLabel}</Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={formData.maxPeoplePerRedemption}
                    onChange={(e) => updateField('maxPeoplePerRedemption', parseInt(e.target.value) || 1)}
                    className="h-8 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium text-xs sm:text-sm">{t.onePerUserLabel}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{t.onePerUserDesc}</p>
                </div>
                <Switch
                  checked={formData.onePerUser}
                  onCheckedChange={(checked) => updateField('onePerUser', checked)}
                />
              </div>
            </div>

            {/* Section 9: Optional Booking CTA */}
            <div className="space-y-2 sm:space-y-3">
              <Label className="font-semibold text-xs sm:text-sm whitespace-nowrap">{t.step9}</Label>
              <div className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium text-xs sm:text-sm">{t.showReservationCta}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{t.showReservationCtaDesc}</p>
                </div>
                <Switch
                  checked={formData.showReservationCta}
                  onCheckedChange={(checked) => updateField('showReservationCta', checked)}
                />
              </div>
            </div>

            {/* Terms & Conditions (Optional) */}
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm font-medium">{t.termsConditions}</Label>
              <Textarea
                value={formData.termsAndConditions}
                onChange={(e) => updateField('termsAndConditions', e.target.value)}
                placeholder={t.termsPlaceholder}
                className="min-h-[60px] text-xs sm:text-sm resize-none"
                rows={2}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 sm:gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 text-xs sm:text-sm h-9 sm:h-10"
                disabled={isSubmitting}
              >
                {t.cancel}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 text-xs sm:text-sm h-9 sm:h-10"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    {t.updating}
                  </>
                ) : (
                  t.updateOffer
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    
    <ImageCropDialog
      open={cropDialogOpen}
      onClose={() => setCropDialogOpen(false)}
      imageSrc={tempImageSrc}
      onCropComplete={handleCropComplete}
      aspectRatio="16:9"
    />
    </>
  );
};

export default OfferEditDialog;

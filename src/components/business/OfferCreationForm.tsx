import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Tag, Package, Clock, Calendar, AlertTriangle, Check, Info, Sparkles, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import OfferBoostSection from "./OfferBoostSection";

// ============================================
// TYPES
// ============================================

type OfferType = 'single' | 'bundle';
type AppearanceMode = 'hours' | 'days';

interface BundleItem {
  id: string;
  name: string;
  description: string;
}

interface FormData {
  // Step 1: Title
  title: string;
  // Step 2: Description
  description: string;
  // Step 3: Offer Type
  offerType: OfferType;
  // Step 4: Offer Details
  originalPriceCents: number;
  discountPercent: number;
  bundlePriceCents: number;
  bundleItems: BundleItem[];
  // Step 5: ΦΟΜΟ Appearance Duration
  appearanceMode: AppearanceMode;
  appearanceHours: number; // preset: 3, 6, 12, 24, or -1 for custom
  appearanceCustomHours: number;
  appearanceStartDate: Date | null;
  appearanceEndDate: Date | null;
  // Step 6: Availability
  maxPurchases: number | null;
  maxPerUser: number;
  // Step 7: Redemption
  requiresReservation: boolean;
  terms: string;
}

// ============================================
// TRANSLATIONS
// ============================================

const translations = {
  el: {
    createOffer: "Δημιουργία Προσφοράς",
    step1: "1. Τίτλος Προσφοράς",
    step2: "2. Περιγραφή Προσφοράς",
    step3: "3. Τύπος Προσφοράς",
    step4: "4. Λεπτομέρειες Προσφοράς",
    step5: "5. Διάρκεια Εμφάνισης στο ΦΟΜΟ",
    step6: "6. Διαθεσιμότητα",
    step7: "7. Ρυθμίσεις Εξαργύρωσης",
    required: "Υποχρεωτικό",
    titlePlaceholder: "Δώστε ένα όνομα στην προσφορά σας",
    descriptionPlaceholder: "Περιγράψτε την προσφορά σας...",
    wordsRemaining: "λέξεις απομένουν",
    wordsOver: "λέξεις πάνω από το όριο",
    singleItem: "Μεμονωμένο Προϊόν",
    singleItemDesc: "Ένα προϊόν ή υπηρεσία με έκπτωση",
    bundleOffer: "Πακέτο Προσφοράς",
    bundleDesc: "Πολλαπλά προϊόντα για μία τιμή",
    originalPrice: "Αρχική Τιμή (€)",
    discountPercent: "Ποσοστό Έκπτωσης (%)",
    bundlePrice: "Τιμή Πακέτου (€)",
    bundleItems: "Προϊόντα στο Πακέτο",
    addItem: "Προσθήκη Προϊόντος",
    itemName: "Όνομα προϊόντος",
    itemDescription: "Περιγραφή (προαιρετικό)",
    customerPays: "Ο πελάτης πληρώνει",
    youSave: "Εξοικονόμηση",
    // Appearance Duration
    byHours: "Με Ώρες",
    byDays: "Με Ημερομηνίες",
    appearanceDesc: "Πόσο καιρό θα εμφανίζεται η προσφορά στην εφαρμογή",
    customHours: "Προσαρμοσμένες ώρες",
    startDate: "Ημερομηνία Έναρξης",
    endDate: "Ημερομηνία Λήξης",
    // Availability
    maxTotal: "Μέγ. Συνολικά",
    maxPerUser: "Μέγ. ανά Χρήστη",
    unlimited: "Απεριόριστα",
    availabilityDesc: "Περιορισμοί στον αριθμό των αξιώσεων",
    // Redemption
    requiresReservation: "Απαιτεί Κράτηση",
    requiresReservationDesc: "Οι χρήστες πρέπει να κάνουν κράτηση για να λάβουν την προσφορά",
    termsConditions: "Όροι & Προϋποθέσεις",
    termsPlaceholder: "Προσθέστε τυχόν όρους ή περιορισμούς...",
    publishOffer: "Δημοσίευση Προσφοράς",
    publishing: "Δημοσίευση...",
    allFieldsRequired: "Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία",
    offerCreated: "Η προσφορά δημιουργήθηκε επιτυχώς!",
    offerCreateFailed: "Αποτυχία δημιουργίας προσφοράς",
    addAtLeastOneItem: "Προσθέστε τουλάχιστον ένα προϊόν στο πακέτο",
    noReservationsEnabled: "Οι άμεσες κρατήσεις δεν είναι ενεργοποιημένες για την επιχείρησή σας",
    hours: "ώρες",
  },
  en: {
    createOffer: "Create Offer",
    step1: "1. Offer Title",
    step2: "2. Offer Description",
    step3: "3. Offer Type",
    step4: "4. Offer Details",
    step5: "5. ΦΟΜΟ Appearance Duration",
    step6: "6. Availability",
    step7: "7. Redemption Settings",
    required: "Required",
    titlePlaceholder: "Give your offer a name",
    descriptionPlaceholder: "Describe your offer...",
    wordsRemaining: "words remaining",
    wordsOver: "words over limit",
    singleItem: "Single Item",
    singleItemDesc: "One product or service with a discount",
    bundleOffer: "Bundle Offer",
    bundleDesc: "Multiple items for one price",
    originalPrice: "Original Price (€)",
    discountPercent: "Discount Percentage (%)",
    bundlePrice: "Bundle Price (€)",
    bundleItems: "Items in Bundle",
    addItem: "Add Item",
    itemName: "Item name",
    itemDescription: "Description (optional)",
    customerPays: "Customer pays",
    youSave: "You save",
    // Appearance Duration
    byHours: "By Hours",
    byDays: "By Days",
    appearanceDesc: "How long the offer will be visible in the app",
    customHours: "Custom hours",
    startDate: "Start Date",
    endDate: "End Date",
    // Availability
    maxTotal: "Max Total Claims",
    maxPerUser: "Max Per User",
    unlimited: "Unlimited",
    availabilityDesc: "Limits on how many times this offer can be claimed",
    // Redemption
    requiresReservation: "Requires Reservation",
    requiresReservationDesc: "Users must make a reservation to claim this offer",
    termsConditions: "Terms & Conditions",
    termsPlaceholder: "Add any terms or restrictions...",
    publishOffer: "Publish Offer",
    publishing: "Publishing...",
    allFieldsRequired: "Please fill in all required fields",
    offerCreated: "Offer created successfully!",
    offerCreateFailed: "Failed to create offer",
    addAtLeastOneItem: "Add at least one item to the bundle",
    noReservationsEnabled: "Direct reservations are not enabled for your business",
    hours: "hours",
  },
};

// ============================================
// HELPERS
// ============================================

const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(Boolean).length;
};

const generateId = () => `item-${Date.now()}-${Math.random().toString(36).substring(7)}`;

const generateQRToken = (businessId: string) => {
  return `${businessId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
};

const calculateAppearanceEndDate = (startDate: Date, hours: number): Date => {
  const end = new Date(startDate);
  end.setTime(end.getTime() + hours * 60 * 60 * 1000);
  return end;
};

// ============================================
// COMPONENT
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
    offerType: 'single',
    originalPriceCents: 0,
    discountPercent: 20,
    bundlePriceCents: 0,
    bundleItems: [],
    // Appearance Duration
    appearanceMode: 'hours',
    appearanceHours: 6, // default 6 hours
    appearanceCustomHours: 12,
    appearanceStartDate: new Date(),
    appearanceEndDate: calculateAppearanceEndDate(new Date(), 6),
    // Availability
    maxPurchases: null,
    maxPerUser: 1,
    // Redemption
    requiresReservation: false,
    terms: '',
  });

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Boost data - uses OfferBoostSection's expected format
  const [boostData, setBoostData] = useState<{
    enabled: boolean;
    tier: "standard" | "premium";
    durationMode: "hourly" | "daily";
    startDate: Date;
    endDate: Date;
    durationHours?: number;
    totalCostCents: number;
    dailyRateCents: number;
    hourlyRateCents?: number;
    targetingQuality: number;
  }>({
    enabled: false,
    tier: "standard",
    durationMode: "daily",
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    totalCostCents: 0,
    dailyRateCents: 3000,
    targetingQuality: 70,
  });

  // Fetch business data
  const { data: businessData, isLoading: isLoadingBusiness } = useQuery({
    queryKey: ["business-verification", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("verified, name, accepts_direct_reservations")
        .eq("id", businessId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const isBusinessVerified = businessData?.verified === true;
  const hasDirectReservations = businessData?.accepts_direct_reservations === true;

  // Word count
  const wordCount = countWords(formData.description);
  const maxWords = 60;
  const wordsRemaining = maxWords - wordCount;

  // Price calculations
  const getEffectivePrice = () => {
    if (formData.offerType === 'bundle') {
      return formData.bundlePriceCents / 100;
    }
    return formData.originalPriceCents / 100;
  };

  const effectivePrice = getEffectivePrice();
  const discountAmount = effectivePrice * (formData.discountPercent / 100);
  const finalPrice = effectivePrice - discountAmount;

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
      
      return next;
    });
  };

  // Bundle item handlers
  const addBundleItem = () => {
    const newItem: BundleItem = { id: generateId(), name: '', description: '' };
    updateField('bundleItems', [...formData.bundleItems, newItem]);
  };

  const updateBundleItem = (id: string, updates: Partial<BundleItem>) => {
    const items = formData.bundleItems.map(item =>
      item.id === id ? { ...item, ...updates } : item
    );
    updateField('bundleItems', items);
  };

  const removeBundleItem = (id: string) => {
    updateField('bundleItems', formData.bundleItems.filter(item => item.id !== id));
  };

  const moveBundleItem = (index: number, direction: 'up' | 'down') => {
    const items = [...formData.bundleItems];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;
    [items[index], items[newIndex]] = [items[newIndex], items[index]];
    updateField('bundleItems', items);
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
    
    const { start, end } = getAppearanceDates();
    if (!start || !end) return t.allFieldsRequired;
    
    if (formData.offerType === 'single') {
      if (formData.originalPriceCents <= 0) return t.allFieldsRequired;
    } else {
      if (formData.bundlePriceCents <= 0) return t.allFieldsRequired;
      if (formData.bundleItems.length === 0) return t.addAtLeastOneItem;
      if (formData.bundleItems.some(item => !item.name.trim())) return t.allFieldsRequired;
    }
    
    if (formData.discountPercent < 1 || formData.discountPercent > 99) return t.allFieldsRequired;
    
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
      // Calculate appearance dates
      const appearance = getAppearanceDates();

      // Insert the offer
      const { data: offerData, error: insertError } = await supabase.from('discounts').insert({
        business_id: businessId,
        title: formData.title,
        description: formData.description || null,
        original_price_cents: formData.offerType === 'single' ? formData.originalPriceCents : null,
        bundle_price_cents: formData.offerType === 'bundle' ? formData.bundlePriceCents : null,
        percent_off: formData.discountPercent,
        pricing_type: formData.offerType,
        offer_type: 'regular',
        start_at: appearance.start.toISOString(),
        end_at: appearance.end.toISOString(),
        max_purchases: formData.maxPurchases,
        max_per_user: formData.maxPerUser,
        requires_reservation: formData.requiresReservation && hasDirectReservations,
        terms: formData.terms || null,
        qr_code_token: generateQRToken(businessId),
        active: true,
      }).select().single();

      if (insertError) throw insertError;

      // Insert bundle items if applicable
      if (formData.offerType === 'bundle' && formData.bundleItems.length > 0 && offerData) {
        for (let i = 0; i < formData.bundleItems.length; i++) {
          const item = formData.bundleItems[i];
          await supabase.from('discount_items').insert({
            discount_id: offerData.id,
            name: item.name,
            description: item.description || null,
            sort_order: i,
          });
        }
      }

      // Handle boost if enabled
      if (boostData.enabled && offerData) {
        await supabase.functions.invoke("create-offer-boost", {
          body: {
            discountId: offerData.id,
            tier: boostData.tier,
            startDate: boostData.startDate.toISOString().split("T")[0],
            endDate: boostData.endDate.toISOString().split("T")[0],
          },
        });
      }

      toast.success(t.offerCreated);
      navigate('/dashboard-business/offers');

    } catch (err) {
      console.error("Offer creation error:", err);
      toast.error(t.offerCreateFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // RENDER HELPERS
  // ============================================

  const SectionCard = ({
    title,
    required = false,
    children,
  }: {
    title: string;
    required?: boolean;
    children: React.ReactNode;
  }) => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-2 border-b">
        <h3 className="font-semibold text-lg">{title}</h3>
        {required && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {t.required}
          </span>
        )}
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );

  // Appearance hour presets
  const hourPresets = [3, 6, 12, 24];

  // ============================================
  // RENDER
  // ============================================

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Sparkles className="h-6 w-6 text-primary" />
          {t.createOffer}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6 space-y-8">
        {/* Verification Warning */}
        {!isLoadingBusiness && !isBusinessVerified && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
              {language === 'el' ? 'Η επιχείρησή σας δεν έχει επαληθευτεί' : 'Your business is not verified'}
            </AlertTitle>
            <AlertDescription>
              {language === 'el'
                ? 'Δεν μπορείτε να δημοσιεύσετε προσφορές μέχρι να επαληθευτεί η επιχείρησή σας.'
                : 'You cannot publish offers until your business is verified.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Step 1: Title */}
        <SectionCard title={t.step1} required>
          <Input
            value={formData.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder={t.titlePlaceholder}
            maxLength={100}
          />
        </SectionCard>

        {/* Step 2: Description */}
        <SectionCard title={t.step2}>
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

        {/* Step 3: Offer Type */}
        <SectionCard title={t.step3} required>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Single Item */}
            <button
              type="button"
              onClick={() => updateField('offerType', 'single')}
              className={cn(
                "p-6 rounded-xl border-2 transition-all text-center space-y-3",
                formData.offerType === 'single'
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-primary/50"
              )}
            >
              <Tag className="h-8 w-8 mx-auto text-primary" />
              <div>
                <p className="font-medium">{t.singleItem}</p>
                <p className="text-sm text-muted-foreground">{t.singleItemDesc}</p>
              </div>
            </button>

            {/* Bundle */}
            <button
              type="button"
              onClick={() => updateField('offerType', 'bundle')}
              className={cn(
                "p-6 rounded-xl border-2 transition-all text-center space-y-3",
                formData.offerType === 'bundle'
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-primary/50"
              )}
            >
              <Package className="h-8 w-8 mx-auto text-primary" />
              <div>
                <p className="font-medium">{t.bundleOffer}</p>
                <p className="text-sm text-muted-foreground">{t.bundleDesc}</p>
              </div>
            </button>
          </div>
        </SectionCard>

        {/* Step 4: Offer Details */}
        <SectionCard title={t.step4} required>
          {formData.offerType === 'single' ? (
            // Single Item Fields
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.originalPrice} *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="10.00"
                    value={formData.originalPriceCents ? (formData.originalPriceCents / 100).toFixed(2) : ''}
                    onChange={(e) => updateField('originalPriceCents', Math.round(parseFloat(e.target.value || '0') * 100))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.discountPercent} *</Label>
                  <Input
                    type="number"
                    min="1"
                    max="99"
                    placeholder="20"
                    value={formData.discountPercent || ''}
                    onChange={(e) => updateField('discountPercent', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
          ) : (
            // Bundle Fields
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.bundlePrice} *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="25.00"
                    value={formData.bundlePriceCents ? (formData.bundlePriceCents / 100).toFixed(2) : ''}
                    onChange={(e) => updateField('bundlePriceCents', Math.round(parseFloat(e.target.value || '0') * 100))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.discountPercent} *</Label>
                  <Input
                    type="number"
                    min="1"
                    max="99"
                    placeholder="20"
                    value={formData.discountPercent || ''}
                    onChange={(e) => updateField('discountPercent', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              {/* Bundle Items */}
              <div className="space-y-3">
                <Label>{t.bundleItems}</Label>
                {formData.bundleItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="p-4 border rounded-lg bg-muted/30 space-y-3"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-3">
                        <Input
                          placeholder={t.itemName}
                          value={item.name}
                          onChange={(e) => updateBundleItem(item.id, { name: e.target.value })}
                        />
                        <Input
                          placeholder={t.itemDescription}
                          value={item.description}
                          onChange={(e) => updateBundleItem(item.id, { description: e.target.value })}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => moveBundleItem(index, 'up')}
                          disabled={index === 0}
                          className="h-8 w-8"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => moveBundleItem(index, 'down')}
                          disabled={index === formData.bundleItems.length - 1}
                          className="h-8 w-8"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeBundleItem(item.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addBundleItem}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t.addItem}
                </Button>
              </div>
            </div>
          )}

          {/* Price Preview */}
          {effectivePrice > 0 && formData.discountPercent > 0 && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 mt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{formData.offerType === 'single' ? t.originalPrice : t.bundlePrice}</span>
                <span className="line-through">€{effectivePrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t.youSave}</span>
                <span className="text-green-600">-{formData.discountPercent}% (€{discountAmount.toFixed(2)})</span>
              </div>
              <div className="flex justify-between font-semibold text-lg border-t pt-2">
                <span>{t.customerPays}</span>
                <span className="text-primary">€{finalPrice.toFixed(2)}</span>
              </div>
              {formData.offerType === 'bundle' && formData.bundleItems.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formData.bundleItems.length} {language === 'el' ? 'προϊόντα' : 'items'}
                </p>
              )}
            </div>
          )}
        </SectionCard>

        {/* Step 5: ΦΟΜΟ Appearance Duration */}
        <SectionCard title={t.step5} required>
          <p className="text-sm text-muted-foreground -mt-2 mb-4">{t.appearanceDesc}</p>
          
          {/* Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <Button
              type="button"
              variant={formData.appearanceMode === 'hours' ? "default" : "outline"}
              size="sm"
              onClick={() => updateField('appearanceMode', 'hours')}
              className="flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              {t.byHours}
            </Button>
            <Button
              type="button"
              variant={formData.appearanceMode === 'days' ? "default" : "outline"}
              size="sm"
              onClick={() => updateField('appearanceMode', 'days')}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              {t.byDays}
            </Button>
          </div>

          {formData.appearanceMode === 'hours' ? (
            // Hours Mode
            <div className="space-y-4">
              {/* Hour Presets */}
              <div className="flex flex-wrap gap-2">
                {hourPresets.map((hours) => (
                  <Button
                    key={hours}
                    type="button"
                    variant={formData.appearanceHours === hours ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateField('appearanceHours', hours)}
                  >
                    {hours} {t.hours}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant={formData.appearanceHours === -1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateField('appearanceHours', -1)}
                >
                  {t.customHours}
                </Button>
              </div>
              
              {/* Custom Hours Input */}
              {formData.appearanceHours === -1 && (
                <div className="space-y-2">
                  <Label>{t.customHours}</Label>
                  <Input
                    type="number"
                    min="1"
                    max="168"
                    value={formData.appearanceCustomHours}
                    onChange={(e) => updateField('appearanceCustomHours', parseInt(e.target.value) || 1)}
                    className="max-w-[200px]"
                  />
                </div>
              )}
            </div>
          ) : (
            // Days Mode
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </SectionCard>

        {/* Step 6: Availability */}
        <SectionCard title={t.step6}>
          <p className="text-sm text-muted-foreground -mt-2 mb-4">{t.availabilityDesc}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t.maxTotal}</Label>
              <Input
                type="number"
                min="1"
                placeholder={t.unlimited}
                value={formData.maxPurchases ?? ''}
                onChange={(e) => updateField('maxPurchases', e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.maxPerUser}</Label>
              <Input
                type="number"
                min="1"
                value={formData.maxPerUser}
                onChange={(e) => updateField('maxPerUser', parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
        </SectionCard>

        {/* Step 7: Redemption Settings */}
        <SectionCard title={t.step7}>
          <div className="space-y-4">
            {/* Requires Reservation Toggle */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">{t.requiresReservation}</Label>
                <p className="text-sm text-muted-foreground">{t.requiresReservationDesc}</p>
                {!hasDirectReservations && (
                  <p className="text-xs text-amber-600">{t.noReservationsEnabled}</p>
                )}
              </div>
              <Switch
                checked={formData.requiresReservation}
                onCheckedChange={(checked) => updateField('requiresReservation', checked)}
                disabled={!hasDirectReservations}
              />
            </div>

            {/* Terms */}
            <div className="space-y-2">
              <Label>{t.termsConditions}</Label>
              <Textarea
                value={formData.terms}
                onChange={(e) => updateField('terms', e.target.value)}
                placeholder={t.termsPlaceholder}
                rows={3}
              />
            </div>
          </div>
        </SectionCard>

        {/* Boost Section */}
        <OfferBoostSection
          onBoostChange={setBoostData}
        />

        {/* Submit Button */}
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || (!isLoadingBusiness && !isBusinessVerified)}
          className="w-full h-12 text-lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {t.publishing}
            </>
          ) : (
            <>
              <Check className="mr-2 h-5 w-5" />
              {t.publishOffer}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default OfferCreationForm;

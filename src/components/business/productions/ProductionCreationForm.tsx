import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { NumberInput } from "@/components/ui/number-input";
import { Switch } from "@/components/ui/switch";
import { Loader2, Sparkles, Theater, Clock, Coffee, Users, Baby } from "lucide-react";
import { ImageUploadField } from "../ImageUploadField";
import { ImageCropDialog } from "../ImageCropDialog";
import { compressImage } from "@/lib/imageCompression";
import { useLanguage } from "@/hooks/useLanguage";
import { useCommissionRate } from "@/hooks/useCommissionRate";
import { cn } from "@/lib/utils";
import { CastCrewEditor, CastMember } from "./CastCrewEditor";
import { ShowInstanceEditor, ShowInstance } from "./ShowInstanceEditor";
import EventBoostDialog from "../EventBoostDialog";
import { DateTimePicker } from "@/components/ui/date-time-picker";

// ============================================
// SECTION CARD
// ============================================
interface SectionCardProps {
  title: string;
  icon?: React.ReactNode;
  required?: boolean;
  requiredLabel: string;
  children: React.ReactNode;
}
const SectionCard: React.FC<SectionCardProps> = ({ title, icon, required, requiredLabel, children }) => (
  <div className="space-y-3 sm:space-y-4">
    <div className="flex items-center gap-2 sm:gap-3 pb-2 border-b">
      {icon}
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

// ============================================
// TRANSLATIONS
// ============================================
const translations = {
  el: {
    createProduction: "Δημιουργία Παράστασης",
    step1: "1. Τίτλος Παράστασης",
    step2: "2. Περιγραφή",
    step3: "3. Εικόνα Κάλυψης",
    step4: "4. Λεπτομέρειες Παράστασης",
    step5: "5. Διάλειμμα",
    step6: "6. Ηθοποιοί & Συντελεστές",
    step7: "7. Ομαδικές Κρατήσεις",
    step8: "8. Ημερομηνίες & Χώρος",
    step9: "9. Εμφάνιση στο ΦΟΜΟ",
    required: "Υποχρεωτικό",
    titlePlaceholder: "π.χ. Το Θαύμα, Romeo & Juliet...",
    descPlaceholder: "Περιγράψτε την παράσταση (υπόθεση, θέμα, ατμόσφαιρα)...",
    wordsRemaining: "λέξεις απομένουν",
    wordsOver: "λέξεις πάνω από το όριο",
    coverImage: "Εικόνα Κάλυψης",
    duration: "Διάρκεια (λεπτά)",
    minAge: "Ελάχιστη ηλικία (0 = χωρίς περιορισμό)",
    hasIntermission: "Η παράσταση έχει διάλειμμα",
    intermissionCount: "Αριθμός διαλειμμάτων",
    intermissionDuration: "Διάρκεια (λεπτά)",
    refreshmentsAvailable: "Διαθέσιμο μπαρ/αναψυκτήριο",
    groupBooking: "Ενεργοποίηση ομαδικών κρατήσεων",
    groupMinSize: "Ελάχιστο μέγεθος ομάδας",
    groupDiscount: "Έκπτωση (%)",
    groupEmail: "Email επικοινωνίας",
    groupPhone: "Τηλέφωνο επικοινωνίας",
    appearance: "Εμφάνιση στο ΦΟΜΟ",
    appearanceStart: "Έναρξη εμφάνισης",
    appearanceEnd: "Λήξη εμφάνισης",
    publish: "Δημοσίευση Παράστασης",
    publishing: "Δημοσίευση...",
    allRequired: "Συμπληρώστε όλα τα υποχρεωτικά πεδία",
    addShowFirst: "Προσθέστε τουλάχιστον μία ημερομηνία παράστασης",
    selectVenue: "Επιλέξτε χώρο για κάθε παράσταση",
    selectStartTime: "Ορίστε ώρα έναρξης για κάθε παράσταση",
    success: "Η παράσταση δημιουργήθηκε επιτυχώς!",
    failed: "Αποτυχία δημιουργίας",
    optional: "Προαιρετικό",
  },
  en: {
    createProduction: "Create Production",
    step1: "1. Production Title",
    step2: "2. Description",
    step3: "3. Cover Image",
    step4: "4. Production Details",
    step5: "5. Intermission",
    step6: "6. Cast & Crew",
    step7: "7. Group Bookings",
    step8: "8. Show Dates & Venue",
    step9: "9. Appearance on ΦΟΜΟ",
    required: "Required",
    titlePlaceholder: "e.g. The Miracle, Romeo & Juliet...",
    descPlaceholder: "Describe the production (plot, theme, atmosphere)...",
    wordsRemaining: "words remaining",
    wordsOver: "words over limit",
    coverImage: "Cover Image",
    duration: "Duration (minutes)",
    minAge: "Minimum age (0 = no restriction)",
    hasIntermission: "Production has intermission",
    intermissionCount: "Number of intermissions",
    intermissionDuration: "Duration (minutes)",
    refreshmentsAvailable: "Refreshments/bar available",
    groupBooking: "Enable group bookings",
    groupMinSize: "Minimum group size",
    groupDiscount: "Discount (%)",
    groupEmail: "Contact email",
    groupPhone: "Contact phone",
    appearance: "Appearance on ΦΟΜΟ",
    appearanceStart: "Appearance start",
    appearanceEnd: "Appearance end",
    publish: "Publish Production",
    publishing: "Publishing...",
    allRequired: "Please fill in all required fields",
    addShowFirst: "Add at least one show date",
    selectVenue: "Select a venue for each show",
    selectStartTime: "Set a start time for each show",
    success: "Production created successfully!",
    failed: "Failed to create production",
    optional: "Optional",
  },
};

const countWords = (text: string): number =>
  text.trim().split(/\s+/).filter((w) => w.length > 0).length;

// ============================================
// MAIN COMPONENT
// ============================================
interface ProductionCreationFormProps {
  businessId: string;
}

const ProductionCreationForm = ({ businessId }: ProductionCreationFormProps) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language];

  const { data: commissionData } = useCommissionRate(businessId);

  // Subscription for boost dialog
  const { data: activeSubscription } = useQuery({
    queryKey: ["business-subscription-active", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_subscriptions")
        .select("monthly_budget_remaining_cents, status")
        .eq("business_id", businessId)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
    staleTime: 30_000,
  });

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [minAgeHint, setMinAgeHint] = useState(0);
  
  // Intermission
  const [hasIntermission, setHasIntermission] = useState(false);
  const [intermissionCount, setIntermissionCount] = useState(1);
  const [intermissionDuration, setIntermissionDuration] = useState(15);
  const [intermissionRefreshments, setIntermissionRefreshments] = useState(true);

  // Cast
  const [castMembers, setCastMembers] = useState<CastMember[]>([]);

  // Group booking
  const [groupBookingEnabled, setGroupBookingEnabled] = useState(false);
  const [groupMinSize, setGroupMinSize] = useState(10);
  const [groupDiscount, setGroupDiscount] = useState(15);
  const [groupEmail, setGroupEmail] = useState('');
  const [groupPhone, setGroupPhone] = useState('');

  // Show instances
  const [showInstances, setShowInstances] = useState<ShowInstance[]>([]);

  // Appearance
  const [appearanceStart, setAppearanceStart] = useState<Date | null>(null);
  const [appearanceEnd, setAppearanceEnd] = useState<Date | null>(null);

  // Image
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState('');
  const [tempImageFile, setTempImageFile] = useState<File | null>(null);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);
  const [boostDialogOpen, setBoostDialogOpen] = useState(false);

  // Word count
  const descWordCount = countWords(description);
  const maxWords = 100;
  const wordsRemaining = maxWords - descWordCount;

  // Image handlers
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
    const croppedFile = new File([croppedBlob], tempImageFile?.name || 'cropped.jpg', { type: 'image/jpeg' });
    setCoverImage(croppedFile);
    setCropDialogOpen(false);
    setTempImageSrc('');
    setTempImageFile(null);
  };

  // Validation
  const validate = (): string | null => {
    if (!title.trim()) return language === 'el' ? 'Συμπληρώστε τον τίτλο' : 'Please fill in the title';
    if (!description.trim()) return language === 'el' ? 'Συμπληρώστε την περιγραφή' : 'Please fill in the description';
    if (wordsRemaining < 0) return language === 'el' ? 'Η περιγραφή υπερβαίνει τις 100 λέξεις' : 'Description exceeds 100 words';
    if (!coverImage) return language === 'el' ? 'Προσθέστε εικόνα κάλυψης' : 'Please add a cover image';
    if (showInstances.length === 0) return t.addShowFirst;
    for (const si of showInstances) {
      if (!si.venue_id) return t.selectVenue;
      if (!si.start_at) return t.selectStartTime;
    }
    return null;
  };

  // Submit
  const handleSubmit = async () => {
    const error = validate();
    if (error) { toast.error(error); return; }
    setIsSubmitting(true);

    try {
      // Upload cover
      let coverImageUrl = null;
      if (coverImage) {
        const compressed = await compressImage(coverImage, 1920, 1080, 0.85);
        const fileName = `${businessId}-prod-${Date.now()}.jpg`;
        const { error: uploadErr } = await supabase.storage.from('event-covers').upload(fileName, compressed, { contentType: 'image/jpeg' });
        if (uploadErr) throw uploadErr;
        const { data: { publicUrl } } = supabase.storage.from('event-covers').getPublicUrl(fileName);
        coverImageUrl = publicUrl;
      }

      // Get business category
      const { data: biz } = await supabase.from('businesses').select('category').eq('id', businessId).single();

      // Create production
      const { data: production, error: prodErr } = await supabase.from('productions').insert({
        business_id: businessId,
        title: title.trim(),
        description: description.trim(),
        cover_image_url: coverImageUrl,
        duration_minutes: durationMinutes,
        min_age_hint: minAgeHint || null,
        category: biz?.category || ['theatre'],
        status: 'active',
        intermission_count: hasIntermission ? intermissionCount : 0,
        intermission_duration_minutes: hasIntermission ? intermissionDuration : null,
        intermission_refreshments: hasIntermission ? intermissionRefreshments : null,
        group_booking_enabled: groupBookingEnabled,
        group_min_size: groupBookingEnabled ? groupMinSize : null,
        group_discount_percent: groupBookingEnabled ? groupDiscount : null,
        group_contact_email: groupBookingEnabled ? groupEmail || null : null,
        group_contact_phone: groupBookingEnabled ? groupPhone || null : null,
      }).select().single();

      if (prodErr || !production) throw prodErr || new Error('Failed to create production');

      // Save cast members
      if (castMembers.length > 0) {
        const castToInsert = castMembers.filter(m => m.person_name.trim()).map((m, i) => ({
          production_id: production.id,
          person_name: m.person_name.trim(),
          role_type: m.role_type,
          role_name: m.role_name.trim() || null,
          bio: m.bio.trim() || null,
          sort_order: i,
        }));
        if (castToInsert.length > 0) {
          const { error: castErr } = await supabase.from('production_cast').insert(castToInsert);
          if (castErr) throw castErr;
        }
      }

      // Create ONE event for the entire production, then link all show instances to it
      const validShows = showInstances.filter(si => si.start_at && si.venue_id);
      if (validShows.length === 0) throw new Error('No valid show instances');

      // Use earliest start and latest end for the event dates
      const sortedByStart = [...validShows].sort((a, b) => a.start_at!.getTime() - b.start_at!.getTime());
      const earliestStart = sortedByStart[0].start_at!;
      const latestEnd = sortedByStart.reduce((latest, si) => {
        const endAt = si.end_at || new Date(si.start_at!.getTime() + durationMinutes * 60 * 1000);
        return endAt > latest ? endAt : latest;
      }, new Date(0));

      // Use the first show's venue for the event location
      const firstVenueId = sortedByStart[0].venue_id;
      const { data: venueInfo } = await supabase.from('venues').select('name, address, city').eq('id', firstVenueId).single();
      const venueLocation = venueInfo ? `${venueInfo.name}, ${venueInfo.address || ''}, ${venueInfo.city || ''}`.replace(/, ,/g, ',').replace(/,\s*$/, '') : 'Venue TBD';

      // Create a SINGLE linked event
      const { data: linkedEvent, error: eventErr } = await supabase.from('events').insert({
        business_id: businessId,
        title: title.trim(),
        description: description.trim(),
        location: venueLocation,
        venue_name: venueInfo?.name || null,
        start_at: earliestStart.toISOString(),
        end_at: latestEnd.toISOString(),
        cover_image_url: coverImageUrl,
        category: biz?.category || ['theatre'],
        price_tier: 'medium' as const,
        event_type: 'ticket',
        appearance_mode: 'date_range',
        appearance_start_at: appearanceStart?.toISOString() || new Date().toISOString(),
        appearance_end_at: appearanceEnd?.toISOString() || earliestStart.toISOString(),
      }).select().single();

      if (eventErr || !linkedEvent) throw eventErr || new Error('Failed to create event');
      const firstEventId = linkedEvent.id;

      // For each show instance: create show_instance + zone pricing + ticket tiers
      for (const si of validShows) {
        const endAt = si.end_at || new Date(si.start_at!.getTime() + durationMinutes * 60 * 1000);

        // Create show instance linked to the SINGLE event
        const { data: showInst, error: showErr } = await supabase.from('show_instances').insert({
          production_id: production.id,
          venue_id: si.venue_id,
          event_id: linkedEvent.id,
          start_at: si.start_at!.toISOString(),
          end_at: endAt.toISOString(),
          doors_open_at: si.doors_open_at?.toISOString() || null,
          notes: si.notes || null,
          status: 'scheduled',
        }).select().single();

        if (showErr || !showInst) throw showErr || new Error('Failed to create show instance');

        // Create zone pricing
        if (si.zone_prices.length > 0) {
          const zonePricesToInsert = si.zone_prices.map((zp) => ({
            show_instance_id: showInst.id,
            venue_zone_id: zp.zone_id,
            price_cents: zp.price_cents,
          }));
          const { error: zpErr } = await supabase.from('show_zone_pricing').insert(zonePricesToInsert);
          if (zpErr) throw zpErr;
        }

        // Create ticket tiers from zone pricing, with seat counts from venue
        const houseSeatsPerZone = new Map<string, number>();
        if (si.house_seats && si.house_seats.length > 0) {
          for (const hs of si.house_seats) {
            const zp = si.zone_prices.find(z => z.zone_name === hs.zoneName);
            if (zp) {
              houseSeatsPerZone.set(zp.zone_id, (houseSeatsPerZone.get(zp.zone_id) || 0) + 1);
            }
          }
        }

        for (const zp of si.zone_prices) {
          const { count: seatCount } = await supabase
            .from('venue_seats')
            .select('id', { count: 'exact', head: true })
            .eq('zone_id', zp.zone_id)
            .eq('is_active', true);

          const houseCount = houseSeatsPerZone.get(zp.zone_id) || 0;
          const availableSeats = Math.max(0, (seatCount || 0) - houseCount);

          const { error: tierErr } = await supabase.from('ticket_tiers').insert({
            event_id: linkedEvent.id,
            name: zp.zone_name,
            price_cents: zp.price_cents,
            currency: 'EUR',
            quantity_total: availableSeats,
            max_per_order: 10,
            sort_order: 0,
          }).select().single();
          if (tierErr) console.warn('Tier creation warning:', tierErr);
        }

        // Insert house seats into show_instance_seats as 'sold' (reserved by house)
        if (si.house_seats && si.house_seats.length > 0) {
          const houseSeatRows = si.house_seats.map(hs => ({
            show_instance_id: showInst.id,
            venue_seat_id: hs.seatId,
            status: 'sold',
            price_cents: 0,
          }));
          const { error: hsErr } = await supabase.from('show_instance_seats').insert(houseSeatRows);
          if (hsErr) console.warn('House seats insertion warning:', hsErr);
        }
      }

      toast.success(t.success);
      
      if (firstEventId) {
        setCreatedEventId(firstEventId);
        setBoostDialogOpen(true);
      } else {
        navigate('/dashboard-business/events');
      }
    } catch (err) {
      console.error('Error creating production:', err);
      toast.error((err as any)?.message || t.failed);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
          <Theater className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          {t.createProduction}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6 sm:space-y-8">
        {/* 1. Title */}
        <SectionCard title={t.step1} required requiredLabel={t.required}>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.titlePlaceholder}
            maxLength={120}
            className="text-xs sm:text-sm h-9 sm:h-10"
          />
        </SectionCard>

        {/* 2. Description */}
        <SectionCard title={t.step2} required requiredLabel={t.required}>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t.descPlaceholder}
            rows={4}
            className="text-xs sm:text-sm"
          />
          <p className={cn("text-xs sm:text-sm", wordsRemaining >= 0 ? "text-muted-foreground" : "text-destructive font-medium")}>
            {wordsRemaining >= 0 ? `${wordsRemaining} ${t.wordsRemaining}` : `${Math.abs(wordsRemaining)} ${t.wordsOver}`}
          </p>
        </SectionCard>

        {/* 3. Cover Image */}
        <SectionCard title={t.step3} required requiredLabel={t.required}>
          <ImageUploadField
            label={t.coverImage}
            language={language}
            onFileSelect={handleFileSelect}
            aspectRatio="4/5"
            maxSizeMB={5}
          />
        </SectionCard>

        {/* 4. Details */}
        <SectionCard title={t.step4} icon={<Clock className="h-4 w-4 text-muted-foreground" />} required requiredLabel={t.required}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">{t.duration}</Label>
              <NumberInput
                value={durationMinutes}
                onChange={setDurationMinutes}
                min={15}
                max={600}
                className="h-9 sm:h-10 text-xs sm:text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm flex items-center gap-1.5">
                <Baby className="h-3 w-3" />
                {t.minAge}
              </Label>
              <NumberInput
                value={minAgeHint}
                onChange={setMinAgeHint}
                min={0}
                max={21}
                className="h-9 sm:h-10 text-xs sm:text-sm"
              />
            </div>
          </div>
        </SectionCard>

        {/* 5. Intermission */}
        <SectionCard title={t.step5} icon={<Coffee className="h-4 w-4 text-muted-foreground" />} requiredLabel={t.optional}>
          <div className="flex items-center gap-3">
            <Switch checked={hasIntermission} onCheckedChange={setHasIntermission} />
            <Label className="text-xs sm:text-sm cursor-pointer">{t.hasIntermission}</Label>
          </div>
          {hasIntermission && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-2 p-3 bg-muted/30 rounded-lg border">
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">{t.intermissionCount}</Label>
                <NumberInput value={intermissionCount} onChange={setIntermissionCount} min={1} max={3} className="h-8 sm:h-9 text-xs sm:text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">{t.intermissionDuration}</Label>
                <NumberInput value={intermissionDuration} onChange={setIntermissionDuration} min={5} max={30} className="h-8 sm:h-9 text-xs sm:text-sm" />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Checkbox
                  checked={intermissionRefreshments}
                  onCheckedChange={(c) => setIntermissionRefreshments(!!c)}
                />
                <Label className="text-xs sm:text-sm cursor-pointer">{t.refreshmentsAvailable}</Label>
              </div>
            </div>
          )}
        </SectionCard>

        {/* 6. Cast & Crew */}
        <SectionCard title={t.step6} requiredLabel={t.optional}>
          <CastCrewEditor members={castMembers} onMembersChange={setCastMembers} language={language} />
        </SectionCard>

        {/* 7. Group Bookings */}
        <SectionCard title={t.step7} icon={<Users className="h-4 w-4 text-muted-foreground" />} requiredLabel={t.optional}>
          <div className="flex items-center gap-3">
            <Switch checked={groupBookingEnabled} onCheckedChange={setGroupBookingEnabled} />
            <Label className="text-xs sm:text-sm cursor-pointer">{t.groupBooking}</Label>
          </div>
          {groupBookingEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-2 p-3 bg-muted/30 rounded-lg border">
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">{t.groupMinSize}</Label>
                <NumberInput value={groupMinSize} onChange={setGroupMinSize} min={5} max={100} className="h-8 sm:h-9 text-xs sm:text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">{t.groupDiscount}</Label>
                <NumberInput value={groupDiscount} onChange={setGroupDiscount} min={1} max={50} className="h-8 sm:h-9 text-xs sm:text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">{t.groupEmail}</Label>
                <Input value={groupEmail} onChange={(e) => setGroupEmail(e.target.value)} type="email" className="h-8 sm:h-9 text-xs sm:text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">{t.groupPhone}</Label>
                <PhoneInput value={groupPhone} onChange={setGroupPhone} selectClassName="h-8 sm:h-9 text-xs sm:text-sm" inputClassName="h-8 sm:h-9 text-xs sm:text-sm" />
              </div>
            </div>
          )}
        </SectionCard>

        {/* 8. Show Instances */}
        <SectionCard title={t.step8} required requiredLabel={t.required}>
          <ShowInstanceEditor
            instances={showInstances}
            onInstancesChange={setShowInstances}
            durationMinutes={durationMinutes}
            language={language}
          />
        </SectionCard>

        {/* 9. Appearance */}
        <SectionCard title={t.step9} required requiredLabel={t.required}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">{t.appearanceStart}</Label>
              <DateTimePicker
                value={appearanceStart || undefined}
                onChange={(d) => setAppearanceStart(d || null)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">{t.appearanceEnd}</Label>
              <DateTimePicker
                value={appearanceEnd || undefined}
                onChange={(d) => setAppearanceEnd(d || null)}
                minDate={appearanceStart || undefined}
              />
            </div>
          </div>
        </SectionCard>

        {/* Submit */}
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full h-10 sm:h-12 text-sm sm:text-lg"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              {t.publishing}
            </>
          ) : (
            t.publish
          )}
        </Button>
      </CardContent>

      {/* Crop Dialog */}
      <ImageCropDialog
        open={cropDialogOpen}
        onClose={() => setCropDialogOpen(false)}
        imageSrc={tempImageSrc}
        onCropComplete={handleCropComplete}
      />

      {/* Boost Dialog */}
      {createdEventId && (
        <EventBoostDialog
          eventId={createdEventId}
          eventTitle={title}
          hasActiveSubscription={!!activeSubscription}
          remainingBudgetCents={activeSubscription?.monthly_budget_remaining_cents ?? 0}
          eventEndAt={appearanceEnd?.toISOString() || null}
          open={boostDialogOpen}
          onOpenChange={(open) => {
            setBoostDialogOpen(open);
            if (!open) navigate('/dashboard-business/events');
          }}
        />
      )}
    </Card>
  );
};

export default ProductionCreationForm;

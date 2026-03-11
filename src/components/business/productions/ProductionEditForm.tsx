import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { NumberInput } from "@/components/ui/number-input";
import { Switch } from "@/components/ui/switch";
import { Loader2, Theater, Clock, Coffee, Users, Baby } from "lucide-react";
import { ImageUploadField } from "../ImageUploadField";
import { ImageCropDialog } from "../ImageCropDialog";
import { compressImage } from "@/lib/imageCompression";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";
import { CastCrewEditor, CastMember } from "./CastCrewEditor";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
    editProduction: "Επεξεργασία Παράστασης",
    step1: "1. Τίτλος Παράστασης",
    step2: "2. Περιγραφή",
    step2b: "3. Ημερομηνίες & Χώρος",
    step3: "4. Εικόνα Κάλυψης",
    step4: "5. Λεπτομέρειες Παράστασης",
    step5: "6. Διάλειμμα",
    step6: "7. Ηθοποιοί & Συντελεστές",
    step7: "8. Ομαδικές Κρατήσεις",
    step9: "9. Εμφάνιση στο ΦΟΜΟ",
    required: "Υποχρεωτικό",
    optional: "Προαιρετικό",
    titlePlaceholder: "π.χ. Το Θαύμα, Romeo & Juliet...",
    descPlaceholder: "Περιγράψτε την παράσταση (υπόθεση, θέμα, ατμόσφαιρα)...",
    wordsRemaining: "λέξεις απομένουν",
    wordsOver: "λέξεις πάνω από το όριο",
    coverImage: "Εικόνα Κάλυψης",
    changeCover: "Αλλαγή εικόνας",
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
    save: "Αποθήκευση Αλλαγών",
    saving: "Αποθήκευση...",
    success: "Η παράσταση ενημερώθηκε επιτυχώς!",
    failed: "Αποτυχία ενημέρωσης",
    loading: "Φόρτωση...",
    startDate: "Ημερομηνία & Ώρα Έναρξης",
    endDate: "Ημερομηνία & Ώρα Λήξης",
    location: "Τοποθεσία / Διεύθυνση",
    venueName: "Όνομα Χώρου",
    locationPlaceholder: "π.χ. Λεωφ. Ανδρέα Παπανδρέου 12, Αθήνα",
    venuePlaceholder: "π.χ. Θέατρο Παλλάς",
  },
  en: {
    editProduction: "Edit Production",
    step1: "1. Production Title",
    step2: "2. Description",
    step2b: "3. Dates & Venue",
    step3: "4. Cover Image",
    step4: "5. Production Details",
    step5: "6. Intermission",
    step6: "7. Cast & Crew",
    step7: "8. Group Bookings",
    step9: "9. Appearance on ΦΟΜΟ",
    required: "Required",
    optional: "Optional",
    titlePlaceholder: "e.g. The Miracle, Romeo & Juliet...",
    descPlaceholder: "Describe the production (plot, theme, atmosphere)...",
    wordsRemaining: "words remaining",
    wordsOver: "words over limit",
    coverImage: "Cover Image",
    changeCover: "Change image",
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
    save: "Save Changes",
    saving: "Saving...",
    success: "Production updated successfully!",
    failed: "Failed to update production",
    loading: "Loading...",
    startDate: "Start Date & Time",
    endDate: "End Date & Time",
    location: "Location / Address",
    venueName: "Venue Name",
    locationPlaceholder: "e.g. 12 Main Street, Athens",
    venuePlaceholder: "e.g. National Theatre",
  },
};

const countWords = (text: string): number =>
  text.trim().split(/\s+/).filter((w) => w.length > 0).length;

// ============================================
// MAIN COMPONENT
// ============================================
interface ProductionEditFormProps {
  event: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const ProductionEditForm = ({ event, open, onOpenChange, onSuccess }: ProductionEditFormProps) => {
  const { language } = useLanguage();
  const t = translations[language];

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productionId, setProductionId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [minAgeHint, setMinAgeHint] = useState(0);

  // Dates & Location
  const [startAt, setStartAt] = useState<Date | null>(null);
  const [endAt, setEndAt] = useState<Date | null>(null);
  const [location, setLocation] = useState('');
  const [venueName, setVenueName] = useState('');

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

  // Appearance
  const [appearanceStart, setAppearanceStart] = useState<Date | null>(null);
  const [appearanceEnd, setAppearanceEnd] = useState<Date | null>(null);

  // Image
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState('');
  const [tempImageFile, setTempImageFile] = useState<File | null>(null);

  // Word count
  const descWordCount = countWords(description);
  const maxWords = 100;
  const wordsRemaining = maxWords - descWordCount;

  // Load data
  useEffect(() => {
    if (open && event) {
      loadData();
    }
  }, [open, event]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load event data
      setTitle(event.title || '');
      setDescription(event.description || '');
      setExistingCoverUrl(event.cover_image_url || null);
      setMinAgeHint(event.min_age_hint || 0);
      setStartAt(event.start_at ? new Date(event.start_at) : null);
      setEndAt(event.end_at ? new Date(event.end_at) : null);
      setLocation(event.location || '');
      setVenueName(event.venue_name || '');
      setAppearanceStart(event.appearance_start_at ? new Date(event.appearance_start_at) : null);
      setAppearanceEnd(event.appearance_end_at ? new Date(event.appearance_end_at) : null);

      // Find linked production via show_instances
      const { data: showInst } = await supabase
        .from('show_instances')
        .select('production_id')
        .eq('event_id', event.id)
        .limit(1)
        .maybeSingle();

      if (showInst?.production_id) {
        setProductionId(showInst.production_id);

        // Load production data
        const { data: prod } = await supabase
          .from('productions')
          .select('*')
          .eq('id', showInst.production_id)
          .single();

        if (prod) {
          setDurationMinutes(prod.duration_minutes || 120);
          setHasIntermission((prod.intermission_count || 0) > 0);
          setIntermissionCount(prod.intermission_count || 1);
          setIntermissionDuration(prod.intermission_duration_minutes || 15);
          setIntermissionRefreshments(prod.intermission_refreshments ?? true);
          setGroupBookingEnabled(prod.group_booking_enabled || false);
          setGroupMinSize(prod.group_min_size || 10);
          setGroupDiscount(prod.group_discount_percent || 15);
          setGroupEmail(prod.group_contact_email || '');
          setGroupPhone(prod.group_contact_phone || '');
        }

        // Load cast
        const { data: cast } = await supabase
          .from('production_cast')
          .select('*')
          .eq('production_id', showInst.production_id)
          .order('sort_order');

        if (cast && cast.length > 0) {
          setCastMembers(cast.map(c => ({
            person_name: c.person_name,
            role_type: c.role_type,
            role_name: c.role_name || '',
            bio: c.bio || '',
            sort_order: c.sort_order,
          })));
        } else {
          setCastMembers([]);
        }
      } else {
        // No production linked - use event data directly
        setProductionId(null);
        setDurationMinutes(120);
        setCastMembers([]);
      }
    } catch (err) {
      console.error('Error loading production data:', err);
    } finally {
      setIsLoading(false);
    }
  };

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

  // Submit
  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error(language === 'el' ? 'Συμπληρώστε τίτλο και περιγραφή' : 'Fill in title and description');
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload new cover if changed
      let coverImageUrl = existingCoverUrl;
      if (coverImage) {
        const compressed = await compressImage(coverImage, 1920, 1080, 0.85);
        const fileName = `${event.business_id}-prod-${Date.now()}.jpg`;
        const { error: uploadErr } = await supabase.storage.from('event-covers').upload(fileName, compressed, { contentType: 'image/jpeg' });
        if (uploadErr) throw uploadErr;
        const { data: { publicUrl } } = supabase.storage.from('event-covers').getPublicUrl(fileName);
        coverImageUrl = publicUrl;
      }

      // Update event record
      const { error: eventErr } = await supabase
        .from('events')
        .update({
          title: title.trim(),
          description: description.trim(),
          cover_image_url: coverImageUrl,
          min_age_hint: minAgeHint || null,
          start_at: startAt?.toISOString() || event.start_at,
          end_at: endAt?.toISOString() || event.end_at,
          location: location.trim() || event.location,
          venue_name: venueName.trim() || null,
          appearance_start_at: appearanceStart?.toISOString() || null,
          appearance_end_at: appearanceEnd?.toISOString() || null,
        })
        .eq('id', event.id);

      if (eventErr) throw eventErr;

      // Update production record
      if (productionId) {
        const { error: prodErr } = await supabase
          .from('productions')
          .update({
            title: title.trim(),
            description: description.trim(),
            cover_image_url: coverImageUrl,
            duration_minutes: durationMinutes,
            min_age_hint: minAgeHint || null,
            intermission_count: hasIntermission ? intermissionCount : 0,
            intermission_duration_minutes: hasIntermission ? intermissionDuration : null,
            intermission_refreshments: hasIntermission ? intermissionRefreshments : null,
            group_booking_enabled: groupBookingEnabled,
            group_min_size: groupBookingEnabled ? groupMinSize : null,
            group_discount_percent: groupBookingEnabled ? groupDiscount : null,
            group_contact_email: groupBookingEnabled ? groupEmail || null : null,
            group_contact_phone: groupBookingEnabled ? groupPhone || null : null,
          })
          .eq('id', productionId);

        if (prodErr) throw prodErr;

        // Update cast: delete all and re-insert
        await supabase.from('production_cast').delete().eq('production_id', productionId);
        
        const castToInsert = castMembers
          .filter(m => m.person_name.trim())
          .map((m, i) => ({
            production_id: productionId,
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

      toast.success(t.success);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error('Error updating production:', err);
      toast.error((err as any)?.message || t.failed);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-4 sm:p-6 pb-0 border-b pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl">
            <Theater className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            {t.editProduction}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
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
            <SectionCard title={t.step3} requiredLabel={t.optional}>
              {existingCoverUrl && !coverImage && (
                <div className="mb-3">
                  <img src={existingCoverUrl} alt="Cover" className="w-full max-h-48 object-cover rounded-lg" />
                </div>
              )}
              {coverImage && (
                <div className="mb-3">
                  <img src={URL.createObjectURL(coverImage)} alt="New cover" className="w-full max-h-48 object-cover rounded-lg" />
                </div>
              )}
              <ImageUploadField
                label={existingCoverUrl ? t.changeCover : t.coverImage}
                language={language}
                onFileSelect={handleFileSelect}
                aspectRatio="16/9"
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
                    <Input value={groupPhone} onChange={(e) => setGroupPhone(e.target.value)} type="tel" className="h-8 sm:h-9 text-xs sm:text-sm" />
                  </div>
                </div>
              )}
            </SectionCard>

            {/* 8. Appearance */}
            <SectionCard title={t.step9} requiredLabel={t.optional}>
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
                  {t.saving}
                </>
              ) : (
                t.save
              )}
            </Button>
          </div>
        )}

        {/* Crop Dialog */}
        <ImageCropDialog
          open={cropDialogOpen}
          onClose={() => setCropDialogOpen(false)}
          imageSrc={tempImageSrc}
          onCropComplete={handleCropComplete}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ProductionEditForm;

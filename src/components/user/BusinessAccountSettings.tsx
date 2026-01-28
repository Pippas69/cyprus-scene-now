import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
// Push notifications are always enabled - no separate toggle needed
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { usePasswordChange } from '@/hooks/usePasswordChange';
import { useLanguage } from '@/hooks/useLanguage';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { toast } from '@/hooks/use-toast';
import { Lock, Bell, Trash2, Settings as SettingsIcon, CheckCircle, XCircle, Loader2, BellRing, Mail, CalendarCheck, Ticket, Gift, BarChart3, Users, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ImageUploadField } from "@/components/business/ImageUploadField";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { MAPBOX_CONFIG } from "@/config/mapbox";
import { businessTranslations, cities } from "@/components/business/translations";
import { BusinessCategorySelector } from "@/components/business/BusinessCategorySelector";
import { validationTranslations } from "@/translations/validationTranslations";
import { toastTranslations } from "@/translations/toastTranslations";
import { compressImage } from "@/lib/imageCompression";
import { StripeConnectOnboarding } from "@/components/business/StripeConnectOnboarding";
import { StudentDiscountSettings } from "@/components/business/StudentDiscountSettings";

const createBusinessProfileSchema = (language: 'el' | 'en') => {
  const v = validationTranslations[language];
  
  return z.object({
    name: z.string().min(2, v.nameRequired),
    description: z.string().max(500, v.descriptionTooLong).optional(),
    phone: z.string().regex(/^[0-9\s\-\+\(\)]+$/, v.invalidPhone).optional().or(z.literal('')),
    website: z.string().url(v.invalidUrl).optional().or(z.literal('')),
    address: z.string().optional(),
    city: z.string().min(1, v.cityRequired),
    // In settings we allow 0..2 categories (no "select at least one" message)
    category: z.array(z.string()).max(2),
  });
};

type BusinessProfileFormValues = z.infer<ReturnType<typeof createBusinessProfileSchema>>;

interface BusinessAccountSettingsProps {
  userId: string;
  businessId: string;
  language: 'el' | 'en';
}

export const BusinessAccountSettings = ({ userId, businessId, language }: BusinessAccountSettingsProps) => {
  const navigate = useNavigate();
  const { setLanguage } = useLanguage();
  const { preferences, isLoading, updatePreferences, isUpdating } = useUserPreferences(userId);
  const { data: userProfile } = useUserProfile(userId);
  const { changePassword, isChanging } = usePasswordChange();
  const { resetOnboarding } = useOnboardingStatus(businessId);
  // Push notifications are always enabled for all notification types
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Business profile form state
  const [profileLoading, setProfileLoading] = useState(false);
  const [initialProfileLoading, setInitialProfileLoading] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const [currentCoverUrl, setCurrentCoverUrl] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{ lng: number; lat: number } | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  const businessProfileForm = useForm<BusinessProfileFormValues>({
    resolver: zodResolver(createBusinessProfileSchema(language)),
    defaultValues: {
      category: [],
    }
  });

  const selectedCategories = businessProfileForm.watch("category") || [];
  const address = businessProfileForm.watch("address");
  const city = businessProfileForm.watch("city");

  const text = {
    el: {
      accountSettings: 'Ρυθμίσεις Λογαριασμού',
      accountInfo: 'Πληροφορίες Λογαριασμού',
      email: 'Email',
      userId: 'ID Χρήστη',
      businessId: 'ID Επιχείρησης',
      verificationStatus: 'Κατάσταση Επαλήθευσης',
      verified: 'Επαληθευμένο',
      notVerified: 'Μη Επαληθευμένο',
      passwordManagement: 'Διαχείριση Κωδικού',
      currentPassword: 'Τρέχων Κωδικός',
      newPassword: 'Νέος Κωδικός',
      confirmPassword: 'Επιβεβαίωση Κωδικού',
      changePassword: 'Αλλαγή Κωδικού',
      businessNotifications: 'Ειδοποιήσεις Επιχείρησης',
      businessNotificationsDescription: 'Όλες οι ειδοποιήσεις είναι push notifications από το ΦΟΜΟ',
      
      // Must-have section
      mustHaveNotifications: 'Βασικές Ειδοποιήσεις',
      mustHaveDescription: 'Αυτές οι ειδοποιήσεις είναι πάντα ενεργές για να μην χάσετε σημαντικές ενημερώσεις',
      emailNotifications: 'Ειδοποιήσεις Email',
      emailNotificationsSubtext: 'Για νέες κρατήσεις, πωλήσεις εισιτηρίων και εξαργυρώσεις προσφοράς',
      fomoNotifications: 'Ειδοποιήσεις ΦΟΜΟ',
      fomoNotificationsSubtext: 'Για νέες κρατήσεις, πωλήσεις εισιτηρίων και εξαργυρώσεις προσφοράς',
      alwaysOn: 'Πάντα ενεργό',
      
      // Optional section
      optionalNotifications: 'Προαιρετικές Ειδοποιήσεις',
      optionalDescription: 'Επιλέξτε ποιες επιπλέον ειδοποιήσεις θέλετε να λαμβάνετε',
      
      // Grouped toggles
      creationAndBoost: 'Επιτυχής Δημιουργία & Boost',
      creationAndBoostDescription: 'Ειδοποίηση όταν δημιουργείται επιτυχώς εκδήλωση, προσφορά ή boost',
      inventoryAlerts: 'Σχεδόν Εξαντλήθηκε & Εξαντλήθηκε',
      inventoryAlertsDescription: 'Ειδοποίηση όταν απομένουν 2 θέσεις ή εξαντληθούν κρατήσεις/εισιτήρια/προσφορές',
      reservationStatus: 'Ακύρωση/No-show/Check-in',
      reservationStatusDescription: 'Ειδοποίηση όταν πελάτης ακυρώσει, δεν εμφανιστεί ή κάνει check-in',
      userEngagement: 'Υπόλοιπες ειδοποιήσεις',
      userEngagementDescription: 'Δημιουργία/boost, αλλαγή πλάνου, νέοι ακόλουθοι, RSVP',
      
      // Weekly summary
      weeklySummary: 'Εβδομαδιαία Σύνοψη',
      weeklySummaryDescription: 'Λάβετε email με σύνοψη της εβδομάδας: κρατήσεις, εισιτήρια, προσφορές, QR check-ins και καλύτερη μέρα',
      
      preferencesAndData: 'Προτιμήσεις & Δεδομένα',
      deleteAccount: 'Διαγραφή Λογαριασμού',
      deleteWarning: 'ΠΡΟΕΙΔΟΠΟΙΗΣΗ: Αυτό θα διαγράψει τον λογαριασμό σας και όλα τα δεδομένα της επιχείρησης. Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.',
      deleteConfirm: 'Διαγραφή Λογαριασμού',
      languagePreference: 'Γλώσσα',
      theme: 'Θέμα',
      light: 'Φωτεινό',
      dark: 'Σκοτεινό',
      system: 'Σύστημα',
      cancel: 'Ακύρωση',
    },
    en: {
      accountSettings: 'Account Settings',
      accountInfo: 'Account Information',
      email: 'Email',
      userId: 'User ID',
      businessId: 'Business ID',
      verificationStatus: 'Verification Status',
      verified: 'Verified',
      notVerified: 'Not Verified',
      passwordManagement: 'Password Management',
      currentPassword: 'Current Password',
      newPassword: 'New Password',
      confirmPassword: 'Confirm Password',
      changePassword: 'Change Password',
      businessNotifications: 'Business Notifications',
      businessNotificationsDescription: 'All notifications are push notifications from ΦΟΜΟ',
      
      // Must-have section
      mustHaveNotifications: 'Essential Notifications',
      mustHaveDescription: 'These notifications are always active so you never miss important updates',
      emailNotifications: 'Email Notifications',
      emailNotificationsSubtext: 'For new reservations, ticket sales and offer redemptions',
      fomoNotifications: 'ΦΟΜΟ Notifications',
      fomoNotificationsSubtext: 'For new reservations, ticket sales and offer redemptions',
      alwaysOn: 'Always on',
      
      // Optional section
      optionalNotifications: 'Optional Notifications',
      optionalDescription: 'Choose which additional notifications you want to receive',
      
      // Grouped toggles
      creationAndBoost: 'Creation & Boost Success',
      creationAndBoostDescription: 'Get notified when an event, offer or boost is created successfully',
      inventoryAlerts: 'Almost Sold Out & Sold Out',
      inventoryAlertsDescription: 'Get notified when only 2 spots remain or when fully sold out',
      reservationStatus: 'Cancellation / No-show / Check-in',
      reservationStatusDescription: 'Get notified when a customer cancels, no-shows or checks in',
      userEngagement: 'User Engagement',
      userEngagementDescription: 'Plan changes, new messages, new followers, RSVPs',
      
      // Weekly summary
      weeklySummary: 'Weekly Summary',
      weeklySummaryDescription: 'Receive weekly email with summary: reservations, tickets, offers, QR check-ins and best day',
      
      preferencesAndData: 'Preferences & Data',
      deleteAccount: 'Delete Account',
      deleteWarning: 'WARNING: This will delete your account and all business data. This action cannot be undone.',
      deleteConfirm: 'Delete Account',
      languagePreference: 'Language',
      theme: 'Theme',
      light: 'Light',
      dark: 'Dark',
      system: 'System',
      cancel: 'Cancel',
    },
  };

  const t = text[language];
  const businessT = businessTranslations[language];
  const toastT = toastTranslations[language];

  // Fetch business data on mount
  useEffect(() => {
    fetchBusinessData();
  }, [businessId]);

  // Auto-geocode when address or city changes
  useEffect(() => {
    const geocodeAddress = async () => {
      if (!address || !city) return;
      
      const fullAddress = `${address}, ${city}, Cyprus`;
      setGeocoding(true);
      
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?access_token=${MAPBOX_CONFIG.publicToken}&limit=1`
        );
        
        const data = await response.json();
        
        if (data.features && data.features.length > 0) {
          const [lng, lat] = data.features[0].center;
          setCoordinates({ lng, lat });
          toast({ title: toastT.coordinatesUpdated });
        }
      } catch (error) {
        // Silent fail - geocoding is auto-complete, not critical
      } finally {
        setGeocoding(false);
      }
    };

    const timeoutId = setTimeout(geocodeAddress, 1000);
    return () => clearTimeout(timeoutId);
  }, [address, city]);

  const fetchBusinessData = async () => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      if (error) throw error;

      if (data) {
        businessProfileForm.reset({
          name: data.name,
          description: data.description || '',
          phone: data.phone || '',
          website: data.website || '',
          address: data.address || '',
          city: data.city,
          category: data.category || [],
        });
        setCurrentLogoUrl(data.logo_url);
        setCurrentCoverUrl(data.cover_url);
      }
    } catch (error) {
      console.error('Error fetching business:', error);
      toast({ title: toastT.loadFailed, variant: "destructive" });
    } finally {
      setInitialProfileLoading(false);
    }
  };

  const handleLogoUpload = async (file: File): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const compressedFile = await compressImage(file, 800, 800, 0.9);
    const fileExt = compressedFile.name.split('.').pop();
    const fileName = `${user.id}/${user.id}-logo-${Date.now()}.${fileExt}`;

    if (currentLogoUrl) {
      const oldPath = currentLogoUrl.split('/').slice(-2).join('/');
      await supabase.storage.from('business-logos').remove([oldPath]);
    }

    const { error: uploadError } = await supabase.storage
      .from('business-logos')
      .upload(fileName, compressedFile);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('business-logos')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleCoverUpload = async (file: File): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const compressedFile = await compressImage(file, 1920, 1080, 0.9);
    const fileExt = compressedFile.name.split('.').pop();
    const fileName = `${user.id}/${user.id}-cover-${Date.now()}.${fileExt}`;

    if (currentCoverUrl) {
      const oldPath = currentCoverUrl.split('/').slice(-2).join('/');
      await supabase.storage.from('business-covers').remove([oldPath]);
    }

    const { error: uploadError } = await supabase.storage
      .from('business-covers')
      .upload(fileName, compressedFile);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('business-covers')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const onBusinessProfileSubmit = async (values: BusinessProfileFormValues) => {
    setProfileLoading(true);

    try {
      let logoUrl = currentLogoUrl;
      let coverUrl = currentCoverUrl;

      if (logoFile) {
        logoUrl = await handleLogoUpload(logoFile);
      }

      if (coverFile) {
        coverUrl = await handleCoverUpload(coverFile);
      }

      if (coordinates) {
        const { error } = await supabase.rpc('update_business_with_geo', {
          p_business_id: businessId,
          p_name: values.name,
          p_description: values.description || null,
          p_phone: values.phone || null,
          p_website: values.website || null,
          p_address: values.address || null,
          p_city: values.city,
          p_category: values.category,
          p_logo_url: logoUrl,
          p_cover_url: coverUrl,
          p_longitude: coordinates.lng,
          p_latitude: coordinates.lat
        });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('businesses')
          .update({
            name: values.name,
            description: values.description || null,
            phone: values.phone || null,
            website: values.website || null,
            address: values.address || null,
            city: values.city,
            category: values.category,
            logo_url: logoUrl,
            cover_url: coverUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', businessId);

        if (error) throw error;
      }

      toast({ title: toastT.businessUpdated });
      setCurrentLogoUrl(logoUrl);
      setCurrentCoverUrl(coverUrl);
      setLogoFile(null);
      setCoverFile(null);

    } catch (error) {
      console.error('Update error:', error);
      toast({ title: toastT.businessUpdateFailed, variant: "destructive" });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCategoryChange = (category: string, checked: boolean) => {
    const current = selectedCategories;
    if (checked) {
      businessProfileForm.setValue("category", [...current, category], {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    } else {
      businessProfileForm.setValue(
        "category",
        current.filter((c) => c !== category),
        {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        }
      );
    }
  };

  const handlePasswordChange = async () => {
    const success = await changePassword({
      currentPassword,
      newPassword,
      confirmPassword,
    });

    if (success) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleDownloadData = async () => {
    try {
      const { data: business } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      const { data: events } = await supabase
        .from('events')
        .select('*')
        .eq('business_id', businessId);

      const { data: reservations } = await supabase
        .from('reservations')
        .select('*, events(*)')
        .in('event_id', events?.map(e => e.id) || []);

      const { data: offers } = await supabase
        .from('discounts')
        .select('*')
        .eq('business_id', businessId);

      const exportData = {
        business,
        events,
        reservations,
        offers,
        preferences,
        exportedAt: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fomo-business-data-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Data exported',
        description: 'Your business data has been downloaded successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export data.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      
      if (error) throw error;

      toast({
        title: 'Account deleted',
        description: 'Your account and all business data have been permanently deleted.',
      });
      
      await supabase.auth.signOut();
      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading || initialProfileLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-4xl space-y-6">
      {/* Unified Business Profile Card */}
      <form onSubmit={businessProfileForm.handleSubmit(onBusinessProfileSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">{businessT.basicInfo}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Images - Always side-by-side on ALL devices */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
              <ImageUploadField
                label={businessT.businessLogo}
                currentImageUrl={currentLogoUrl}
                onFileSelect={setLogoFile}
                aspectRatio="1/1"
                maxSizeMB={2}
                language={language}
                enableCrop={true}
                cropAspectRatio="1:1"
              />
              <ImageUploadField
                label={businessT.businessCover}
                currentImageUrl={currentCoverUrl}
                onFileSelect={setCoverFile}
                aspectRatio="16/9"
                maxSizeMB={5}
                language={language}
                enableCrop={true}
                cropAspectRatio="16:9"
                showContextPreviews={true}
              />
            </div>

            {/* Name and City Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="business-name" className="text-xs sm:text-sm">{businessT.businessName} *</Label>
                <Input 
                  id="business-name" 
                  {...businessProfileForm.register("name")} 
                  placeholder={businessT.businessNamePlaceholder}
                  className="text-xs sm:text-sm h-9 sm:h-10"
                />
                {businessProfileForm.formState.errors.name && (
                  <p className="text-[10px] sm:text-sm text-destructive mt-1">{businessProfileForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="business-city" className="text-xs sm:text-sm">{businessT.city}</Label>
                <select
                  id="business-city"
                  {...businessProfileForm.register("city")}
                  className="flex h-9 sm:h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm"
                >
                  <option value="">{businessT.selectCity}</option>
                  {cities[language].map((cityOption) => (
                    <option key={cityOption} value={cityOption}>{cityOption}</option>
                  ))}
                </select>
                {businessProfileForm.formState.errors.city && (
                  <p className="text-[10px] sm:text-sm text-destructive mt-1">{businessProfileForm.formState.errors.city.message}</p>
                )}
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="business-address" className="text-xs sm:text-sm">{businessT.address}</Label>
              <Input 
                id="business-address" 
                {...businessProfileForm.register("address")} 
                placeholder={businessT.addressPlaceholder}
                className="text-xs sm:text-sm h-9 sm:h-10"
              />
              {geocoding && (
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {language === 'el' ? 'Ενημέρωση συντεταγμένων...' : 'Updating coordinates...'}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="business-description" className="text-xs sm:text-sm">{businessT.description}</Label>
              <Textarea 
                id="business-description" 
                {...businessProfileForm.register("description")} 
                placeholder={businessT.businessDescPlaceholder}
                rows={3}
                className="text-xs sm:text-sm"
              />
              {businessProfileForm.formState.errors.description && (
                <p className="text-[10px] sm:text-sm text-destructive mt-1">{businessProfileForm.formState.errors.description.message}</p>
              )}
            </div>

            {/* Categories - Hierarchical Selector */}
            <div>
              <Label className="text-xs sm:text-sm">{language === 'el' ? 'Κατηγορίες (επιλέξτε μέχρι 2)' : 'Categories (select up to 2)'}</Label>
              <div className="mt-2">
                <BusinessCategorySelector
                  selectedCategories={selectedCategories}
                  onCategoryChange={handleCategoryChange}
                  language={language}
                  compact
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <Label className="text-xs sm:text-sm">{t.email}</Label>
              <Input disabled value={userProfile?.email || ''} className="bg-muted/50 text-xs sm:text-sm h-8 sm:h-10" />
            </div>

            {/* User ID & Business ID Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs sm:text-sm text-muted-foreground">{t.userId}</Label>
                <p className="text-[10px] sm:text-sm font-mono text-muted-foreground mt-1 break-all">{userId}</p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm text-muted-foreground">{t.businessId}</Label>
                <p className="text-[10px] sm:text-sm font-mono text-muted-foreground mt-1 break-all">{businessId}</p>
              </div>
            </div>

            {/* Save Button */}
            <Button type="submit" className="w-full h-9 sm:h-10 text-xs sm:text-sm" disabled={profileLoading}>
              {profileLoading ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                  {businessT.loading}
                </>
              ) : (
                businessT.saveChanges
              )}
            </Button>
          </CardContent>
        </Card>
      </form>

      {/* Stripe Connect - Payments & Payouts */}
      <StripeConnectOnboarding businessId={businessId} language={language} />

      {/* Business Notifications - Grouped Toggles */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            {t.businessNotifications}
          </CardTitle>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t.businessNotificationsDescription}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* MUST-HAVE SECTION - Always ON */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
              <h4 className="font-semibold text-sm">{t.mustHaveNotifications}</h4>
            </div>
            <p className="text-xs text-muted-foreground pl-4">{t.mustHaveDescription}</p>
            
            {/* Email Notifications - Always ON */}
            <div className="flex items-center justify-between py-3 px-4 bg-muted/30 rounded-lg border border-border/50">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <Label className="font-medium text-sm">{t.emailNotifications}</Label>
                  <p className="text-xs text-muted-foreground hidden sm:block">{t.emailNotificationsSubtext}</p>
                </div>
              </div>
              <span className="text-[10px] md:text-xs font-medium text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 md:px-2 py-0.5 md:py-1 rounded whitespace-nowrap shrink-0 ml-2">
                {t.alwaysOn}
              </span>
            </div>

            {/* ΦΟΜΟ Notifications - Always ON */}
            <div className="flex items-center justify-between py-3 px-4 bg-muted/30 rounded-lg border border-border/50">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <BellRing className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <Label className="font-medium text-sm">{t.fomoNotifications}</Label>
                  <p className="text-xs text-muted-foreground hidden sm:block">{t.fomoNotificationsSubtext}</p>
                </div>
              </div>
              <span className="text-[10px] md:text-xs font-medium text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 md:px-2 py-0.5 md:py-1 rounded whitespace-nowrap shrink-0 ml-2">
                {t.alwaysOn}
              </span>
            </div>
          </div>

          <Separator />

          {/* OPTIONAL SECTION - Grouped Toggleable */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-semibold text-sm">{t.optionalNotifications}</h4>
            </div>
            <p className="text-xs text-muted-foreground pl-6">{t.optionalDescription}</p>
            
             {/* Cancellation / No-show / Check-in (FIRST) */}
             <div className="flex items-start justify-between py-3 border-b border-border gap-2">
               <div className="flex items-start gap-2 flex-1 min-w-0">
                 <CalendarCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                 <div className="min-w-0">
                   <Label htmlFor="reservation-status" className="font-medium text-[11px] sm:text-sm whitespace-nowrap">{t.reservationStatus}</Label>
                   <p className="text-[10px] sm:text-xs text-muted-foreground">{t.reservationStatusDescription}</p>
                 </div>
               </div>
               <Switch
                 id="reservation-status"
                 checked={preferences.notification_reservation_cancelled ?? true}
                 onCheckedChange={(checked) =>
                   updatePreferences({ notification_reservation_cancelled: checked })
                 }
                 className="data-[state=checked]:bg-primary scale-90 sm:scale-100 shrink-0"
               />
             </div>

             {/* Almost Sold Out & Sold Out (SECOND) */}
            <div className="flex items-start justify-between py-3 border-b border-border gap-2">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <Ticket className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <Label htmlFor="inventory-alerts" className="font-medium text-[11px] sm:text-sm whitespace-nowrap">{t.inventoryAlerts}</Label>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{t.inventoryAlertsDescription}</p>
                </div>
              </div>
              <Switch
                id="inventory-alerts"
                checked={(preferences.notification_almost_sold_out ?? true) && (preferences.notification_sold_out ?? true)}
                onCheckedChange={(checked) =>
                  updatePreferences({ 
                    notification_almost_sold_out: checked,
                    notification_sold_out: checked 
                  })
                }
                className="data-[state=checked]:bg-primary scale-90 sm:scale-100 shrink-0"
              />
            </div>

             {/* Weekly Summary (THIRD) */}
             <div className="flex items-start justify-between py-3 border-b border-border gap-2">
               <div className="flex items-start gap-2 flex-1 min-w-0">
                 <BarChart3 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                 <div className="min-w-0">
                   <Label htmlFor="weekly-summary" className="font-medium text-sm">{t.weeklySummary}</Label>
                   <p className="text-xs text-muted-foreground">
                     {language === 'el'
                       ? 'Λάβετε email με σύνοψη της εβδομάδας: κρατήσεις, εισιτήρια, προσφορές, QR check-ins και καλύτερη μέρα επισκέψεων'
                       : t.weeklySummaryDescription}
                   </p>
                 </div>
               </div>
               <Switch
                 id="weekly-summary"
                 checked={preferences.notification_weekly_summary ?? true}
                 onCheckedChange={(checked) =>
                   updatePreferences({ notification_weekly_summary: checked })
                 }
                 className="data-[state=checked]:bg-primary scale-90 sm:scale-100 shrink-0"
               />
             </div>

             {/* All other notifications (LAST) */}
            <div className="flex items-start justify-between py-3 border-b border-border gap-2">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <Users className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                   <Label htmlFor="user-engagement" className="font-medium text-[11px] sm:text-sm whitespace-nowrap">
                     {t.userEngagement}
                   </Label>
                   <p className="text-[10px] sm:text-xs text-muted-foreground">
                     {t.userEngagementDescription}
                   </p>
                </div>
              </div>
              <Switch
                id="user-engagement"
                checked={
                  (preferences.notification_plan_change ?? true) && 
                   (preferences.notification_new_follower ?? true) &&
                   (preferences.notification_creation_success ?? true) &&
                   (preferences.notification_boost_success ?? true) &&
                   (preferences.notification_rsvp_updates ?? true)
                }
                onCheckedChange={(checked) =>
                  updatePreferences({ 
                    notification_plan_change: checked,
                     notification_new_follower: checked,
                     notification_creation_success: checked,
                     notification_boost_success: checked,
                     notification_rsvp_updates: checked
                  })
                }
                className="data-[state=checked]:bg-primary scale-90 sm:scale-100 shrink-0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student Discount Settings */}
      <StudentDiscountSettings businessId={businessId} />

      {/* Password Management */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
            <Lock className="h-4 w-4 sm:h-5 sm:w-5" />
            {t.passwordManagement}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="current-password" className="text-xs sm:text-sm">{t.currentPassword}</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="text-xs sm:text-sm h-9 sm:h-10"
            />
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="new-password" className="text-xs sm:text-sm">{t.newPassword}</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="text-xs sm:text-sm h-9 sm:h-10"
            />
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="confirm-password" className="text-xs sm:text-sm">{t.confirmPassword}</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="text-xs sm:text-sm h-9 sm:h-10"
            />
          </div>
          <Button 
            onClick={handlePasswordChange}
            disabled={isChanging || !currentPassword || !newPassword || !confirmPassword}
            className="text-xs sm:text-sm h-9 sm:h-10"
          >
            {t.changePassword}
          </Button>
        </CardContent>
      </Card>

      {/* Preferences & Data - Combined Section */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
            <SettingsIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            {t.preferencesAndData}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-5 p-4 sm:p-6 pt-0 sm:pt-0">
          {/* Language */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="language" className="text-xs sm:text-sm">{t.languagePreference}</Label>
            <Select
              value={language}
              onValueChange={(value: 'el' | 'en') => setLanguage(value)}
            >
              <SelectTrigger id="language" className="text-xs sm:text-sm h-9 sm:h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="el">Ελληνικά</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Theme */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="theme" className="text-xs sm:text-sm">{t.theme}</Label>
            <Select
              value={preferences.theme_preference || 'system'}
              onValueChange={(value) => updatePreferences({ theme_preference: value })}
            >
              <SelectTrigger id="theme" className="text-xs sm:text-sm h-9 sm:h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t.light}</SelectItem>
                <SelectItem value="dark">{t.dark}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Delete Account */}
          <div className="pt-3 sm:pt-4 border-t border-border/50 space-y-2 sm:space-y-3">
            <p className="text-[10px] sm:text-sm text-muted-foreground">{t.deleteWarning}</p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full text-xs sm:text-sm h-9 sm:h-10">
                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  {t.deleteAccount}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t.deleteAccount}</AlertDialogTitle>
                  <AlertDialogDescription>{t.deleteWarning}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccount} disabled={isDeleting}>
                    {t.deleteConfirm}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

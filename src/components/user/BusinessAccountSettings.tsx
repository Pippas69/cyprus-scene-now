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
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { usePasswordChange } from '@/hooks/usePasswordChange';
import { useLanguage } from '@/hooks/useLanguage';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { toast } from '@/hooks/use-toast';
import { Lock, Bell, Shield, Download, Trash2, Settings as SettingsIcon, CheckCircle, XCircle, Loader2, RotateCcw, BellRing, Mail, CalendarCheck, Ticket, Gift, BarChart3, Users, Sparkles } from 'lucide-react';
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
    category: z.array(z.string()).min(1, v.categoryRequired),
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
  const { isSupported: pushSupported, isSubscribed: pushSubscribed, isLoading: pushLoading, subscribe: subscribePush, unsubscribe: unsubscribePush, permissionState } = usePushNotifications(userId);
  
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
      businessNotificationsDescription: 'Επιλέξτε ποια ενημερωτικά emails και ειδοποιήσεις θέλετε να λαμβάνετε για την επιχείρησή σας',
      emailNotifications: 'Λαμβάνω ειδοποιήσεις email',
      emailNotificationsDescription: 'Λάβετε ενημερώσεις σχετικά με την επιχείρησή σας μέσω email',
      newReservations: 'Νέες Κρατήσεις',
      newReservationsDescription: 'Λάβετε ειδοποιήσεις για νέες κρατήσεις από events, προσφορές ή το προφίλ σας',
      ticketSaleNotifications: 'Πωλήσεις Εισιτηρίων',
      ticketSaleDescription: 'Λάβετε email όταν πωλιούνται εισιτήρια',
      offerRedemption: 'Εξαργύρωση Προσφοράς',
      offerRedemptionDescription: 'Λάβετε ειδοποίηση όταν εξαργυρώνεται μια προσφορά',
      dailySalesSummary: 'Ημερήσια Σύνοψη Πωλήσεων',
      dailySalesSummaryDescription: 'Λάβετε καθημερινή αναφορά πωλήσεων στις 9:00',
      eventCapacity: 'Πλήρης Χωρητικότητα',
      eventCapacityDescription: 'Ειδοποίηση όταν μια εκδήλωση φτάσει πλήρη χωρητικότητα',
      pushNotifications: 'Push Ειδοποιήσεις',
      pushNotificationsDescription: 'Ενεργοποιήστε τις ειδοποιήσεις στις ρυθμίσεις του browser',
      pushNotSupported: 'Ο browser σας δεν υποστηρίζει push ειδοποιήσεις',
      pushPermissionDenied: 'Ενεργοποιήστε τις ειδοποιήσεις στις ρυθμίσεις του browser',
      enablePush: 'Ενεργοποίηση',
      newRSVPs: 'Νέα RSVP',
      verificationUpdates: 'Ενημερώσεις Επαλήθευσης',
      privacy: 'Απόρρητο & Δεδομένα',
      downloadData: 'Λήψη Δεδομένων Επιχείρησης',
      downloadBusinessData: 'Λήψη Δεδομένων',
      deleteAccount: 'Διαγραφή Λογαριασμού',
      deleteWarning: 'ΠΡΟΕΙΔΟΠΟΙΗΣΗ: Αυτό θα διαγράψει τον λογαριασμό σας και όλα τα δεδομένα της επιχείρησης (εκδηλώσεις, κρατήσεις, προσφορές). Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.',
      deleteConfirm: 'Διαγραφή Λογαριασμού',
      appPreferences: 'Προτιμήσεις Εφαρμογής',
      languagePreference: 'Γλώσσα',
      theme: 'Θέμα',
      light: 'Φωτεινό',
      dark: 'Σκοτεινό',
      system: 'Σύστημα',
      cancel: 'Ακύρωση',
      restartTour: 'Επανεκκίνηση Περιήγησης',
      restartTourDescription: 'Δείτε ξανά τον οδηγό εισαγωγής',
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
      businessNotificationsDescription: 'Choose which emails and notifications you want to receive for your business',
      emailNotifications: 'Receive Email Notifications',
      emailNotificationsDescription: 'Get updates about your business via email',
      newReservations: 'New Reservations',
      newReservationsDescription: 'Get notified for new reservations from events, offers, or your profile',
      ticketSaleNotifications: 'Ticket Sales',
      ticketSaleDescription: 'Receive emails when tickets are sold',
      offerRedemption: 'Offer Redemption',
      offerRedemptionDescription: 'Get notified when an offer is redeemed',
      dailySalesSummary: 'Daily Sales Summary',
      dailySalesSummaryDescription: 'Receive daily sales report at 9:00 AM',
      eventCapacity: 'Full Capacity',
      eventCapacityDescription: 'Get notified when an event reaches full capacity',
      pushNotifications: 'Push Notifications',
      pushNotificationsDescription: 'Enable notifications in your browser settings',
      pushNotSupported: 'Your browser does not support push notifications',
      pushPermissionDenied: 'Enable notifications in your browser settings',
      enablePush: 'Enable',
      newRSVPs: 'New RSVPs',
      verificationUpdates: 'Verification Updates',
      privacy: 'Privacy & Data',
      downloadData: 'Download Business Data',
      downloadBusinessData: 'Download Data',
      deleteAccount: 'Delete Account',
      deleteWarning: 'WARNING: This will delete your account and all business data (events, reservations, offers). This action cannot be undone.',
      deleteConfirm: 'Delete Account',
      appPreferences: 'App Preferences',
      languagePreference: 'Language',
      theme: 'Theme',
      light: 'Light',
      dark: 'Dark',
      system: 'System',
      cancel: 'Cancel',
      restartTour: 'Restart Onboarding Tour',
      restartTourDescription: 'View the introduction guide again',
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
      businessProfileForm.setValue("category", [...current, category]);
    } else {
      businessProfileForm.setValue("category", current.filter(c => c !== category));
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
            <CardTitle>{businessT.basicInfo}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Images Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ImageUploadField
                label={businessT.businessLogo}
                currentImageUrl={currentLogoUrl}
                onFileSelect={setLogoFile}
                aspectRatio="1/1"
                maxSizeMB={2}
                language={language}
              />
              <ImageUploadField
                label={businessT.businessCover}
                currentImageUrl={currentCoverUrl}
                onFileSelect={setCoverFile}
                aspectRatio="16/9"
                maxSizeMB={5}
                language={language}
              />
            </div>

            {/* Name and City Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="business-name">{businessT.businessName} *</Label>
                <Input 
                  id="business-name" 
                  {...businessProfileForm.register("name")} 
                  placeholder={businessT.businessNamePlaceholder} 
                />
                {businessProfileForm.formState.errors.name && (
                  <p className="text-sm text-destructive mt-1">{businessProfileForm.formState.errors.name.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="business-city">{businessT.city}</Label>
                <select
                  id="business-city"
                  {...businessProfileForm.register("city")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">{businessT.selectCity}</option>
                  {cities[language].map((cityOption) => (
                    <option key={cityOption} value={cityOption}>{cityOption}</option>
                  ))}
                </select>
                {businessProfileForm.formState.errors.city && (
                  <p className="text-sm text-destructive mt-1">{businessProfileForm.formState.errors.city.message}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="business-description">{businessT.description}</Label>
              <Textarea 
                id="business-description" 
                {...businessProfileForm.register("description")} 
                placeholder={businessT.businessDescPlaceholder}
                rows={3}
              />
              {businessProfileForm.formState.errors.description && (
                <p className="text-sm text-destructive mt-1">{businessProfileForm.formState.errors.description.message}</p>
              )}
            </div>

            {/* Categories - Hierarchical Selector */}
            <div>
              <Label>{businessT.categories} * ({businessT.selectAtLeastOne})</Label>
              <div className="mt-2">
                <BusinessCategorySelector
                  selectedCategories={selectedCategories}
                  onCategoryChange={handleCategoryChange}
                  language={language}
                />
              </div>
              {businessProfileForm.formState.errors.category && (
                <p className="text-sm text-destructive mt-1">{businessProfileForm.formState.errors.category.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <Label>{t.email}</Label>
              <Input disabled value={userProfile?.email || ''} className="bg-muted/50" />
            </div>

            {/* User ID & Business ID Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">{t.userId}</Label>
                <p className="text-sm font-mono text-muted-foreground mt-1">{userId}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{t.businessId}</Label>
                <p className="text-sm font-mono text-muted-foreground mt-1">{businessId}</p>
              </div>
            </div>

            {/* Save Button */}
            <Button type="submit" className="w-full" disabled={profileLoading}>
              {profileLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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

      {/* Business Notifications - Above Student Discounts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">
            {t.businessNotifications}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t.businessNotificationsDescription}
          </p>
        </CardHeader>
        <CardContent className="space-y-0">
          {/* Email Notifications Toggle */}
          <div className="flex items-center justify-between py-4 border-b border-border">
            <div>
              <Label htmlFor="email-notifications" className="font-medium">{t.emailNotifications}</Label>
              <p className="text-xs text-muted-foreground">{t.emailNotificationsDescription}</p>
            </div>
            <Switch
              id="email-notifications"
              checked={preferences.email_notifications_enabled}
              onCheckedChange={(checked) =>
                updatePreferences({ email_notifications_enabled: checked })
              }
              className="data-[state=checked]:bg-ocean"
            />
          </div>

          {/* New Reservations */}
          <div className="flex items-center justify-between py-4 border-b border-border">
            <div>
              <Label htmlFor="new-reservations" className="font-medium">{t.newReservations}</Label>
              <p className="text-xs text-muted-foreground">{t.newReservationsDescription}</p>
            </div>
            <Switch
              id="new-reservations"
              checked={preferences.notification_reservations}
              onCheckedChange={(checked) =>
                updatePreferences({ notification_reservations: checked })
              }
              className="data-[state=checked]:bg-ocean"
            />
          </div>

          {/* Ticket Sales */}
          <div className="flex items-center justify-between py-4 border-b border-border">
            <div>
              <Label htmlFor="ticket-sales" className="font-medium">{t.ticketSaleNotifications}</Label>
              <p className="text-xs text-muted-foreground">{t.ticketSaleDescription}</p>
            </div>
            <Switch
              id="ticket-sales"
              checked={preferences.notification_ticket_sales ?? true}
              onCheckedChange={(checked) =>
                updatePreferences({ notification_ticket_sales: checked })
              }
              className="data-[state=checked]:bg-ocean"
            />
          </div>

          {/* Offer Redemption */}
          <div className="flex items-center justify-between py-4 border-b border-border">
            <div>
              <Label htmlFor="offer-redemption" className="font-medium">{t.offerRedemption}</Label>
              <p className="text-xs text-muted-foreground">{t.offerRedemptionDescription}</p>
            </div>
            <Switch
              id="offer-redemption"
              checked={preferences.notification_offer_redemption ?? true}
              onCheckedChange={(checked) =>
                updatePreferences({ notification_offer_redemption: checked })
              }
              className="data-[state=checked]:bg-ocean"
            />
          </div>

          {/* Daily Sales Summary */}
          <div className="flex items-center justify-between py-4 border-b border-border">
            <div>
              <Label htmlFor="daily-summary" className="font-medium">{t.dailySalesSummary}</Label>
            </div>
            <Switch
              id="daily-summary"
              checked={preferences.notification_daily_sales_summary ?? true}
              onCheckedChange={(checked) =>
                updatePreferences({ notification_daily_sales_summary: checked })
              }
              className="data-[state=checked]:bg-ocean"
            />
          </div>

          {/* Full Capacity */}
          <div className="flex items-center justify-between py-4 border-b border-border">
            <div>
              <Label htmlFor="event-capacity" className="font-medium">{t.eventCapacity}</Label>
            </div>
            <Switch
              id="event-capacity"
              checked={preferences.notification_business_updates}
              onCheckedChange={(checked) =>
                updatePreferences({ notification_business_updates: checked })
              }
              className="data-[state=checked]:bg-ocean"
            />
          </div>

          {/* Push Notifications */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="push-notifications" className="font-medium">{t.pushNotifications}</Label>
                <p className="text-xs text-muted-foreground">
                  {!pushSupported 
                    ? t.pushNotSupported 
                    : permissionState === 'denied' 
                      ? t.pushPermissionDenied 
                      : t.pushNotificationsDescription}
                </p>
              </div>
            </div>
            {pushSubscribed ? (
              <Switch
                id="push-notifications"
                disabled={pushLoading}
                checked={pushSubscribed}
                onCheckedChange={async () => {
                  await unsubscribePush();
                }}
                className="data-[state=checked]:bg-ocean"
              />
            ) : (
              <Button
                variant="default"
                size="sm"
                disabled={pushLoading}
                onClick={async () => {
                  console.log('[Settings] Push Enable clicked, calling subscribePush...');
                  await subscribePush();
                }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {pushLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t.enablePush}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Student Discount Settings */}
      <StudentDiscountSettings businessId={businessId} />

      {/* Password Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {t.passwordManagement}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">{t.currentPassword}</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">{t.newPassword}</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">{t.confirmPassword}</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button 
            onClick={handlePasswordChange}
            disabled={isChanging || !currentPassword || !newPassword || !confirmPassword}
          >
            {t.changePassword}
          </Button>
        </CardContent>
      </Card>

      {/* Privacy & Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t.privacy}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t.downloadData}</Label>
            <Button onClick={handleDownloadData} variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              {t.downloadBusinessData}
            </Button>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label className="text-destructive">{t.deleteAccount}</Label>
            <p className="text-sm text-muted-foreground">{t.deleteWarning}</p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" />
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

      {/* App Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>{t.appPreferences}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t.restartTour}</Label>
            <p className="text-sm text-muted-foreground">{t.restartTourDescription}</p>
            <Button 
              variant="outline" 
              onClick={async () => {
                await resetOnboarding();
                navigate('/dashboard-business');
                window.location.reload();
              }}
              className="w-full"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {t.restartTour}
            </Button>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="language">{t.languagePreference}</Label>
            <Select
              value={language}
              onValueChange={(value: 'el' | 'en') => setLanguage(value)}
            >
              <SelectTrigger id="language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="el">Ελληνικά</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="theme">{t.theme}</Label>
            <Select
              value={preferences.theme_preference || 'system'}
              onValueChange={(value) => updatePreferences({ theme_preference: value })}
            >
              <SelectTrigger id="theme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t.light}</SelectItem>
                <SelectItem value="dark">{t.dark}</SelectItem>
                <SelectItem value="system">{t.system}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

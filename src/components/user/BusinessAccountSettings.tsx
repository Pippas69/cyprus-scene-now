import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ThreeStepDeleteDialog } from '@/components/user/ThreeStepDeleteDialog';
import { Separator } from '@/components/ui/separator';
// Push notifications are always enabled - no separate toggle needed
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { usePasswordChange } from '@/hooks/usePasswordChange';
import { useLanguage } from '@/hooks/useLanguage';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { toast } from '@/hooks/use-toast';
import { Lock, Bell, Trash2, Settings as SettingsIcon, CheckCircle, XCircle, Loader2, BellRing, Mail, CalendarCheck, Ticket, Gift, BarChart3, Users, Sparkles, Shield, ChevronRight, ArrowLeft, Building2, CreditCard, Receipt, GraduationCap } from 'lucide-react';
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
import { normalizeBusinessCategories } from "@/lib/categoryFilterMapping";
import { validationTranslations } from "@/translations/validationTranslations";
import { toastTranslations } from "@/translations/toastTranslations";
import { compressImage } from "@/lib/imageCompression";
import { StripeConnectOnboarding } from "@/components/business/StripeConnectOnboarding";
import { StudentDiscountSettings } from "@/components/business/StudentDiscountSettings";
import BillingSmsPage from "@/pages/BillingSmsPage";

const createBusinessProfileSchema = (language: 'el' | 'en') => {
  const v = validationTranslations[language];

  return z.object({
    name: z.string().min(2, v.nameRequired),
    description: z.string().max(500, v.descriptionTooLong).optional(),
    phone: z.string().regex(/^[0-9\s\-\+\(\)]+$/, v.invalidPhone)
      .refine((val) => val.replace(/\D/g, '').length >= 8, { message: v.invalidPhone })
      .refine((val) => val.replace(/\D/g, '').length <= 15, { message: v.invalidPhone })
      .optional().or(z.literal('')),
    // Allow users to type a plain domain (e.g. "example.com") by auto-prefixing https://
    website: z.preprocess(
      (val) => {
        if (typeof val !== 'string') return val;
        const trimmed = val.trim();
        if (!trimmed) return '';
        if (/^https?:\/\//i.test(trimmed)) return trimmed;
        return `https://${trimmed}`;
      },
      z.string().url(v.invalidUrl).optional().or(z.literal(''))
    ),
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
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [is2FALoading, setIs2FALoading] = useState(false);
  const [promotersEnabled, setPromotersEnabled] = useState(false);
  const [promotersLoading, setPromotersLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('profile');

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
    },
    mode: 'onChange', // Validate on change for better UX
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

  // Fetch business data and 2FA status on mount
  useEffect(() => {
    fetchBusinessData();
    fetch2FAStatus();
  }, [businessId]);

  const fetch2FAStatus = async () => {
    const { data } = await supabase
      .from('user_2fa_settings')
      .select('is_enabled')
      .eq('user_id', userId)
      .maybeSingle();
    setIs2FAEnabled(data?.is_enabled ?? false);
  };

  const toggle2FA = async (enabled: boolean) => {
    setIs2FALoading(true);
    try {
      if (enabled) {
        const { error } = await supabase
          .from('user_2fa_settings')
          .upsert({ user_id: userId, is_enabled: true }, { onConflict: 'user_id' });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_2fa_settings')
          .update({ is_enabled: false })
          .eq('user_id', userId);
        if (error) throw error;
      }
      setIs2FAEnabled(enabled);
      toast({
        title: toastT.success,
        description: language === 'el'
          ? (enabled ? 'Η επαλήθευση 2FA ενεργοποιήθηκε' : 'Η επαλήθευση 2FA απενεργοποιήθηκε')
          : (enabled ? '2FA verification enabled' : '2FA verification disabled'),
      });
    } catch {
      toast({
        title: toastT.error,
        description: language === 'el' ? 'Σφάλμα ενημέρωσης 2FA' : 'Error updating 2FA',
        variant: 'destructive',
      });
    } finally {
      setIs2FALoading(false);
    }
  };

  const togglePromoters = async (enabled: boolean) => {
    // Optimistic update — instant UI feedback
    const prev = promotersEnabled;
    setPromotersEnabled(enabled);
    setPromotersLoading(true);
    // Notify the dashboard layout immediately so the sidebar updates without refetch
    window.dispatchEvent(
      new CustomEvent('fomo:promoters-enabled-changed', { detail: { enabled } })
    );
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ promoters_enabled: enabled } as any)
        .eq('id', businessId);
      if (error) throw error;
      toast({
        title: toastT.success,
        description: language === 'el'
          ? (enabled ? 'Η ενότητα Promoters ενεργοποιήθηκε' : 'Η ενότητα Promoters απενεργοποιήθηκε')
          : (enabled ? 'Promoters section enabled' : 'Promoters section disabled'),
      });
    } catch {
      // Roll back on failure
      setPromotersEnabled(prev);
      window.dispatchEvent(
        new CustomEvent('fomo:promoters-enabled-changed', { detail: { enabled: prev } })
      );
      toast({
        title: toastT.error,
        description: language === 'el' ? 'Σφάλμα ενημέρωσης ρύθμισης' : 'Error updating setting',
        variant: 'destructive',
      });
    } finally {
      setPromotersLoading(false);
    }
  };

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
          category: normalizeBusinessCategories(data.category || []),
        });
        setCurrentLogoUrl(data.logo_url);
        setCurrentCoverUrl(data.cover_url);
        setPromotersEnabled(!!(data as any).promoters_enabled);
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
      .upload(fileName, compressedFile, { contentType: 'image/jpeg' });

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
      .upload(fileName, compressedFile, { contentType: 'image/jpeg' });

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
      const { data, error: fnError } = await supabase.functions.invoke('delete-user-account');

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

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

  const navItems = [
    {
      id: 'profile',
      icon: Building2,
      title: language === 'el' ? 'Προφίλ Επιχείρησης' : 'Business Profile',
      desc: language === 'el' ? 'Λογότυπο, όνομα, τοποθεσία' : 'Logo, name, location',
    },
    {
      id: 'payments',
      icon: CreditCard,
      title: language === 'el' ? 'Πληρωμές & Αποδόσεις' : 'Payments & Payouts',
      desc: language === 'el' ? 'Σύνδεση Stripe' : 'Stripe Connect',
    },
    {
      id: 'notifications',
      icon: Bell,
      title: t.businessNotifications,
      desc: language === 'el' ? 'Βασικές & προαιρετικές ειδοποιήσεις' : 'Essential & optional notifications',
    },
    {
      id: 'student-discounts',
      icon: GraduationCap,
      title: language === 'el' ? 'Φοιτητικές Εκπτώσεις' : 'Student Discounts',
      desc: language === 'el' ? 'Ρυθμίσεις εκπτώσεων φοιτητών' : 'Student discount settings',
    },
    {
      id: 'promoters',
      icon: Users,
      title: language === 'el' ? 'Ενότητα Promoters' : 'Promoters Section',
      desc: language === 'el' ? 'Ενεργοποίηση ενότητας promoters' : 'Enable promoters section',
    },
    {
      id: 'billing',
      icon: Receipt,
      title: language === 'el' ? 'Χρέωση & SMS' : 'Billing & SMS',
      desc: language === 'el' ? 'Πλάνο & κατανάλωση SMS' : 'Plan & SMS usage',
    },
    {
      id: 'password',
      icon: Lock,
      title: t.passwordManagement,
      desc: language === 'el' ? 'Αλλαγή κωδικού πρόσβασης' : 'Change your password',
    },
    {
      id: '2fa',
      icon: Shield,
      title: language === 'el' ? 'Επαλήθευση 2 Βημάτων (2FA)' : 'Two-Factor Auth (2FA)',
      desc: language === 'el' ? 'Κωδικός email κατά τη σύνδεση' : 'Email code at login',
    },
    {
      id: 'privacy',
      icon: Trash2,
      title: t.preferencesAndData,
      desc: language === 'el' ? 'Διαγραφή λογαριασμού' : 'Delete account',
    },
  ];

  return (
    <div className="lg:flex lg:gap-6">

      {/* Nav menu */}
      <div className={`lg:w-[248px] lg:flex-shrink-0 ${activeSection ? 'hidden lg:block' : 'block'}`}>
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden divide-y divide-white/[0.04]">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex items-center gap-3 w-full px-4 py-3.5 text-left transition-colors hover:bg-white/[0.04] ${activeSection === item.id ? 'bg-white/[0.06]' : ''}`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${activeSection === item.id ? 'bg-[#4ECDC4]/10' : 'bg-white/[0.04]'}`}>
                <item.icon className={`h-4 w-4 ${activeSection === item.id ? 'text-[#4ECDC4]' : 'text-white/40'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-inter font-medium text-sm text-white">{item.title}</p>
                <p className="font-inter text-xs text-white/40 mt-0.5">{item.desc}</p>
              </div>
              <ChevronRight className={`h-4 w-4 flex-shrink-0 ${activeSection === item.id ? 'text-white/30' : 'text-white/15'}`} />
            </button>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      <div className={`flex-1 min-w-0 ${!activeSection ? 'hidden lg:flex lg:items-center lg:justify-center' : 'block'}`}>
        {activeSection ? (
          <div className="space-y-6">
            <button
              onClick={() => setActiveSection(null)}
              className="lg:hidden flex items-center gap-1.5 text-white/50 hover:text-white text-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {language === 'el' ? 'Πίσω' : 'Back'}
            </button>

            {activeSection === 'profile' && (
              <form onSubmit={businessProfileForm.handleSubmit(onBusinessProfileSubmit)}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">{businessT.basicInfo}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
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

                    <div>
                      <Label className="text-xs sm:text-sm">{t.email}</Label>
                      <Input disabled value={userProfile?.email || ''} className="bg-muted/50 text-xs sm:text-sm h-8 sm:h-10 mt-1.5" />
                    </div>

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

                    {Object.keys(businessProfileForm.formState.errors).length > 0 && (
                      <div className="text-destructive text-xs space-y-1 p-3 bg-destructive/10 rounded-md">
                        {businessProfileForm.formState.errors.name && <p>• {businessProfileForm.formState.errors.name.message}</p>}
                        {businessProfileForm.formState.errors.city && <p>• {businessProfileForm.formState.errors.city.message}</p>}
                        {businessProfileForm.formState.errors.description && <p>• {businessProfileForm.formState.errors.description.message}</p>}
                        {businessProfileForm.formState.errors.phone && <p>• {businessProfileForm.formState.errors.phone.message}</p>}
                        {businessProfileForm.formState.errors.website && <p>• {businessProfileForm.formState.errors.website.message}</p>}
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-9 sm:h-10 text-xs sm:text-sm relative z-10 pointer-events-auto"
                      disabled={profileLoading}
                    >
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
            )}

            {activeSection === 'payments' && (
              <StripeConnectOnboarding businessId={businessId} language={language} />
            )}

            {activeSection === 'notifications' && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    {t.businessNotifications}
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground">{t.businessNotificationsDescription}</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                      <h4 className="font-semibold text-sm">{t.mustHaveNotifications}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground pl-4">{t.mustHaveDescription}</p>
                    <div className="flex items-center justify-between py-3 px-4 bg-muted/30 rounded-lg border border-border/50">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Mail className="h-4 w-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <Label className="font-medium text-sm">{t.emailNotifications}</Label>
                          <p className="text-xs text-muted-foreground hidden sm:block">{t.emailNotificationsSubtext}</p>
                        </div>
                      </div>
                      <span className="text-[10px] md:text-xs font-medium text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 md:px-2 py-0.5 md:py-1 rounded whitespace-nowrap shrink-0 ml-2">{t.alwaysOn}</span>
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 bg-muted/30 rounded-lg border border-border/50">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <BellRing className="h-4 w-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <Label className="font-medium text-[13px] sm:text-sm whitespace-nowrap">{t.fomoNotifications}</Label>
                          <p className="text-xs text-muted-foreground hidden sm:block">{t.fomoNotificationsSubtext}</p>
                        </div>
                      </div>
                      <span className="text-[10px] md:text-xs font-medium text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 md:px-2 py-0.5 md:py-1 rounded whitespace-nowrap shrink-0 ml-2">{t.alwaysOn}</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <SettingsIcon className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-semibold text-sm">{t.optionalNotifications}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground pl-6">{t.optionalDescription}</p>

                    <div className="flex items-start justify-between py-3 border-b border-border gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <CalendarCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <Label htmlFor="reservation-status" className="font-medium text-[11px] sm:text-sm whitespace-nowrap">{t.reservationStatus}</Label>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">{t.reservationStatusDescription}</p>
                        </div>
                      </div>
                      <Switch id="reservation-status" checked={preferences.notification_reservation_cancelled ?? true} onCheckedChange={(checked) => updatePreferences({ notification_reservation_cancelled: checked })} className="data-[state=checked]:bg-primary scale-90 sm:scale-100 shrink-0" />
                    </div>

                    <div className="flex items-start justify-between py-3 border-b border-border gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <Ticket className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <Label htmlFor="inventory-alerts" className="font-medium text-[11px] sm:text-sm whitespace-nowrap">{t.inventoryAlerts}</Label>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">{t.inventoryAlertsDescription}</p>
                        </div>
                      </div>
                      <Switch id="inventory-alerts" checked={(preferences.notification_almost_sold_out ?? true) && (preferences.notification_sold_out ?? true)} onCheckedChange={(checked) => updatePreferences({ notification_almost_sold_out: checked, notification_sold_out: checked })} className="data-[state=checked]:bg-primary scale-90 sm:scale-100 shrink-0" />
                    </div>

                    <div className="flex items-start justify-between py-3 border-b border-border gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <BarChart3 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <Label htmlFor="weekly-summary" className="font-medium text-[11px] sm:text-sm">{t.weeklySummary}</Label>
                          <p className="text-[9px] sm:text-xs text-muted-foreground">
                            {language === 'el' ? 'Λάβετε email με σύνοψη της εβδομάδας: κρατήσεις, εισιτήρια, προσφορές, QR check-ins και καλύτερη μέρα επισκέψεων' : t.weeklySummaryDescription}
                          </p>
                        </div>
                      </div>
                      <Switch id="weekly-summary" checked={preferences.notification_weekly_summary ?? true} onCheckedChange={(checked) => updatePreferences({ notification_weekly_summary: checked })} className="data-[state=checked]:bg-primary scale-90 sm:scale-100 shrink-0" />
                    </div>

                    <div className="flex items-start justify-between py-3 border-b border-border gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <Users className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <Label htmlFor="user-engagement" className="font-medium text-[11px] sm:text-sm whitespace-nowrap">{t.userEngagement}</Label>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">{t.userEngagementDescription}</p>
                        </div>
                      </div>
                      <Switch id="user-engagement" checked={(preferences.notification_plan_change ?? true) && (preferences.notification_new_follower ?? true) && (preferences.notification_creation_success ?? true) && (preferences.notification_boost_success ?? true) && (preferences.notification_rsvp_updates ?? true)} onCheckedChange={(checked) => updatePreferences({ notification_plan_change: checked, notification_new_follower: checked, notification_creation_success: checked, notification_boost_success: checked, notification_rsvp_updates: checked })} className="data-[state=checked]:bg-primary scale-90 sm:scale-100 shrink-0" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === 'student-discounts' && (
              !selectedCategories.some(c => ['clubs', 'events', 'theatre', 'music', 'dance', 'kids'].includes(c.toLowerCase()))
                ? <StudentDiscountSettings businessId={businessId} />
                : (
                  <Card>
                    <CardContent className="py-8 text-center text-sm text-muted-foreground">
                      {language === 'el'
                        ? 'Οι φοιτητικές εκπτώσεις δεν είναι διαθέσιμες για αυτή την κατηγορία επιχείρησης.'
                        : 'Student discounts are not available for this business category.'}
                    </CardContent>
                  </Card>
                )
            )}

            {activeSection === 'promoters' && (
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                    {language === 'el' ? 'Ενότητα Promoters' : 'Promoters Section'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {language === 'el'
                        ? 'Ενεργοποίησε για να εμφανίζεται η ενότητα Promoters στο sidebar του dashboard σου.'
                        : 'Enable to show the Promoters section in your dashboard sidebar.'}
                    </p>
                    <Switch checked={promotersEnabled} onCheckedChange={togglePromoters} disabled={promotersLoading} className="shrink-0" />
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === 'billing' && businessId && (
              <BillingSmsPage businessId={businessId} compact />
            )}

            {activeSection === 'password' && (
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
                    <PasswordInput id="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="text-xs sm:text-sm h-9 sm:h-10" />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="new-password" className="text-xs sm:text-sm">{t.newPassword}</Label>
                    <PasswordInput id="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="text-xs sm:text-sm h-9 sm:h-10" />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="confirm-password" className="text-xs sm:text-sm">{t.confirmPassword}</Label>
                    <PasswordInput id="confirm-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="text-xs sm:text-sm h-9 sm:h-10" />
                  </div>
                  <Button
                    onClick={handlePasswordChange}
                    disabled={isChanging || !currentPassword || !newPassword || !confirmPassword || newPassword.length < 8 || confirmPassword.length < 8}
                    className="text-xs sm:text-sm h-9 sm:h-10"
                  >
                    {t.changePassword}
                  </Button>
                </CardContent>
              </Card>
            )}

            {activeSection === '2fa' && (
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
                    <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
                    {language === 'el' ? 'Επαλήθευση σε 2 Βήματα (2FA)' : 'Two-Factor Authentication (2FA)'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {language === 'el' ? 'Λάβετε έναν 6ψήφιο κωδικό στο email σας κατά τη σύνδεση' : 'Receive a 6-digit code to your email when logging in'}
                    </p>
                    <Switch checked={is2FAEnabled} onCheckedChange={toggle2FA} disabled={is2FALoading} />
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === 'privacy' && (
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
                    <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    {t.preferencesAndData}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-5 p-4 sm:p-6 pt-0 sm:pt-0">
                  <div className="pt-3 sm:pt-4 border-t border-border/50 space-y-2 sm:space-y-3">
                    <p className="text-[10px] sm:text-sm text-muted-foreground">{t.deleteWarning}</p>
                    <ThreeStepDeleteDialog
                      onConfirmDelete={handleDeleteAccount}
                      isDeleting={isDeleting}
                      isBusiness={true}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="hidden lg:flex items-center justify-center h-48 rounded-2xl border border-white/[0.06] text-white/20 text-sm">
            {language === 'el' ? 'Επιλέξτε κατηγορία ρυθμίσεων' : 'Select a settings category'}
          </div>
        )}
      </div>
    </div>
  );
};

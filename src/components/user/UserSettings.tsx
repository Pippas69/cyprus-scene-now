import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { usePasswordChange } from '@/hooks/usePasswordChange';
import { useLanguage } from '@/hooks/useLanguage';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from '@/hooks/use-toast';
import { toastTranslations } from '@/translations/toastTranslations';
import { Lock, Bell, Shield, Download, Trash2, User, Heart, MapPin, Save, Sparkles, Clock, CheckCircle, Mail, Settings as SettingsIcon, GraduationCap, Smartphone, Send } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getCategoriesForUser } from '@/lib/unifiedCategories';
import { getCityOptions, translateCity } from '@/lib/cityTranslations';
import { InterestSelectorList } from '@/components/categories/InterestSelectorList';
import { StudentVerificationSection } from '@/components/user/StudentVerificationSection';

interface UserSettingsProps {
  userId: string;
  language: 'el' | 'en';
}

export const UserSettings = ({ userId, language }: UserSettingsProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setLanguage } = useLanguage();
  const { preferences, isLoading: prefsLoading, updatePreferences, isUpdating } = useUserPreferences(userId);
  const { changePassword, isChanging } = usePasswordChange();
  const { isSupported: pushSupported, isSubscribed: pushSubscribed, isLoading: pushLoading, permissionState, subscribe: subscribePush, unsubscribe: unsubscribePush } = usePushNotifications(userId);
  const [isSendingTest, setIsSendingTest] = useState(false);
  
  // Profile state
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  const tt = toastTranslations[language];
  const categories = getCategoriesForUser(language);

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  // Scroll to hash target (e.g., #student-verification)
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      // Wait for the component to render
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [location.hash, profile]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) setProfile(data);
  };

  const text = {
    el: {
      settingsTitle: 'Ρυθμίσεις',
      profileSection: 'Στοιχεία Προφίλ',
      firstName: 'Όνομα',
      lastName: 'Επίθετο',
      age: 'Ηλικία',
      email: 'Email',
      town: 'Πόλη',
      townPlaceholder: 'Επιλέξτε πόλη',
      gender: 'Φύλο',
      genderPlaceholder: 'Επιλέξτε φύλο',
      male: 'Άνδρας',
      female: 'Γυναίκα',
      other: 'Άλλο',
      interests: 'Ενδιαφέροντα',
      interestsDescription: 'Επιλέξτε τι σας αρέσει για καλύτερες προτάσεις',
      saveProfile: 'Αποθήκευση Προφίλ',
      passwordManagement: 'Διαχείριση Κωδικού',
      currentPassword: 'Τρέχων Κωδικός',
      newPassword: 'Νέος Κωδικός',
      confirmPassword: 'Επιβεβαίωση Κωδικού',
      changePassword: 'Αλλαγή Κωδικού',
      notifications: 'Ειδοποιήσεις',
      // Mandatory section
      emailConfirmationsTitle: 'Email για Επιβεβαιώσεις',
      emailConfirmationsMandatory: '(Υποχρεωτικό)',
      emailConfirmationsDesc: 'Για κρατήσεις, εισιτήρια & εξαργυρώσεις',
      mandatoryNotificationsTitle: 'Απαραίτητες Ειδοποιήσεις',
      mandatoryNotificationsDesc: 'Επιβεβαιώσεις κρατήσεων, εισιτηρίων & προσφορών',
      // Suggestions section
      suggestionsForYou: 'Προτάσεις για Σένα',
      suggestionsForYouDesc: 'Επιλεγμένες Εκδηλώσεις και Προσφορές που ταιριάζουν στα ενδιαφέροντά σου',
      // Reminders section
      reminders: 'Υπενθυμίσεις',
      eventReminders: 'Υπενθυμίσεις Εκδηλώσεων',
      eventRemindersDesc: '1 μέρα & 2 ώρες πριν (κρατήσεις, εισιτήρια, RSVP)',
      reservationReminders: 'Υπενθυμίσεις Κρατήσεων',
      reservationRemindersDesc: '2 ώρες πριν την ώρα της κράτησής σου',
      expiringOffers: 'Υπενθυμίσεις Προσφορών',
      expiringOffersDesc: '2 ώρες πριν λήξουν οι προσφορές που εξαργύρωσες',
      pushNotifications: 'Push Ειδοποιήσεις',
      pushNotificationsDesc: 'Άμεσες ειδοποιήσεις στη συσκευή σας',
      pushDenied: 'Οι ειδοποιήσεις είναι απενεργοποιημένες στον browser',
      testPush: 'Δοκιμή',
      sendingTest: 'Αποστολή...',
      privacy: 'Απόρρητο & Δεδομένα',
      profileVisibility: 'Ορατότητα Προφίλ',
      public: 'Δημόσιο',
      private: 'Ιδιωτικό',
      downloadData: 'Λήψη Δεδομένων',
      downloadMyData: 'Λήψη των Δεδομένων μου',
      deleteAccount: 'Διαγραφή Λογαριασμού',
      deleteWarning: 'Αυτή η ενέργεια δεν μπορεί να αναιρεθεί. Όλα τα δεδομένα σας θα διαγραφούν μόνιμα.',
      deleteConfirm: 'Διαγραφή Λογαριασμού',
      appPreferences: 'Προτιμήσεις Εφαρμογής',
      languagePreference: 'Γλώσσα',
      theme: 'Θέμα',
      light: 'Φωτεινό',
      dark: 'Σκοτεινό',
      system: 'Σύστημα',
      cancel: 'Ακύρωση',
    },
    en: {
      settingsTitle: 'Settings',
      profileSection: 'Profile Details',
      firstName: 'First Name',
      lastName: 'Last Name',
      age: 'Age',
      email: 'Email',
      town: 'Town',
      townPlaceholder: 'Select town',
      gender: 'Gender',
      genderPlaceholder: 'Select gender',
      male: 'Male',
      female: 'Female',
      other: 'Other',
      interests: 'Interests',
      interestsDescription: 'Select what you like for better recommendations',
      saveProfile: 'Save Profile',
      passwordManagement: 'Password Management',
      currentPassword: 'Current Password',
      newPassword: 'New Password',
      confirmPassword: 'Confirm Password',
      changePassword: 'Change Password',
      notifications: 'Notifications',
      // Mandatory section
      emailConfirmationsTitle: 'Email for Confirmations',
      emailConfirmationsMandatory: '(Mandatory)',
      emailConfirmationsDesc: 'For reservations, tickets & redemptions',
      mandatoryNotificationsTitle: 'Essential Notifications',
      mandatoryNotificationsDesc: 'Reservation, ticket & offer confirmations',
      // Suggestions section
      suggestionsForYou: 'Suggestions for You',
      suggestionsForYouDesc: 'Selected Events and Offers that match your interests',
      // Reminders section
      reminders: 'Reminders',
      eventReminders: 'Event Reminders',
      eventRemindersDesc: '1 day & 2 hours before (reservations, tickets, RSVP)',
      reservationReminders: 'Reservation Reminders',
      reservationRemindersDesc: '2 hours before your reservation time',
      expiringOffers: 'Offer Reminders',
      expiringOffersDesc: '2 hours before your redeemed offers expire',
      pushNotifications: 'Push Notifications',
      pushNotificationsDesc: 'Instant notifications on your device',
      pushDenied: 'Notifications are disabled in browser settings',
      testPush: 'Test',
      sendingTest: 'Sending...',
      privacy: 'Privacy & Data',
      profileVisibility: 'Profile Visibility',
      public: 'Public',
      private: 'Private',
      downloadData: 'Download Data',
      downloadMyData: 'Download My Data',
      deleteAccount: 'Delete Account',
      deleteWarning: 'This action cannot be undone. All your data will be permanently deleted.',
      deleteConfirm: 'Delete Account',
      appPreferences: 'App Preferences',
      languagePreference: 'Language',
      theme: 'Theme',
      light: 'Light',
      dark: 'Dark',
      system: 'System',
      cancel: 'Cancel',
    },
  };

  const t = text[language];

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: profile.first_name,
        last_name: profile.last_name,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
        age: profile.age,
        town: profile.town,
        gender: profile.gender,
        preferences: profile.preferences || [],
      })
      .eq('id', userId);

    if (error) {
      toast({
        title: tt.error,
        description: tt.profileUpdateFailed,
        variant: "destructive",
      });
    } else {
      toast({
        title: tt.success,
        description: tt.profileUpdated,
      });
    }

    setProfileLoading(false);
  };

  const togglePreference = (categoryId: string) => {
    const currentPreferences = profile?.preferences || [];
    const newPreferences = currentPreferences.includes(categoryId)
      ? currentPreferences.filter((id: string) => id !== categoryId)
      : [...currentPreferences, categoryId];
    setProfile({ ...profile, preferences: newPreferences });
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
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const { data: rsvps } = await supabase
        .from('rsvps')
        .select('*, events(*)')
        .eq('user_id', userId);

      const { data: reservations } = await supabase
        .from('reservations')
        .select('*, events(*)')
        .eq('user_id', userId);

      const { data: favorites } = await supabase
        .from('favorites')
        .select('*, events(*)')
        .eq('user_id', userId);

      const exportData = {
        profile: profileData,
        preferences,
        rsvps,
        reservations,
        favorites,
        exportedAt: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fomo-user-data-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: tt.success,
        description: language === 'el' ? 'Τα δεδομένα σας λήφθηκαν επιτυχώς' : 'Your data has been downloaded successfully',
      });
    } catch (error) {
      toast({
        title: tt.error,
        description: tt.loadFailed,
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
        title: tt.deleted,
        description: language === 'el' ? 'Ο λογαριασμός σας διαγράφηκε οριστικά' : 'Your account has been permanently deleted',
      });
      
      await supabase.auth.signOut();
      navigate('/');
    } catch (error: any) {
      toast({
        title: tt.error,
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (prefsLoading || !preferences || !profile) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Profile Details - Matching Signup Form */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <User className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            {t.profileSection}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="firstName" className="text-xs sm:text-sm">{t.firstName}</Label>
                <Input
                  id="firstName"
                  value={profile.first_name || ''}
                  onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                  className="rounded-xl text-xs sm:text-sm h-8 sm:h-10"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="lastName" className="text-xs sm:text-sm">{t.lastName}</Label>
                <Input
                  id="lastName"
                  value={profile.last_name || ''}
                  onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                  className="rounded-xl text-xs sm:text-sm h-8 sm:h-10"
                />
              </div>
            </div>

            {/* Age, City, Gender in one row - uniform spacing */}
            <div className="flex gap-3 sm:gap-4">
              <div className="flex-1 space-y-1.5 sm:space-y-2">
                <Label htmlFor="age" className="text-xs sm:text-sm">{t.age}</Label>
                <NumberInput
                  value={profile.age || 18}
                  onChange={(value) => setProfile({ ...profile, age: value })}
                  min={13}
                  max={120}
                  className="rounded-xl text-xs sm:text-sm h-8 sm:h-10 w-full"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="town" className="flex items-center gap-1 text-xs sm:text-sm">
                  <MapPin className="h-3 w-3 text-primary" />
                  {t.town}
                </Label>
                <Select
                  value={profile.town || ''}
                  onValueChange={(value) => setProfile({ ...profile, town: value })}
                >
                  <SelectTrigger id="town" className="rounded-xl text-xs sm:text-sm h-8 sm:h-10">
                    <SelectValue placeholder={t.townPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {getCityOptions(language).map(city => (
                      <SelectItem key={city.value} value={city.value} className="text-xs sm:text-sm">{city.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="gender" className="text-xs sm:text-sm">{t.gender}</Label>
                <Select
                  value={profile.gender || ''}
                  onValueChange={(value) => setProfile({ ...profile, gender: value })}
                >
                  <SelectTrigger id="gender" className="rounded-xl text-xs sm:text-sm h-8 sm:h-10">
                    <SelectValue placeholder={t.genderPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male" className="text-xs sm:text-sm">{t.male}</SelectItem>
                    <SelectItem value="female" className="text-xs sm:text-sm">{t.female}</SelectItem>
                    <SelectItem value="other" className="text-xs sm:text-sm">{t.other}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Email below */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="email" className="text-xs sm:text-sm">{t.email}</Label>
              <Input
                id="email"
                value={profile.email || ''}
                disabled
                className="rounded-xl bg-muted text-xs sm:text-sm h-8 sm:h-10"
              />
            </div>

            {/* Interests - list rows (match Signup mock) */}
            <div className="space-y-2 sm:space-y-3 pt-3 sm:pt-4 border-t">
              <div>
                <Label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                  <Heart className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                  {t.interests}
                </Label>
                <p className="text-[10px] sm:text-sm text-muted-foreground mt-1">{t.interestsDescription}</p>
              </div>

              <InterestSelectorList
                categories={categories}
                selectedIds={profile.preferences || []}
                onToggle={togglePreference}
              />
            </div>

            {/* Student Verification Section */}
            <div className="pt-3 sm:pt-4 border-t">
              <StudentVerificationSection 
                userId={userId} 
                userName={profile.first_name || profile.name || ''}
              />
            </div>

            <Button type="submit" disabled={profileLoading} className="mt-3 sm:mt-4 gap-1.5 sm:gap-2 text-xs sm:text-sm h-9 sm:h-10">
              <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t.saveProfile}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Notifications - MOVED ABOVE PASSWORD */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Bell className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            {t.notifications}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          {/* Mandatory: Email Confirmations - Always ON */}
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5 min-w-0 flex-1">
              <Label className="text-xs sm:text-sm">{t.emailConfirmationsTitle}</Label>
              <p className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">{t.emailConfirmationsDesc}</p>
            </div>
            <Switch
              checked={true}
              disabled
              className="data-[state=checked]:bg-primary cursor-default scale-90 sm:scale-100 flex-shrink-0"
            />
          </div>
          
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5 min-w-0 flex-1">
              <Label className="text-xs sm:text-sm">{t.mandatoryNotificationsTitle}</Label>
              <p className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">{t.mandatoryNotificationsDesc}</p>
            </div>
            <Switch
              checked={true}
              disabled
              className="data-[state=checked]:bg-primary cursor-default scale-90 sm:scale-100 flex-shrink-0"
            />
          </div>

          {/* Push Notifications */}
          {pushSupported && (
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5 flex-1 min-w-0">
                <Label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                  <Smartphone className="h-3 w-3 sm:h-4 sm:w-4" />
                  {t.pushNotifications}
                </Label>
                <p className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">{t.pushNotificationsDesc}</p>
                {permissionState === 'denied' && (
                  <p className="text-[10px] sm:text-xs text-destructive">{t.pushDenied}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                {pushSubscribed && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3"
                    onClick={async () => {
                      setIsSendingTest(true);
                      try {
                        const { data, error } = await supabase.functions.invoke('test-push-notification');
                        if (error) throw error;
                        toast({
                          title: language === 'el' ? 'Ειδοποίηση εστάλη!' : 'Notification sent!',
                          description: language === 'el' ? 'Ελέγξτε τη συσκευή σας' : 'Check your device',
                        });
                      } catch (err) {
                        toast({
                          title: language === 'el' ? 'Αποτυχία' : 'Failed',
                          description: err instanceof Error ? err.message : 'Unknown error',
                          variant: 'destructive',
                        });
                      } finally {
                        setIsSendingTest(false);
                      }
                    }}
                    disabled={isSendingTest}
                  >
                    <Send className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                    {isSendingTest ? t.sendingTest : t.testPush}
                  </Button>
                )}
                <Switch
                  checked={pushSubscribed}
                  disabled={pushLoading || permissionState === 'denied'}
                  onCheckedChange={(checked) => checked ? subscribePush() : unsubscribePush()}
                  className="scale-90 sm:scale-100"
                />
              </div>
            </div>
          )}

          <Separator />

          {/* Suggestions for You - Optional toggle */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-xs sm:text-sm font-semibold text-muted-foreground flex items-center gap-1.5 sm:gap-2">
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
              {t.suggestionsForYou}
            </h4>
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5 min-w-0 flex-1">
                <Label htmlFor="suggestions-toggle" className="text-xs sm:text-sm">{t.suggestionsForYou}</Label>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{t.suggestionsForYouDesc}</p>
              </div>
              <Switch
                id="suggestions-toggle"
                checked={preferences.notification_boosted_content ?? true}
                onCheckedChange={(checked) =>
                  updatePreferences({ notification_boosted_content: checked })
                }
                className="scale-90 sm:scale-100 flex-shrink-0"
              />
            </div>
          </div>

          <Separator />

          {/* Reminders */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-xs sm:text-sm font-semibold text-muted-foreground flex items-center gap-1.5 sm:gap-2">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
              {t.reminders}
            </h4>
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5 min-w-0 flex-1">
                <Label htmlFor="event-reminders" className="text-xs sm:text-sm">{t.eventReminders}</Label>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{t.eventRemindersDesc}</p>
              </div>
              <Switch
                id="event-reminders"
                checked={preferences.notification_event_reminders}
                onCheckedChange={(checked) =>
                  updatePreferences({ notification_event_reminders: checked })
                }
                className="scale-90 sm:scale-100 flex-shrink-0"
              />
            </div>
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5 min-w-0 flex-1">
                <Label htmlFor="reservation-reminders" className="text-xs sm:text-sm">{t.reservationReminders}</Label>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{t.reservationRemindersDesc}</p>
              </div>
              <Switch
                id="reservation-reminders"
                checked={preferences.notification_reservations}
                onCheckedChange={(checked) =>
                  updatePreferences({ notification_reservations: checked })
                }
                className="scale-90 sm:scale-100 flex-shrink-0"
              />
            </div>
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5 min-w-0 flex-1">
                <Label htmlFor="expiring-offers" className="text-xs sm:text-sm">{t.expiringOffers}</Label>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{t.expiringOffersDesc}</p>
              </div>
              <Switch
                id="expiring-offers"
                checked={preferences.notification_expiring_offers ?? true}
                onCheckedChange={(checked) =>
                  updatePreferences({ notification_expiring_offers: checked })
                }
                className="scale-90 sm:scale-100 flex-shrink-0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Management - MOVED BELOW NOTIFICATIONS */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Lock className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            {t.passwordManagement}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="current-password" className="text-xs sm:text-sm">{t.currentPassword}</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="rounded-xl text-sm"
            />
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="new-password" className="text-xs sm:text-sm">{t.newPassword}</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="rounded-xl text-sm"
            />
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="confirm-password" className="text-xs sm:text-sm">{t.confirmPassword}</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="rounded-xl text-sm"
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

      {/* Privacy & Data */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Shield className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            {t.privacy}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="profile-visibility" className="text-xs sm:text-sm">{t.profileVisibility}</Label>
            <Select
              value={preferences.profile_visibility || 'public'}
              onValueChange={(value) => updatePreferences({ profile_visibility: value })}
            >
              <SelectTrigger id="profile-visibility" className="rounded-xl text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">{t.public}</SelectItem>
                <SelectItem value="private">{t.private}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="space-y-1.5 sm:space-y-2">
            <Label className="text-destructive text-xs sm:text-sm">{t.deleteAccount}</Label>
            <p className="text-[10px] sm:text-sm text-muted-foreground">{t.deleteWarning}</p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full text-xs sm:text-sm h-9 sm:h-10">
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
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
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 whitespace-nowrap text-sm sm:text-base">
            <SettingsIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            {t.appPreferences}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="language" className="text-xs sm:text-sm">{t.languagePreference}</Label>
            <Select
              value={language}
              onValueChange={(value: 'el' | 'en') => setLanguage(value)}
            >
              <SelectTrigger id="language" className="rounded-xl text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="el">Ελληνικά</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="theme" className="text-xs sm:text-sm">{t.theme}</Label>
            <Select
              value={preferences.theme_preference || 'system'}
              onValueChange={(value) => updatePreferences({ theme_preference: value })}
            >
              <SelectTrigger id="theme" className="rounded-xl text-xs sm:text-sm">
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

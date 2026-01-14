import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { usePasswordChange } from '@/hooks/usePasswordChange';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from '@/hooks/use-toast';
import { toastTranslations } from '@/translations/toastTranslations';
import { Lock, Bell, Shield, Download, Trash2, User, Heart, MapPin, Settings as SettingsIcon, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getMainCategories } from '@/lib/unifiedCategories';

interface UserSettingsProps {
  userId: string;
  language: 'el' | 'en';
}

const towns = ["Λευκωσία", "Λεμεσός", "Λάρνακα", "Πάφος", "Παραλίμνι", "Αγία Νάπα"];

export const UserSettings = ({ userId, language }: UserSettingsProps) => {
  const navigate = useNavigate();
  const { setLanguage } = useLanguage();
  const { preferences, isLoading: prefsLoading, updatePreferences, isUpdating } = useUserPreferences(userId);
  const { changePassword, isChanging } = usePasswordChange();
  
  // Profile state
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  const tt = toastTranslations[language];
  const categories = getMainCategories(language);

  useEffect(() => {
    fetchProfile();
  }, [userId]);

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
      emailNotifications: 'Ειδοποιήσεις Email',
      eventReminders: 'Υπενθυμίσεις Εκδηλώσεων',
      reservationConfirmations: 'Επιβεβαιώσεις Κρατήσεων',
      rsvpUpdates: 'Ενημερώσεις RSVP',
      newEvents: 'Νέες Εκδηλώσεις',
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
      emailNotifications: 'Email Notifications',
      eventReminders: 'Event Reminders',
      reservationConfirmations: 'Reservation Confirmations',
      rsvpUpdates: 'RSVP Updates',
      newEvents: 'New Events',
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t.profileSection}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">{t.firstName}</Label>
                <Input
                  id="firstName"
                  value={profile.first_name || ''}
                  onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">{t.lastName}</Label>
                <Input
                  id="lastName"
                  value={profile.last_name || ''}
                  onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">{t.age}</Label>
              <Input
                id="age"
                type="number"
                value={profile.age || ''}
                onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) || null })}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t.email}</Label>
              <Input
                id="email"
                value={profile.email || ''}
                disabled
                className="rounded-xl bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="town" className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                {t.town}
              </Label>
              <Select
                value={profile.town || ''}
                onValueChange={(value) => setProfile({ ...profile, town: value })}
              >
                <SelectTrigger id="town" className="rounded-xl">
                  <SelectValue placeholder={t.townPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {towns.map(town => (
                    <SelectItem key={town} value={town}>{town}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">{t.gender}</Label>
              <Select
                value={profile.gender || ''}
                onValueChange={(value) => setProfile({ ...profile, gender: value })}
              >
                <SelectTrigger id="gender" className="rounded-xl">
                  <SelectValue placeholder={t.genderPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t.male}</SelectItem>
                  <SelectItem value="female">{t.female}</SelectItem>
                  <SelectItem value="other">{t.other}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category Preferences */}
            <div className="space-y-3 pt-4 border-t">
              <div>
                <Label className="flex items-center gap-2 text-base">
                  <Heart className="h-4 w-4 text-primary" />
                  {t.interests}
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {t.interestsDescription}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`pref-${category.id}`}
                      checked={(profile.preferences || []).includes(category.id)}
                      onCheckedChange={() => togglePreference(category.id)}
                      className="rounded"
                    />
                    <label
                      htmlFor={`pref-${category.id}`}
                      className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2"
                    >
                      <span>{category.icon}</span>
                      <span>{category.label}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <Button type="submit" disabled={profileLoading} className="mt-4 gap-2">
              <Save className="h-4 w-4" />
              {t.saveProfile}
            </Button>
          </form>
        </CardContent>
      </Card>

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
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">{t.newPassword}</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">{t.confirmPassword}</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="rounded-xl"
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

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t.notifications}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="email-notifications">{t.emailNotifications}</Label>
            <Switch
              id="email-notifications"
              checked={preferences.email_notifications_enabled}
              onCheckedChange={(checked) =>
                updatePreferences({ email_notifications_enabled: checked })
              }
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label htmlFor="event-reminders">{t.eventReminders}</Label>
            <Switch
              id="event-reminders"
              checked={preferences.notification_event_reminders}
              onCheckedChange={(checked) =>
                updatePreferences({ notification_event_reminders: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="reservation-confirmations">{t.reservationConfirmations}</Label>
            <Switch
              id="reservation-confirmations"
              checked={preferences.notification_reservations}
              onCheckedChange={(checked) =>
                updatePreferences({ notification_reservations: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="rsvp-updates">{t.rsvpUpdates}</Label>
            <Switch
              id="rsvp-updates"
              checked={preferences.notification_rsvp_updates}
              onCheckedChange={(checked) =>
                updatePreferences({ notification_rsvp_updates: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="new-events">{t.newEvents}</Label>
            <Switch
              id="new-events"
              checked={preferences.notification_new_events}
              onCheckedChange={(checked) =>
                updatePreferences({ notification_new_events: checked })
              }
            />
          </div>
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
            <Label htmlFor="profile-visibility">{t.profileVisibility}</Label>
            <Select
              value={preferences.profile_visibility || 'public'}
              onValueChange={(value) => updatePreferences({ profile_visibility: value })}
            >
              <SelectTrigger id="profile-visibility" className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">{t.public}</SelectItem>
                <SelectItem value="private">{t.private}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>{t.downloadData}</Label>
            <Button onClick={handleDownloadData} variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              {t.downloadMyData}
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
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            {t.appPreferences}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="language">{t.languagePreference}</Label>
            <Select
              value={language}
              onValueChange={(value: 'el' | 'en') => setLanguage(value)}
            >
              <SelectTrigger id="language" className="rounded-xl">
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
              <SelectTrigger id="theme" className="rounded-xl">
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

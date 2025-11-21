import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { usePasswordChange } from '@/hooks/usePasswordChange';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from '@/hooks/use-toast';
import { toastTranslations } from '@/translations/toastTranslations';
import { Lock, Bell, Shield, Download, Trash2, Settings as SettingsIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UserAccountSettingsProps {
  userId: string;
  language: 'el' | 'en';
}

export const UserAccountSettings = ({ userId, language }: UserAccountSettingsProps) => {
  const navigate = useNavigate();
  const { setLanguage } = useLanguage();
  const { preferences, isLoading, updatePreferences, isUpdating } = useUserPreferences(userId);
  const { changePassword, isChanging } = usePasswordChange();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const tt = toastTranslations[language];

  const text = {
    el: {
      accountSettings: 'Ρυθμίσεις Λογαριασμού',
      accountInfo: 'Πληροφορίες Λογαριασμού',
      email: 'Email',
      userId: 'ID Χρήστη',
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
      defaultCity: 'Προεπιλεγμένη Πόλη',
      theme: 'Θέμα',
      light: 'Φωτεινό',
      dark: 'Σκοτεινό',
      system: 'Σύστημα',
      saveChanges: 'Αποθήκευση Αλλαγών',
      cancel: 'Ακύρωση',
    },
    en: {
      accountSettings: 'Account Settings',
      accountInfo: 'Account Information',
      email: 'Email',
      userId: 'User ID',
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
      defaultCity: 'Default City',
      theme: 'Theme',
      light: 'Light',
      dark: 'Dark',
      system: 'System',
      saveChanges: 'Save Changes',
      cancel: 'Cancel',
    },
  };

  const t = text[language];

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
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: profile } = await supabase
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
        profile,
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

  if (isLoading || !preferences) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">{t.accountSettings}</h2>
      </div>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            {t.accountInfo}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t.email}</Label>
            <Input disabled value={preferences.user_id || ''} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{t.userId}</Label>
            <p className="text-xs font-mono text-muted-foreground">{userId}</p>
          </div>
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
              <SelectTrigger id="profile-visibility">
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
          <CardTitle>{t.appPreferences}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

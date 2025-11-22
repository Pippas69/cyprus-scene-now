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
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from '@/hooks/use-toast';
import { Lock, Bell, Shield, Download, Trash2, Settings as SettingsIcon, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [businessData, setBusinessData] = useState<any>(null);

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
      emailNotifications: 'Ειδοποιήσεις Email',
      newReservations: 'Νέες Κρατήσεις',
      newRSVPs: 'Νέα RSVP',
      eventCapacity: 'Πλήρης Χωρητικότητα',
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
      emailNotifications: 'Email Notifications',
      newReservations: 'New Reservations',
      newRSVPs: 'New RSVPs',
      eventCapacity: 'Event Capacity Reached',
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
            <Input disabled value={userProfile?.email || ''} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{t.userId}</Label>
            <p className="text-xs font-mono text-muted-foreground">{userId}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{t.businessId}</Label>
            <p className="text-xs font-mono text-muted-foreground">{businessId}</p>
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

      {/* Business Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t.businessNotifications}
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
            <Label htmlFor="new-reservations">{t.newReservations}</Label>
            <Switch
              id="new-reservations"
              checked={preferences.notification_reservations}
              onCheckedChange={(checked) =>
                updatePreferences({ notification_reservations: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="new-rsvps">{t.newRSVPs}</Label>
            <Switch
              id="new-rsvps"
              checked={preferences.notification_rsvp_updates}
              onCheckedChange={(checked) =>
                updatePreferences({ notification_rsvp_updates: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="event-capacity">{t.eventCapacity}</Label>
            <Switch
              id="event-capacity"
              checked={preferences.notification_business_updates}
              onCheckedChange={(checked) =>
                updatePreferences({ notification_business_updates: checked })
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

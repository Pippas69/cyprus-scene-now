import { useState, useEffect, useRef, useCallback, KeyboardEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ThreeStepDeleteDialog } from '@/components/user/ThreeStepDeleteDialog';
import { Separator } from '@/components/ui/separator';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { usePasswordChange } from '@/hooks/usePasswordChange';
import { useLanguage } from '@/hooks/useLanguage';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from '@/hooks/use-toast';
import { toastTranslations } from '@/translations/toastTranslations';
import { profileTranslations } from '@/translations/profileTranslations';
import { motion, AnimatePresence } from 'framer-motion';
import { spring, reducedMotion } from '@/lib/motion';
import {
  Lock, Bell, Shield, Download, User, Heart, MapPin, Save,
  Clock, CheckCircle, Mail, GraduationCap, Smartphone, Send, Upload, Check, X,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getCategoriesForUser } from '@/lib/unifiedCategories';
import { getCityOptions } from '@/lib/cityTranslations';
import { InterestSelectorList } from '@/components/categories/InterestSelectorList';
import { StudentVerificationSection } from '@/components/user/StudentVerificationSection';
import { PromoterSettingsCard } from '@/components/promoter/PromoterSettingsCard';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserSettingsProps {
  userId: string;
  language: 'el' | 'en';
}

type Section = 'profile' | 'account' | 'notifications' | 'privacy';

const SECTIONS: Section[] = ['profile', 'account', 'notifications', 'privacy'];

interface ProfileData {
  id?: string;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  age?: number | null;
  town?: string | null;
  city?: string | null;
  gender?: string | null;
  phone?: string | null;
  preferences?: string[] | null;
  avatar_url?: string | null;
  created_at?: string;
}

// ─── Field style constants ─────────────────────────────────────────────────────

const fieldClass = 'h-10 rounded-xl bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/25 focus:border-seafoam/50 text-sm';
const labelClass = 'text-white/55 text-xs font-medium tracking-wide uppercase block mb-1';

// ─── Section heading ───────────────────────────────────────────────────────────

const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <h3 className="font-urbanist font-black text-xl text-white mb-5">{children}</h3>
);

// ─── Toggle row ───────────────────────────────────────────────────────────────

const ToggleRow = ({ label, description, checked, onCheckedChange, disabled }: {
  label: string; description?: string; checked: boolean;
  onCheckedChange?: (v: boolean) => void; disabled?: boolean;
}) => (
  <div className="flex items-start justify-between gap-4 py-3 border-b border-white/[0.06] last:border-0">
    <div className="flex-1 min-w-0">
      <p className="text-white/75 text-sm font-medium">{label}</p>
      {description && <p className="text-white/35 text-xs mt-0.5 leading-relaxed">{description}</p>}
    </div>
    <Switch
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className="data-[state=checked]:bg-seafoam flex-shrink-0 mt-0.5"
    />
  </div>
);

// ─── Avatar uploader ───────────────────────────────────────────────────────────

const AvatarUploader = ({ currentUrl, displayName, onUpload }: {
  currentUrl: string | null; displayName: string; onUpload: (url: string) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Image must be under 2MB', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `avatars/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('user-uploads').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('user-uploads').getPublicUrl(fileName);
      onUpload(publicUrl);
    } catch {
      toast({ title: 'Upload failed', description: 'Could not upload image. Try again.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }, [onUpload]);

  return (
    <div className="flex items-center gap-5 mb-6">
      {/* Avatar preview */}
      <div className="relative flex-shrink-0">
        {currentUrl ? (
          <img src={currentUrl} alt={displayName} className="w-20 h-20 rounded-full object-cover ring-2 ring-background shadow-lg" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-seafoam/20 to-primary/20 ring-2 ring-background shadow-lg flex items-center justify-center">
            <span className="font-urbanist font-black text-2xl text-white/60">{displayName.charAt(0).toUpperCase()}</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Drop zone */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        className={`flex-1 flex flex-col items-center justify-center gap-2 px-4 py-4 rounded-xl border border-dashed transition-all ${
          dragOver ? 'border-seafoam/60 bg-seafoam/5' : 'border-white/[0.12] bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]'
        }`}
        aria-label="Upload profile photo"
      >
        <Upload className="w-4 h-4 text-white/30" />
        <span className="text-white/40 text-xs text-center leading-relaxed">
          {uploading ? 'Uploading...' : 'Drop photo or click to upload'}
        </span>
      </button>

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
    </div>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────

export const UserSettings = ({ userId, language }: UserSettingsProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setLanguage } = useLanguage();
  const { preferences, isLoading: prefsLoading, updatePreferences, isUpdating } = useUserPreferences(userId);
  const { changePassword, isChanging } = usePasswordChange();
  const { isSupported: pushSupported, isSubscribed: pushSubscribed, isLoading: pushLoading, permissionState, subscribe: subscribePush, unsubscribe: unsubscribePush } = usePushNotifications(userId);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [is2FALoading, setIs2FALoading] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [originalProfile, setOriginalProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>('profile');

  const tt = toastTranslations[language];
  const pt = profileTranslations[language];
  const categories = getCategoriesForUser(language);

  const isDirty = JSON.stringify(profile) !== JSON.stringify(originalProfile);

  // ── Section labels
  const sectionLabel: Record<Section, { label: string; icon: typeof User }> = {
    profile: { label: pt.navProfile, icon: User },
    account: { label: pt.navAccount, icon: Lock },
    notifications: { label: pt.navNotifications, icon: Bell },
    privacy: { label: pt.navPrivacy, icon: Shield },
  };

  const text = {
    el: {
      firstName: 'Όνομα', lastName: 'Επίθετο', age: 'Ηλικία', email: 'Email',
      phone: 'Τηλέφωνο', town: 'Πόλη', townPlaceholder: 'Επιλέξτε πόλη',
      gender: 'Φύλο', genderPlaceholder: 'Επιλέξτε φύλο',
      male: 'Άνδρας', female: 'Γυναίκα', other: 'Άλλο',
      interests: 'Ενδιαφέροντα', interestsDescription: 'Επιλέξτε τι σας αρέσει για καλύτερες προτάσεις',
      passwordManagement: 'Αλλαγή Κωδικού',
      currentPassword: 'Τρέχων Κωδικός', newPassword: 'Νέος Κωδικός', confirmPassword: 'Επιβεβαίωση',
      changePassword: 'Αλλαγή Κωδικού',
      twoFactorAuth: 'Επαλήθευση 2 Βημάτων (2FA)',
      twoFactorDesc: 'Λάβετε έναν 6ψήφιο κωδικό στο email σας κατά τη σύνδεση',
      emailConfirmationsTitle: 'Email Επιβεβαιώσεων', emailConfirmationsDesc: 'Κρατήσεις, εισιτήρια & εξαργυρώσεις',
      mandatoryTitle: 'Απαραίτητες Ειδοποιήσεις', mandatoryDesc: 'Επιβεβαιώσεις κρατήσεων & προσφορών',
      suggestionsTitle: 'Προτάσεις για Σένα', suggestionsDesc: 'Events και προσφορές βάσει ενδιαφερόντων',
      eventReminders: 'Υπενθυμίσεις Events', eventRemindersDesc: '2 ώρες πριν',
      reservationReminders: 'Υπενθυμίσεις Κρατήσεων', reservationRemindersDesc: '2 ώρες πριν',
      expiringOffers: 'Υπενθυμίσεις Προσφορών', expiringOffersDesc: '2 ώρες πριν τη λήξη',
      pushNotifications: 'Push Ειδοποιήσεις', pushNotificationsDesc: 'Άμεσες ειδοποιήσεις στη συσκευή',
      testPush: 'Δοκιμή', sendingTest: 'Αποστολή...',
      profileVisibility: 'Ορατότητα Προφίλ', public: 'Δημόσιο', private: 'Ιδιωτικό',
      downloadData: 'Λήψη Δεδομένων', downloadMyData: 'Λήψη των Δεδομένων μου',
      deleteAccount: 'Διαγραφή Λογαριασμού',
      deleteWarning: 'Αυτή η ενέργεια δεν μπορεί να αναιρεθεί. Όλα τα δεδομένα σας θα διαγραφούν μόνιμα.',
    },
    en: {
      firstName: 'First Name', lastName: 'Last Name', age: 'Age', email: 'Email',
      phone: 'Phone', town: 'Town', townPlaceholder: 'Select town',
      gender: 'Gender', genderPlaceholder: 'Select gender',
      male: 'Male', female: 'Female', other: 'Other',
      interests: 'Interests', interestsDescription: 'Select what you like for better recommendations',
      passwordManagement: 'Change Password',
      currentPassword: 'Current Password', newPassword: 'New Password', confirmPassword: 'Confirm Password',
      changePassword: 'Change Password',
      twoFactorAuth: 'Two-Factor Authentication (2FA)',
      twoFactorDesc: 'Receive a 6-digit code to your email when logging in',
      emailConfirmationsTitle: 'Email Confirmations', emailConfirmationsDesc: 'Reservations, tickets & redemptions',
      mandatoryTitle: 'Essential Notifications', mandatoryDesc: 'Reservation & offer confirmations',
      suggestionsTitle: 'Suggestions for You', suggestionsDesc: 'Events and offers matching your interests',
      eventReminders: 'Event Reminders', eventRemindersDesc: '2 hours before',
      reservationReminders: 'Reservation Reminders', reservationRemindersDesc: '2 hours before',
      expiringOffers: 'Offer Reminders', expiringOffersDesc: '2 hours before expiry',
      pushNotifications: 'Push Notifications', pushNotificationsDesc: 'Instant notifications on your device',
      testPush: 'Test', sendingTest: 'Sending...',
      profileVisibility: 'Profile Visibility', public: 'Public', private: 'Private',
      downloadData: 'Download Data', downloadMyData: 'Download My Data',
      deleteAccount: 'Delete Account',
      deleteWarning: 'This action cannot be undone. All your data will be permanently deleted.',
    },
  };
  const t = text[language];

  useEffect(() => {
    fetchProfile();
    fetch2FAStatus();
  }, [userId]);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [location.hash, profile]);

  const fetchProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) { setProfile(data); setOriginalProfile(data); }
  };

  const fetch2FAStatus = async () => {
    const { data } = await supabase.from('user_2fa_settings').select('is_enabled').eq('user_id', userId).maybeSingle();
    setIs2FAEnabled(data?.is_enabled ?? false);
  };

  const toggle2FA = async (enabled: boolean) => {
    setIs2FALoading(true);
    try {
      if (enabled) {
        await supabase.from('user_2fa_settings').upsert({ user_id: userId, is_enabled: true }, { onConflict: 'user_id' });
      } else {
        await supabase.from('user_2fa_settings').update({ is_enabled: false }).eq('user_id', userId);
      }
      setIs2FAEnabled(enabled);
      toast({ title: tt.success, description: language === 'el' ? (enabled ? '2FA ενεργοποιήθηκε' : '2FA απενεργοποιήθηκε') : (enabled ? '2FA enabled' : '2FA disabled') });
    } catch {
      toast({ title: tt.error, description: tt.loadFailed, variant: 'destructive' });
    } finally {
      setIs2FALoading(false); }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    const { error } = await supabase.from('profiles').update({
      first_name: profile.first_name,
      last_name: profile.last_name,
      name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
      age: profile.age,
      town: profile.town,
      city: profile.town,
      gender: profile.gender,
      phone: profile.phone,
      preferences: profile.preferences || [],
      avatar_url: profile.avatar_url,
    }).eq('id', userId);

    if (error) {
      toast({ title: tt.error, description: tt.profileUpdateFailed, variant: 'destructive' });
    } else {
      setOriginalProfile({ ...profile });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
    setProfileLoading(false);
  };

  const togglePreference = (categoryId: string) => {
    const current = profile?.preferences || [];
    setProfile({ ...profile, preferences: current.includes(categoryId) ? current.filter((id: string) => id !== categoryId) : [...current, categoryId] });
  };

  const handlePasswordChange = async () => {
    const success = await changePassword({ currentPassword, newPassword, confirmPassword });
    if (success) { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }
  };

  const handleDownloadData = async () => {
    try {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).single();
      const { data: rsvps } = await supabase.from('rsvps').select('*, events(*)').eq('user_id', userId);
      const { data: reservations } = await supabase.from('reservations').select('*, events(*)').eq('user_id', userId);
      const { data: favorites } = await supabase.from('favorites').select('*, events(*)').eq('user_id', userId);
      const exportData = { profile: profileData, preferences, rsvps, reservations, favorites, exportedAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fomo-data-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: tt.success, description: language === 'el' ? 'Τα δεδομένα λήφθηκαν επιτυχώς' : 'Data downloaded successfully' });
    } catch {
      toast({ title: tt.error, description: tt.loadFailed, variant: 'destructive' });
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('delete-user-account');
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      toast({ title: tt.deleted, description: language === 'el' ? 'Ο λογαριασμός διαγράφηκε οριστικά' : 'Your account has been permanently deleted' });
      await supabase.auth.signOut();
      navigate('/');
    } catch (error: unknown) {
      toast({ title: tt.error, description: error instanceof Error ? error.message : String(error), variant: 'destructive' });
    } finally {
      setIsDeleting(false); }
  };

  const handleTabKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    const idx = SECTIONS.indexOf(activeSection);
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveSection(SECTIONS[(idx + 1) % SECTIONS.length]); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveSection(SECTIONS[(idx - 1 + SECTIONS.length) % SECTIONS.length]); }
  }, [activeSection]);

  if (prefsLoading || !preferences || !profile) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-6 h-6 border-2 border-seafoam border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'User';

  return (
    <div className="flex gap-0 lg:gap-8 min-h-[600px] relative">
      {/* ── Left nav ── */}
      <div
        role="tablist"
        aria-label={language === 'el' ? 'Κατηγορίες ρυθμίσεων' : 'Settings sections'}
        onKeyDown={handleTabKeyDown}
        className="hidden lg:flex flex-col gap-1 w-52 flex-shrink-0 pt-1"
      >
        {SECTIONS.map((section) => {
          const { label, icon: Icon } = sectionLabel[section];
          const isActive = activeSection === section;
          return (
            <button
              key={section}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveSection(section)}
              className="relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-seafoam/50 text-left"
              style={{ color: isActive ? 'hsl(var(--seafoam))' : 'rgba(255,255,255,0.4)' }}
            >
              {isActive && (
                <motion.div
                  layoutId="settings-nav-pill"
                  className="absolute inset-0 bg-seafoam/8 rounded-xl border border-seafoam/15"
                  transition={reducedMotion ? { duration: 0 } : spring.smooth}
                />
              )}
              <Icon className="w-4 h-4 relative flex-shrink-0" />
              <span className="relative font-medium">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Mobile nav — horizontal scroll chips */}
      <div className="flex lg:hidden gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1 w-full">
        {SECTIONS.map((section) => {
          const { label } = sectionLabel[section];
          const isActive = activeSection === section;
          return (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                isActive ? 'bg-seafoam text-aegean' : 'bg-white/[0.04] border border-white/[0.08] text-white/50'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Right form area ── */}
      <div className="flex-1 min-w-0 lg:col-span-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={reducedMotion ? {} : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? {} : { opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : { ...spring.smooth, duration: 0.2 }}
            className="max-w-2xl"
          >
            {/* ─── Profile section ─── */}
            {activeSection === 'profile' && (
              <form onSubmit={handleProfileUpdate}>
                <SectionHeading>{sectionLabel.profile.label}</SectionHeading>

                {/* Avatar */}
                <AvatarUploader
                  currentUrl={profile.avatar_url}
                  displayName={displayName}
                  onUpload={(url) => setProfile({ ...profile, avatar_url: url })}
                />

                {/* Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className={labelClass}>{t.firstName}</label>
                    <Input value={profile.first_name || ''} onChange={e => setProfile({ ...profile, first_name: e.target.value })} className={fieldClass} placeholder="Γιώργος" />
                  </div>
                  <div>
                    <label className={labelClass}>{t.lastName}</label>
                    <Input value={profile.last_name || ''} onChange={e => setProfile({ ...profile, last_name: e.target.value })} className={fieldClass} placeholder="Παπαδόπουλος" />
                  </div>
                </div>

                {/* Age + Town + Gender */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className={labelClass}>{t.age}</label>
                    <NumberInput value={profile.age || 18} onChange={v => setProfile({ ...profile, age: v })} min={13} max={120} className={`${fieldClass} w-full`} />
                  </div>
                  <div>
                    <label className={labelClass}>{t.town}</label>
                    <Select value={profile.town || ''} onValueChange={v => setProfile({ ...profile, town: v })}>
                      <SelectTrigger className={fieldClass}><SelectValue placeholder={t.townPlaceholder} /></SelectTrigger>
                      <SelectContent>{getCityOptions(language).map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className={labelClass}>{t.gender}</label>
                    <Select value={profile.gender || ''} onValueChange={v => setProfile({ ...profile, gender: v })}>
                      <SelectTrigger className={fieldClass}><SelectValue placeholder={t.genderPlaceholder} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">{t.male}</SelectItem>
                        <SelectItem value="female">{t.female}</SelectItem>
                        <SelectItem value="other">{t.other}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Email (read-only) */}
                <div className="mb-4">
                  <label className={labelClass}>{t.email}</label>
                  <Input value={profile.email || ''} disabled className={`${fieldClass} opacity-40 cursor-not-allowed`} />
                </div>

                {/* Phone */}
                <div className="mb-6">
                  <label className={labelClass}>{t.phone}</label>
                  <Input value={(profile.phone || '').replace(/^\+357\s*/, '')} onChange={e => setProfile({ ...profile, phone: e.target.value })} className={fieldClass} />
                </div>

                {/* Interests */}
                <div className="mb-6 pt-5 border-t border-white/[0.07]">
                  <div className="flex items-center gap-2 mb-1">
                    <Heart className="w-3.5 h-3.5 text-seafoam" />
                    <label className={labelClass + ' mb-0'}>{t.interests}</label>
                  </div>
                  <p className="text-white/30 text-xs mb-3">{t.interestsDescription}</p>
                  <div className="[&>div]:space-y-1.5">
                    <InterestSelectorList categories={categories} selectedIds={profile.preferences || []} onToggle={togglePreference} />
                  </div>
                </div>

                {/* Student verification */}
                <div className="pt-5 border-t border-white/[0.07] mb-6" id="student-verification">
                  <StudentVerificationSection userId={userId} userName={profile.first_name || profile.name || ''} />
                </div>

                {/* Promoter settings */}
                <div className="pt-5 border-t border-white/[0.07] mb-20">
                  <PromoterSettingsCard userId={userId} language={language} />
                </div>

                {/* Sticky save bar */}
                <div className="sticky bottom-0 left-0 right-0 z-10 py-3 bg-background/80 backdrop-blur-md border-t border-white/[0.06]">
                  <motion.button
                    type="submit"
                    disabled={profileLoading || !isDirty}
                    whileTap={reducedMotion ? {} : { scale: 0.97 }}
                    transition={spring.snappy}
                    className="w-full h-11 flex items-center justify-center gap-2 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: isDirty ? 'hsl(var(--seafoam))' : 'rgba(255,255,255,0.04)',
                      color: isDirty ? 'hsl(var(--aegean))' : 'rgba(255,255,255,0.3)',
                      border: isDirty ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <AnimatePresence mode="wait">
                      {saveSuccess ? (
                        <motion.span key="success" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={spring.snappy} className="flex items-center gap-2">
                          <Check className="w-4 h-4" /> {pt.saved2}
                        </motion.span>
                      ) : profileLoading ? (
                        <motion.span key="loading" className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          {pt.saving}
                        </motion.span>
                      ) : (
                        <motion.span key="idle" className="flex items-center gap-2">
                          <Save className="w-4 h-4" /> {pt.save}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </div>
              </form>
            )}

            {/* ─── Account section ─── */}
            {activeSection === 'account' && (
              <div className="space-y-8">
                <div>
                  <SectionHeading>{sectionLabel.account.label}</SectionHeading>

                  {/* Password */}
                  <div className="space-y-4 mb-8">
                    <h4 className="text-white/60 text-sm font-semibold">{t.passwordManagement}</h4>
                    <div>
                      <label className={labelClass}>{t.currentPassword}</label>
                      <PasswordInput value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={fieldClass} />
                    </div>
                    <div>
                      <label className={labelClass}>{t.newPassword}</label>
                      <PasswordInput value={newPassword} onChange={e => setNewPassword(e.target.value)} className={fieldClass} />
                    </div>
                    <div>
                      <label className={labelClass}>{t.confirmPassword}</label>
                      <PasswordInput value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={fieldClass} />
                    </div>
                    <button
                      type="button"
                      onClick={handlePasswordChange}
                      disabled={isChanging || !currentPassword || !newPassword || !confirmPassword || newPassword.length < 8}
                      className="h-10 px-6 rounded-xl bg-seafoam text-aegean font-semibold text-sm hover:bg-seafoam/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {t.changePassword}
                    </button>
                  </div>

                  {/* 2FA */}
                  {profile?.role !== 'business' && (
                    <div className="pt-6 border-t border-white/[0.07]">
                      <ToggleRow
                        label={t.twoFactorAuth}
                        description={t.twoFactorDesc}
                        checked={is2FAEnabled}
                        onCheckedChange={toggle2FA}
                        disabled={is2FALoading}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── Notifications section ─── */}
            {activeSection === 'notifications' && (
              <div>
                <SectionHeading>{sectionLabel.notifications.label}</SectionHeading>

                <div className="space-y-0">
                  <ToggleRow label={t.emailConfirmationsTitle} description={t.emailConfirmationsDesc} checked={true} disabled />
                  <ToggleRow label={t.mandatoryTitle} description={t.mandatoryDesc} checked={true} disabled />

                  <div className="flex items-start justify-between gap-4 py-3 border-b border-white/[0.06]">
                    <div className="flex-1 min-w-0">
                      <p className="text-white/75 text-sm font-medium flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-seafoam" /> {t.pushNotifications}
                      </p>
                      <p className="text-white/35 text-xs mt-0.5">{t.pushNotificationsDesc}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {pushSubscribed && (
                        <Button size="sm" variant="outline" className="h-7 text-xs px-2.5 border-white/10 text-white/50" disabled={isSendingTest}
                          onClick={async () => {
                            setIsSendingTest(true);
                            try {
                              const { error } = await supabase.functions.invoke('test-push-notification');
                              if (error) throw error;
                              toast({ title: language === 'el' ? 'Ειδοποίηση εστάλη!' : 'Notification sent!' });
                            } catch (err) {
                              toast({ title: tt.error, variant: 'destructive' });
                            } finally { setIsSendingTest(false); }
                          }}>
                          <Send className="w-3 h-3 mr-1" />{isSendingTest ? t.sendingTest : t.testPush}
                        </Button>
                      )}
                      <Switch checked={pushSubscribed} disabled={pushLoading} onCheckedChange={c => c ? subscribePush() : unsubscribePush()} className="data-[state=checked]:bg-seafoam" />
                    </div>
                  </div>

                  <div className="pt-3">
                    <p className="text-white/30 text-xs uppercase tracking-wide font-semibold mb-2 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> {language === 'el' ? 'Υπενθυμίσεις' : 'Reminders'}
                    </p>
                    <ToggleRow label={t.eventReminders} description={t.eventRemindersDesc} checked={preferences.notification_event_reminders ?? false} onCheckedChange={v => updatePreferences({ notification_event_reminders: v })} />
                    <ToggleRow label={t.reservationReminders} description={t.reservationRemindersDesc} checked={preferences.notification_reservations ?? false} onCheckedChange={v => updatePreferences({ notification_reservations: v })} />
                    <ToggleRow label={t.expiringOffers} description={t.expiringOffersDesc} checked={preferences.notification_expiring_offers ?? false} onCheckedChange={v => updatePreferences({ notification_expiring_offers: v })} />
                  </div>
                </div>
              </div>
            )}

            {/* ─── Privacy section ─── */}
            {activeSection === 'privacy' && (
              <div className="space-y-8">
                <div>
                  <SectionHeading>{sectionLabel.privacy.label}</SectionHeading>

                  <div className="mb-6">
                    <label className={labelClass}>{t.profileVisibility}</label>
                    <Select value={preferences.profile_visibility || 'public'} onValueChange={v => updatePreferences({ profile_visibility: v })}>
                      <SelectTrigger className={fieldClass}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">{t.public}</SelectItem>
                        <SelectItem value="private">{t.private}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="pt-5 border-t border-white/[0.07] mb-6">
                    <p className="text-white/60 text-sm font-semibold mb-1">{t.downloadData}</p>
                    <p className="text-white/30 text-xs mb-3">{language === 'el' ? 'Κατέβασε αντίγραφο όλων των δεδομένων σου' : 'Download a copy of all your data'}</p>
                    <button
                      type="button"
                      onClick={handleDownloadData}
                      className="flex items-center gap-2 h-9 px-4 rounded-xl border border-white/[0.1] text-white/50 text-sm hover:text-white/80 hover:border-white/20 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" /> {t.downloadMyData}
                    </button>
                  </div>

                  <div className="pt-5 border-t border-white/[0.07]">
                    <p className="text-red-400/80 text-sm font-semibold mb-1">{t.deleteAccount}</p>
                    <p className="text-white/30 text-xs mb-3">{t.deleteWarning}</p>
                    <ThreeStepDeleteDialog onConfirmDelete={handleDeleteAccount} isDeleting={isDeleting} isBusiness={false} />
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

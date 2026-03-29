import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches the logged-in user's profile data (name, phone, email).
 * Used for auto-filling booking forms after auth + profile completion.
 */
export function useProfileData(userId: string | null | undefined) {
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileComplete, setProfileComplete] = useState(false);

  useEffect(() => {
    if (!userId) {
      setProfileName('');
      setProfilePhone('');
      setProfileEmail('');
      setProfileComplete(false);
      return;
    }
    let cancelled = false;

    const fetchProfile = async () => {
      const [{ data: profile }, { data: authData }] = await Promise.all([
        supabase.from('profiles').select('first_name, last_name, phone').eq('id', userId).single(),
        supabase.auth.getUser(),
      ]);

      if (cancelled) return;

      if (profile) {
        const full = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
        if (full) setProfileName(full);
        if (profile.phone) setProfilePhone(profile.phone);
        // Profile is complete if name and phone exist
        setProfileComplete(!!(profile.first_name && profile.last_name && profile.phone));
      }
      if (authData.user?.email) setProfileEmail(authData.user.email);
    };

    fetchProfile();
    return () => { cancelled = true; };
  }, [userId]);

  return { profileName, profilePhone, profileEmail, profileComplete };
}

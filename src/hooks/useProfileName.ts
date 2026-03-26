import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches the logged-in user's full profile name.
 * Used to auto-fill the first guest slot (slot 0 = booker) in all booking flows.
 */
export function useProfileName(userId: string | null | undefined) {
  const [profileName, setProfileName] = useState('');

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const fetch = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', userId)
        .single();
      if (!cancelled && data) {
        const full = [data.first_name, data.last_name].filter(Boolean).join(' ').trim();
        if (full) setProfileName(full);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, [userId]);

  return profileName;
}

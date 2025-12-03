import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BetaMode {
  enabled: boolean;
  message_el: string;
  message_en: string;
}

interface UseBetaModeReturn {
  isBetaMode: boolean;
  isLoading: boolean;
  betaMessage: { el: string; en: string };
}

export const useBetaMode = (): UseBetaModeReturn => {
  const [isBetaMode, setIsBetaMode] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [betaMessage, setBetaMessage] = useState({ el: 'Σύντομα κοντά σας!', en: 'Coming Soon!' });

  useEffect(() => {
    const fetchBetaMode = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'beta_mode')
          .single();

        if (error) throw error;

        const settings = data?.value as unknown as BetaMode;
        setIsBetaMode(settings?.enabled ?? true);
        setBetaMessage({
          el: settings?.message_el ?? 'Σύντομα κοντά σας!',
          en: settings?.message_en ?? 'Coming Soon!'
        });
      } catch (error) {
        console.error('Error fetching beta mode:', error);
        setIsBetaMode(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBetaMode();
  }, []);

  return { isBetaMode, isLoading, betaMessage };
};

export const validateInviteCode = async (code: string): Promise<{ valid: boolean; error?: string }> => {
  try {
    const normalizedCode = code.toUpperCase().trim();
    
    const { data, error } = await supabase
      .from('beta_invite_codes')
      .select('*')
      .eq('code', normalizedCode)
      .single();

    if (error || !data) {
      return { valid: false, error: 'invalid' };
    }

    if (!data.is_active) {
      return { valid: false, error: 'inactive' };
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { valid: false, error: 'expired' };
    }

    if (data.current_uses >= (data.max_uses || 1)) {
      return { valid: false, error: 'used' };
    }

    return { valid: true };
  } catch (error) {
    console.error('Error validating invite code:', error);
    return { valid: false, error: 'error' };
  }
};

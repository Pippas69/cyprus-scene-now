import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useOnboardingStatus(businessId: string | null) {
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  const checkStatus = useCallback(async () => {
    if (!businessId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('onboarding_completed')
        .eq('id', businessId)
        .single();

      if (error) throw error;
      setOnboardingCompleted(data?.onboarding_completed ?? false);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setOnboardingCompleted(false);
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  const completeOnboarding = useCallback(async () => {
    if (!businessId) return false;

    try {
      const { error } = await supabase
        .from('businesses')
        .update({ onboarding_completed: true })
        .eq('id', businessId);

      if (error) throw error;
      setOnboardingCompleted(true);
      return true;
    } catch (error) {
      console.error('Error completing onboarding:', error);
      return false;
    }
  }, [businessId]);

  const resetOnboarding = useCallback(async () => {
    if (!businessId) return false;

    try {
      const { error } = await supabase
        .from('businesses')
        .update({ onboarding_completed: false })
        .eq('id', businessId);

      if (error) throw error;
      setOnboardingCompleted(false);
      return true;
    } catch (error) {
      console.error('Error resetting onboarding:', error);
      return false;
    }
  }, [businessId]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return {
    isLoading,
    onboardingCompleted,
    completeOnboarding,
    resetOnboarding,
    checkStatus
  };
}

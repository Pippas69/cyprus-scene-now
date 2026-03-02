import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useBusinessOwner() {
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkBusinessOwner();
  }, []);

  const checkBusinessOwner = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return;
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id, category')
      .eq('user_id', user.id)
      .maybeSingle();

    setBusinessId(business?.id || null);
    setCategories(business?.category || []);
    setIsLoading(false);
  };

  return { businessId, isBusinessOwner: !!businessId, categories, isLoading };
}

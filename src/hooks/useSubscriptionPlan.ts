import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PlanSlug = 'free' | 'basic' | 'pro' | 'elite';

interface SubscriptionPlanData {
  plan: PlanSlug;
  planName: string;
}

export const useSubscriptionPlan = (businessId: string | null) => {
  return useQuery<SubscriptionPlanData>({
    queryKey: ["subscription-plan", businessId],
    queryFn: async () => {
      if (!businessId) {
        return { plan: 'free', planName: 'Free' };
      }

      // Get business subscription with plan info
      const { data: subscription } = await supabase
        .from("business_subscriptions")
        .select("plan_id, status, subscription_plans(slug, name)")
        .eq("business_id", businessId)
        .eq("status", "active")
        .maybeSingle();

      if (!subscription || !subscription.subscription_plans) {
        return { plan: 'free', planName: 'Free' };
      }

      const planData = subscription.subscription_plans as { slug: string; name: string };
      
      // Map old slugs to new ones
      const slugMap: Record<string, PlanSlug> = {
        'free': 'free',
        'starter': 'basic',
        'basic': 'basic',
        'growth': 'pro',
        'pro': 'pro',
        'professional': 'elite',
        'elite': 'elite',
      };

      const plan = slugMap[planData.slug] || 'free';
      
      const nameMap: Record<PlanSlug, string> = {
        'free': 'Free',
        'basic': 'Basic',
        'pro': 'Pro',
        'elite': 'Elite',
      };

      return {
        plan,
        planName: nameMap[plan],
      };
    },
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
  });
};

// Helper to check if plan has access to a section
export const hasAccessToSection = (
  currentPlan: PlanSlug,
  requiredPlan: PlanSlug
): boolean => {
  const planHierarchy: Record<PlanSlug, number> = {
    'free': 0,
    'basic': 1,
    'pro': 2,
    'elite': 3,
  };
  
  return planHierarchy[currentPlan] >= planHierarchy[requiredPlan];
};

// Get the required plan for each section
export const getSectionRequiredPlan = (section: 'overview' | 'performance' | 'boostValue' | 'guidance'): PlanSlug => {
  const requirements: Record<string, PlanSlug> = {
    'overview': 'free',
    'performance': 'basic',
    'boostValue': 'pro',
    'guidance': 'elite',
  };
  return requirements[section];
};

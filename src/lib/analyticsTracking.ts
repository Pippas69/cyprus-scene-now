import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

let sessionId: string | null = null;

// Generate or retrieve session ID
const getSessionId = (): string => {
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  return sessionId;
};

// Detect device type
const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

// Track event view
export const trackEventView = async (
  eventId: string,
  source: 'feed' | 'map' | 'search' | 'profile' | 'direct'
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from('event_views').insert({
      event_id: eventId,
      user_id: user?.id || null,
      source,
      device_type: getDeviceType(),
      session_id: getSessionId(),
    });

    if (error) {
      console.error('Error tracking event view:', error);
    }
  } catch (error) {
    console.error('Failed to track event view:', error);
  }
};

// Track discount view
export const trackDiscountView = async (
  discountId: string,
  source: 'feed' | 'event' | 'profile' | 'direct'
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from('discount_views').insert({
      discount_id: discountId,
      user_id: user?.id || null,
      source,
      device_type: getDeviceType(),
      session_id: getSessionId(),
    });

    if (error) {
      console.error('Error tracking discount view:', error);
    }
  } catch (error) {
    console.error('Failed to track discount view:', error);
  }
};

// Track engagement event
export const trackEngagement = async (
  businessId: string,
  eventType: 'profile_view' | 'website_click' | 'phone_click' | 'share' | 'favorite' | 'unfavorite',
  entityType?: 'event' | 'discount' | 'business',
  entityId?: string,
  metadata?: Record<string, any>
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('engagement_events').insert({
      business_id: businessId,
      user_id: user?.id || null,
      event_type: eventType,
      entity_type: entityType || null,
      entity_id: entityId || null,
      session_id: getSessionId(),
      metadata: metadata || null,
    });
  } catch (error) {
    console.error('Failed to track engagement:', error);
  }
};

// Track business follow
export const trackBusinessFollow = async (
  businessId: string,
  source: 'profile' | 'event' | 'feed' | 'search' | 'direct'
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await supabase.from('business_followers').insert({
      business_id: businessId,
      user_id: user.id,
      source,
    });
  } catch (error) {
    console.error('Failed to track business follow:', error);
  }
};

// Track business unfollow
export const trackBusinessUnfollow = async (businessId: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await supabase
      .from('business_followers')
      .update({ unfollowed_at: new Date().toISOString() })
      .eq('business_id', businessId)
      .eq('user_id', user.id)
      .is('unfollowed_at', null);
  } catch (error) {
    console.error('Failed to track business unfollow:', error);
  }
};

// Hook for tracking element visibility
export const useViewTracking = (
  elementRef: React.RefObject<HTMLElement>,
  onView: () => void,
  options: IntersectionObserverInit = { threshold: 0.5 }
) => {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          onView();
          observer.disconnect(); // Track only once
        }
      });
    }, options);

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [elementRef, onView]);
};

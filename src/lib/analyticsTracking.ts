import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

let sessionId: string | null = null;

/**
 * VIEW TRACKING RULES (Updated):
 * 
 * Views are tracked as IMPRESSIONS (when the card becomes visible) from these sources ONLY:
 * 
 * EVENT VIEWS:
 * - Feed (/ or /feed) - boosted events
 * - /ekdiloseis page (public events discovery)
 * - /dashboard-user?tab=events (user's events section)
 * 
 * OFFER VIEWS:
 * - Feed (/ or /feed) - boosted offers
 * - /offers page (public offers discovery)
 * - /dashboard-user?tab=offers (user's offers section)
 * 
 * NOT tracked:
 * - Map (/xartis)
 * - Business profiles (/business/:id)
 * - My Reservations tab
 * - Settings tab
 * - Any other pages
 */

const debugLog = (...args: any[]) => {
  // Keep noise out of production builds
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug(...args);
  }
};

/**
 * Get current context for view tracking decisions
 */
const getCurrentContext = () => {
  try {
    const path = window.location?.pathname || "";
    const search = window.location?.search || "";
    const params = new URLSearchParams(search);
    const tab = params.get('tab');
    const src = params.get('src');
    
    return { path, tab, src };
  } catch {
    return { path: "", tab: null, src: null };
  }
};

/**
 * Check if event views are allowed from current page
 */
const isAllowedEventViewSource = (): boolean => {
  const { path, tab, src } = getCurrentContext();
  
  // Never track if src=dashboard_user (safety fallback)
  if (src === 'dashboard_user') return false;
  
  // Allowed: Feed page (root / or /feed)
  if (path === '/' || path === '/feed') return true;

  // Allowed: Business dashboard feed (index route renders the Feed component)
  // IMPORTANT: Only the feed ("home") inside business dashboard should count as views.
  if (path === '/dashboard-business' || path === '/dashboard-business/') return true;
  
  // Allowed: /ekdiloseis page (public events discovery)
  if (path === '/ekdiloseis' || path.startsWith('/ekdiloseis')) return true;
  
  // Allowed: Dashboard user - only "events" tab
  if (path.startsWith('/dashboard-user') && tab === 'events') return true;
  
  // NOT allowed: Everything else (map, business profiles, reservations tab, settings, etc.)
  return false;
};

/**
 * Check if offer views are allowed from current page
 */
const isAllowedOfferViewSource = (): boolean => {
  const { path, tab, src } = getCurrentContext();
  
  // Never track if src=dashboard_user (safety fallback)
  if (src === 'dashboard_user') return false;
  
  // Allowed: Feed page (root / or /feed)
  if (path === '/' || path === '/feed') return true;

  // Allowed: Business dashboard feed (index route renders the Feed component)
  // IMPORTANT: Only the feed ("home") inside business dashboard should count as views.
  if (path === '/dashboard-business' || path === '/dashboard-business/') return true;
  
  // Allowed: /offers page (public offers discovery)
  if (path === '/offers' || path.startsWith('/offers')) return true;
  
  // Allowed: Dashboard user - only "offers" tab
  if (path.startsWith('/dashboard-user') && tab === 'offers') return true;
  
  // NOT allowed: Everything else (map, business profiles, reservations tab, settings, etc.)
  return false;
};

/**
 * Check if we're in a context where profile views should NOT be counted
 * (user browsing their own dashboard - any tab)
 */
const isDashboardUserContext = (): boolean => {
  const { path, src } = getCurrentContext();
  
  // Strongest rule: if src=dashboard_user, never count profile views
  if (src === 'dashboard_user') return true;
  
  // Block profile views from user dashboard entirely
  if (path.startsWith('/dashboard-user')) return true;
  
  return false;
};

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

// Track event view - ONLY from allowed sources
export const trackEventView = async (
  eventId: string,
  source: 'feed' | 'map' | 'search' | 'profile' | 'direct'
) => {
  try {
    // Check if this is an allowed source for event views
    if (!isAllowedEventViewSource()) {
      debugLog('[trackEventView] skipped - not allowed source', { 
        eventId, 
        source, 
        ...getCurrentContext()
      });
      return;
    }

    debugLog('[trackEventView] sending', { eventId, source, ...getCurrentContext() });

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

// Track discount view - ONLY from allowed sources
export const trackDiscountView = async (
  discountId: string,
  source: 'feed' | 'event' | 'profile' | 'direct'
) => {
  try {
    // Check if this is an allowed source for offer views
    if (!isAllowedOfferViewSource()) {
      debugLog('[trackDiscountView] skipped - not allowed source', { 
        discountId, 
        source, 
        ...getCurrentContext()
      });
      return;
    }

    debugLog('[trackDiscountView] sending', { discountId, source, ...getCurrentContext() });

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

// Track engagement event (generic)
export const trackEngagement = async (
  businessId: string,
  eventType: string,
  entityType?: 'event' | 'discount' | 'business',
  entityId?: string,
  metadata?: Record<string, any>
) => {
  try {
    // Profile views are a *view metric*. Never count them from user dashboard context.
    if (eventType === 'profile_view' && isDashboardUserContext()) {
      debugLog('[trackEngagement] profile_view skipped', { businessId, entityType, entityId, metadata, ...getCurrentContext() });
      return;
    }

    if (eventType === 'profile_view') {
      debugLog('[trackEngagement] profile_view sending', { businessId, entityType, entityId, metadata, ...getCurrentContext() });
    }

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('engagement_events').insert({
      business_id: businessId,
      user_id: user?.id || null,
      event_type: eventType,
      entity_type: entityType || null,
      entity_id: entityId || null,
      session_id: getSessionId(),
      metadata: metadata || null,
    });

    if (error) {
      console.error('Failed to track engagement:', {
        eventType,
        businessId,
        entityType,
        entityId,
        error,
      });
    }
  } catch (error) {
    console.error('Failed to track engagement:', error);
  }
};

// Track offer "Redeem" click (interaction intent)
export const trackOfferRedeemClick = async (
  businessId: string,
  discountId: string,
  source: 'offer_card' | 'boosted_section' | 'offer_page' | 'other' = 'other'
) => {
  return trackEngagement(businessId, 'offer_redeem_click', 'discount', discountId, { source });
};

// Track search result view (when business appears in search results)
export const trackSearchResultView = async (
  businessId: string,
  searchType: 'general' | 'map'
) => {
  return trackEngagement(businessId, 'profile_view', 'business', businessId, { 
    source: 'search',
    search_type: searchType 
  });
};

// Track search result click (interaction - general search only)
export const trackSearchResultClick = async (
  businessId: string,
  searchType: 'general' | 'map'
) => {
  // Only general search clicks count as interactions (map click = just view to pin)
  if (searchType === 'general') {
    return trackEngagement(businessId, 'profile_click', 'business', businessId, { 
      source: 'search',
      search_type: searchType 
    });
  }
  // Map search click is just a view (already tracked when appearing in results)
  // Additional view tracked when user clicks to go to pin
  return trackEngagement(businessId, 'profile_view', 'business', businessId, { 
    source: 'map_search_click',
    search_type: searchType 
  });
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

# Memory: features/analytics/view-tracking-architecture-v1-0
Updated: 2026-01-28

## Core Principle: Views = Impressions (Card Visibility)

**Views** are tracked when a card becomes VISIBLE to the user (IntersectionObserver impression), NOT when clicking/opening detail pages.

## ALLOWED View Sources

### Event Views - Tracked From:
1. **Feed** (/ or /feed) - boosted events become visible
2. **/ekdiloseis** page - public events discovery
3. **/dashboard-user?tab=events** - user's events section

### Offer Views - Tracked From:
1. **Feed** (/ or /feed) - boosted offers become visible
2. **/offers** page - public offers discovery  
3. **/dashboard-user?tab=offers** - user's offers section

## NOT Tracked (Views are skipped):
- Map (/xartis) - visibility on map does NOT count as view
- Business profiles (/business/:id) - NOT tracked
- My Reservations tab (/dashboard-user?tab=reservations)
- Settings tab (/dashboard-user?tab=settings)
- Any other pages

## Profile Views (engagement_events)
- **TRACKED AT**: `src/pages/BusinessProfile.tsx` when page loads
- Uses `trackEngagement(businessId, 'profile_view', 'business', businessId)`
- **NOT tracked** from /dashboard-user/* (any tab)

## Technical Implementation
- `src/lib/analyticsTracking.ts` - Central source filtering logic
- `isAllowedEventViewSource()` - Checks current URL path + tab parameter
- `isAllowedOfferViewSource()` - Checks current URL path + tab parameter
- `useViewTracking` hook - IntersectionObserver for impression detection

## Components Using View Tracking
- `UnifiedEventCard.tsx` - calls `trackEventView` on visibility
- `OfferCard.tsx` - calls `trackDiscountView` on visibility
- `BoostedContentSection.tsx` - OfferCard calls `trackDiscountView` on visibility

## Analytics Dashboard Data Sources
- **Event Views**: `event_views` table
- **Offer Views**: `discount_views` table
- **Profile Views**: `engagement_events` where `event_type = 'profile_view'`
- **Boosted Views**: Views with `source = 'feed'` (from Feed only)
- **Organic Views**: Views with `source = 'direct'` (from /offers or /ekdiloseis)

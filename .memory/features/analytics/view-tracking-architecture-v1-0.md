# Memory: features/analytics/view-tracking-architecture-v1-0
Updated: 2026-01-29

## Core Principle: Views = Impressions (Card Visibility) OR Search Clicks

**Views** are tracked when:
1. A card becomes VISIBLE to the user (IntersectionObserver impression) from allowed pages
2. User CLICKS on a search result (Global Search or Map Search)

## ALLOWED View Sources

### Event Views - Tracked From:
1. **Feed** (/ or /feed) - boosted events become visible
2. **/ekdiloseis** page - public events discovery
3. **/dashboard-user?tab=events** - user's events section
4. **Global Search** - ONLY when user CLICKS on event result

### Offer Views - Tracked From:
1. **Feed** (/ or /feed) - boosted offers become visible
2. **/offers** page - public offers discovery  
3. **/dashboard-user?tab=offers** - user's offers section
4. **Global Search** - ONLY when user CLICKS on offer result

### Business Profile Views - Tracked From:
1. **Global Search** - view when result APPEARS + click interaction when CLICKED
2. **Map Search** - ONLY when user CLICKS on result (appearance does NOT count)

## NOT Tracked (Views are skipped):
- Map search (/xartis) - appearing in search results does NOT count as view
  - View is ONLY counted when user CLICKS on the search result (navigates to pin)
- Business profiles (/business/:id) - NOT tracked for additional views
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
- `trackEventSearchClick()` - Tracks event view on global search click
- `trackOfferSearchClick()` - Tracks offer view on global search click
- `useViewTracking` hook - IntersectionObserver for impression detection

## Components Using View Tracking
- `UnifiedEventCard.tsx` - calls `trackEventView` on visibility
- `OfferCard.tsx` - calls `trackDiscountView` on visibility
- `BoostedContentSection.tsx` - OfferCard calls `trackDiscountView` on visibility
- `GlobalSearch.tsx` - calls `trackEventSearchClick`/`trackOfferSearchClick` on CLICK

## Analytics Dashboard Data Sources
- **Event Views**: `event_views` table (includes source='search' for search clicks)
- **Offer Views**: `discount_views` table (includes source='search' for search clicks)
- **Profile Views**: `engagement_events` where `event_type = 'profile_view'`
- **Boosted Views**: Views with `source = 'feed'` (from Feed only)
- **Organic Views**: Views with `source = 'direct'` (from /offers or /ekdiloseis)
- **Search Views**: Views with `source = 'search'` (from global search clicks)

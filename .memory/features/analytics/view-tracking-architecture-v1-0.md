# Memory: features/analytics/view-tracking-architecture-v1-0
Updated: 2026-01-18

## Core Principle: Views ≠ Clicks

**Views** are tracked ONLY when a user opens/navigates to the content page. Views are NOT tracked when a card is visible in a feed or list.

**Interactions** (clicks, follows, shares) are tracked separately and do NOT count as views.

## View Tracking Locations

### Profile Views
- **TRACKED AT**: `src/pages/BusinessProfile.tsx` when the page loads
- Uses `trackEngagement(businessId, 'profile_view', 'business', businessId)`
- **NOT tracked** when profile card is visible in feed or map

### Event Views
- **TRACKED AT**: `src/pages/EventDetail.tsx` when the page loads
- Uses `trackEventView(eventId, 'direct')`
- **NOT tracked** when event card is visible in feed (UnifiedEventCard, FeaturedEventCard)

### Offer/Discount Views
- **TRACKED AT**: `src/components/user/OfferPurchaseDialog.tsx` when dialog opens
- Uses `trackDiscountView(offer.id, 'direct')`
- **NOT tracked** when offer card is visible in feed (OfferCard)

## Interaction Tracking

### Profile Interactions
- Follow: `business_followers` table
- Share: `trackEngagement(businessId, 'share', 'business', businessId)`
- Click from map: `trackEngagement(businessId, 'profile_click', 'business', businessId, { source: 'map' })`

### Event Interactions
- RSVP (Interested/Going): `rsvps` table
- Click on card: navigates to EventDetail (which triggers view)

### Offer Interactions
- Redeem click: `trackOfferRedeemClick(businessId, discountId, source)`

## Cards DO NOT Track Views

The following components do NOT track views (only navigation to detail pages):
- `UnifiedEventCard.tsx` - no view tracking
- `FeaturedEventCard.tsx` - no view tracking
- `OfferCard.tsx` - no view tracking
- `BusinessDirectorySection.tsx` (BusinessCard) - no view tracking

## Analytics Hooks Data Sources

- **Profile Views**: `engagement_events` where `event_type = 'profile_view'`
- **Offer Views**: `discount_views` table
- **Event Views**: `event_views` table
- **Total Views** (Overview): Sum of profile + offer + event views

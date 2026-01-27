# Memory: features/analytics/view-tracking-architecture-v1-2
Updated: 2026-01-27

## Core Principle: Views ≠ Interactions ≠ Visits

**Views** = User SEES the business/offer/event content (passive impression)
**Interactions** = User CLICKS or ENGAGES actively with the content
**Visits** = User PHYSICALLY VISITS the business (verified via QR scan)

---

## PROFILE TRACKING

### Profile Views (Προβολές Προφίλ)
**Definition**: User sees the business profile card/info

**Tracked Sources**:
1. **Feed visibility** - Card becomes visible in feed (`source: 'feed'`)
2. **Map pin click** - User clicks on business pin on map (`source: 'map_pin_click'`)
3. **Map list visibility** - Business appears in the business list sheet on map (`source: 'map_list_visibility'`)
4. **Search results** - Business appears in search results (visibility)

**Tracking Location**: 
- `src/components/feed/BusinessDirectorySection.tsx` - via `useViewTracking` on card visibility
- `src/components/map/RealMap.tsx` - on pin click (onClick handler)
- `src/components/map/BusinessListSheet.tsx` - when sheet opens and businesses become visible

**Database**: `engagement_events` where `event_type = 'profile_view'`

**NOT Views**:
- Clicking on profile card (that's interaction)
- Following a business (that's interaction)
- Sharing a profile (tracked separately)

### Profile Interactions (Αλληλεπιδράσεις Προφίλ)
**Definition**: User actively engages with the profile

**Tracked Sources**:
1. **Click on profile card** - Opens business profile page (`source: 'feed'`)
2. **Click "Προφίλ" badge on map** - From business list in map (`source: 'map_list_badge'`)
3. **Follow/Like business** - `event_type: 'favorite'`
4. **Direct URL navigation** - User navigates via link (`source: 'direct_navigation'`)

**Tracking Location**:
- `src/components/feed/BusinessDirectorySection.tsx` - onClick handler (`profile_click`)
- `src/components/map/RealMap.tsx` - handleBusinessListClick (`profile_interaction`)
- `src/pages/BusinessProfile.tsx` - useEffect on page load (`profile_click`)
- `src/components/business/FollowButton.tsx` - follow action (`favorite`)

**Database**: 
- `engagement_events` where `event_type IN ('profile_click', 'profile_interaction', 'favorite')`
- `business_followers` table (for follow count)

**NOT Interactions**:
- Just seeing the profile (that's a view)
- Shares (tracked separately, not counted as interaction)

### Profile Visits (Επισκέψεις Προφίλ)
**Definition**: User physically visits the business (verified)

**Tracked via**: QR code scan from a reservation made through the business profile

**Database**: `reservations.checked_in_at` where `event_id IS NULL`

---

## OFFER TRACKING

### Offer Views
- User sees the offer dialog/page
- Tracked in `discount_views` table

### Offer Interactions  
- User clicks "Εξαργύρωσε" button
- Tracked as `offer_redeem_click` in `engagement_events`

### Offer Visits
- User redeems offer at the business
- Tracked in `offer_purchases.redeemed_at`

---

## EVENT TRACKING

### Event Views
- User sees the event detail page
- Tracked in `event_views` table

### Event Interactions
- User RSVPs (Interested or Going)
- Tracked in `rsvps` table

### Event Visits
- User checks in at event (ticket scan or reservation check-in)
- Tracked in `tickets.checked_in_at` + `reservations.checked_in_at` where event_id matches

---

## MAP-SPECIFIC RULES

1. **Opening map page**: NO tracking
2. **Seeing pins without clicking**: NO tracking  
3. **Clicking on a pin**: `profile_view` with `source: 'map_pin_click'`
4. **Clicking "Προφίλ" badge from business list**: `profile_interaction` with `source: 'map_list_badge'`
5. **Clicking "Οδηγίες" badge**: Opens navigation (no tracking needed)

---

## FOLLOWER COUNT VISIBILITY

As of 2026-01-27, follower counts are publicly visible to all users via RLS policy:
- `"Anyone can count followers per business"` with `USING (true)`

This allows the FollowButton component to display the correct follower count to all visitors.

---

## ANALYTICS TAB CONSISTENCY

| Tab | Profile | Offers | Events |
|-----|---------|--------|--------|
| Overview | Sum of all views | - | - |
| Performance | Views + Interactions + Visits | Views + Interactions + Visits | Views + Interactions + Visits |
| Boost Value | Split by subscription status | Split by boost status | Split by boost status |
| Guidance | All data for best times analysis | All data for best times analysis | All data for best times analysis |

**Integrity Rules**:
1. Overview.totalViews = Performance.profile.views + Performance.offers.views + Performance.events.views
2. BoostValue.without + BoostValue.with = Performance.total (per category)
3. Guidance totals = Performance totals

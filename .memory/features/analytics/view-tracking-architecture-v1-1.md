# Memory: features/analytics/view-tracking-architecture-v1-1
Updated: 2026-01-25

## Core Principle: Views ≠ Clicks ≠ Interactions

**Views** are ONLY impressions - when a user SEES the content page visually. NOT clicks.
**Interactions** are active engagements - follows, clicks, redeems, RSVPs.
**Visits** are verified physical presence via QR scan.

## View Definition by Content Type

### Profile Views
- **Definition**: User sees the business profile page visually
- **Sources**: Feed, map pin click, search results, shared link
- **Tracked in**: `engagement_events` where `event_type = 'profile_view'`
- **NOT counted as views**: Clicking on profile (that's interaction), following, sharing

### Offer Views  
- **Definition**: User sees the offer detail page/dialog visually
- **Sources**: Offers section, feed (boosted), profile page, shared link
- **Tracked in**: `discount_views` table
- **NOT counted as views**: Clicking "Εξαργύρωσε" (that's interaction)

### Event Views
- **Definition**: User sees the event detail page visually
- **Sources**: Events section, feed (boosted), profile page, shared link, map
- **Tracked in**: `event_views` table
- **NOT counted as views**: RSVP Interested/Going (that's interaction)

## Interaction Definition (UPDATED - NO SHARES)

### Profile Interactions
- **Definition**: Active engagement with profile
- **Includes**: 
  - Follows (`business_followers`)
  - Profile clicks (`profile_click`, `profile_interaction` in engagement_events)
- **EXCLUDES**: Shares (shares are tracked separately but NOT counted as profile interactions)

### Offer Interactions
- **Definition**: Intent to use offer
- **Includes**: Clicks on "Εξαργύρωσε" button (`offer_redeem_click`)
- **NOT views**: Seeing the offer is a view, clicking redeem is interaction

### Event Interactions
- **Definition**: User interest in attending
- **Includes**: RSVPs - "Ενδιαφέρομαι" or "Θα πάω"
- **NOT views**: Seeing the event is a view, RSVP is interaction

## Map Tracking Rules

The map is EXCLUSIVELY for business profiles (not offers/events).

- **Just opening map**: NO tracking (not a view)
- **Seeing pins without clicking**: NO tracking (not a view)
- **Clicking on a pin**: `profile_view` with `source: 'map'`
- **Clicking profile from cluster list**: `profile_interaction` with `source: 'map_list'`

## Analytics Tab Consistency

All tabs MUST use the same underlying data sources and produce consistent totals:

### Overview Tab (useOverviewMetrics)
- **Total Views** = Profile Views + Offer Views + Event Views
- Shows the sum of ALL views from all sources

### Performance Tab (usePerformanceMetrics)
- **Profile Views**: Total profile views from engagement_events
- **Profile Interactions**: Follows + profile clicks (NO shares)
- **Offer Views**: Total offer views from discount_views
- **Offer Interactions**: Redeem button clicks
- **Event Views**: Total event views from event_views
- **Event Interactions**: RSVPs (Interested + Going)
- Sum of views MUST equal Overview's Total Views

### Boost Value Tab (useBoostValueMetrics)
- **Profile**: Splits by subscription status
  - Non-Featured (μη επιλεγμένο): Views when on FREE plan
  - Featured (επιλεγμένο): Views when on PAID plan
  - `without + with = Performance.profile.views`
- **Offers**: Splits by boost timing
  - Without Boost: Views when offer had NO active boost at that moment
  - With Boost: Views when offer HAD active boost at that moment
  - `without + with = Performance.offers.views`
- **Events**: Same as offers
  - `without + with = Performance.events.views`

### Guidance Tab (useGuidanceData)
- Uses ALL views (no splitting) to analyze best times/days
- **profileTotals.views** = Same as Performance Profile Views
- **offerTotals.views** = Same as Performance Offer Views
- **eventTotals.views** = Same as Performance Event Views
- Displays total count next to each metric name

## Data Integrity Rules

1. **Totals MUST match**: Overview.totalViews = Performance.profile + Performance.offers + Performance.events
2. **Boost Value splits MUST sum**: BoostValue.without + BoostValue.with = Performance.total (for each category)
3. **Guidance totals MUST match Performance**: Guidance.profileTotals.views = Performance.profile.views
4. **No double counting**: Each view/interaction is counted exactly once
5. **Historical accuracy**: Boost status is checked at the time of the view, not current status

## Visit Tracking (CRITICAL)

Visits are tracked consistently across tabs using these sources:

- **Profile Visits**: `reservations.checked_in_at` where `event_id IS NULL`
- **Offer Visits**: `offer_purchases.redeemed_at` (NOT discount_scans)
- **Event Visits**: `tickets.checked_in_at` + `reservations.checked_in_at` where event_id matches

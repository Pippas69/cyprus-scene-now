# Memory: features/analytics/view-tracking-architecture-v1-1
Updated: 2026-01-25

## Core Principle: Views ≠ Clicks

**Views** are tracked when a user SEES the content from any source (feed, map, search, shares, etc.). Views are NOT clicks - they are impressions/appearances.

## View Definition by Content Type

### Profile Views
- **Definition**: User sees the business profile page from anywhere
- **Sources**: Feed, map pin click, search results, shared link
- **Tracked in**: `engagement_events` where `event_type = 'profile_view'`
- **NOT counted**: Clicks on buttons within the profile

### Offer Views  
- **Definition**: User sees the offer detail page/dialog from anywhere
- **Sources**: Offers section, feed (boosted), profile page, shared link
- **Tracked in**: `discount_views` table
- **NOT counted**: Seeing offer card in a list without opening

### Event Views
- **Definition**: User sees the event detail page from anywhere
- **Sources**: Events section, feed (boosted), profile page, shared link, map
- **Tracked in**: `event_views` table
- **NOT counted**: Seeing event card in feed without opening

## Analytics Tab Consistency

All tabs MUST use the same underlying data sources and produce consistent totals:

### Overview Tab (useOverviewMetrics)
- **Total Views** = Profile Views + Offer Views + Event Views
- Shows the sum of ALL views from all sources

### Performance Tab (usePerformanceMetrics)
- **Profile Views**: Total profile views from engagement_events
- **Offer Views**: Total offer views from discount_views
- **Event Views**: Total event views from event_views
- Sum of these three MUST equal Overview's Total Views

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
  - Without Boost: Views when event had NO active boost at that moment
  - With Boost: Views when event HAD active boost at that moment
  - `without + with = Performance.events.views`

### Guidance Tab (useGuidanceData)
- Uses ALL views (no splitting) to analyze best times/days
- **profileTotals.views** = Same as Performance Profile Views
- **offerTotals.views** = Same as Performance Offer Views
- **eventTotals.views** = Same as Performance Event Views
- Displays total count next to each metric name (e.g., "150 Προβολές")

## Boost Period Detection

For offers and events, views are split based on whether the view timestamp falls within any boost period:

```
isWithinBoostPeriod = boost.start_date <= view.timestamp <= boost.end_date
```

This checks ALL boost statuses (active, completed, canceled, etc.) to properly categorize historical views.

## Data Integrity Rules

1. **Totals MUST match**: Overview.totalViews = Performance.profile + Performance.offers + Performance.events
2. **Boost Value splits MUST sum**: BoostValue.without + BoostValue.with = Performance.total (for each category)
3. **Guidance totals MUST match Performance**: Guidance.profileTotals.views = Performance.profile.views (and same for offers/events)
4. **No double counting**: Each view is counted exactly once
5. **Historical accuracy**: Boost status is checked at the time of the view, not current status

## Visit Tracking (CRITICAL)

Visits are tracked consistently across tabs using these sources:

- **Profile Visits**: `reservations.checked_in_at` where `event_id IS NULL`
- **Offer Visits**: `offer_purchases.redeemed_at` (NOT discount_scans)
- **Event Visits**: `tickets.checked_in_at` + `reservations.checked_in_at` where event_id matches

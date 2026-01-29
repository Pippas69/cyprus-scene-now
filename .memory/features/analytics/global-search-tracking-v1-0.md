# Memory: features/analytics/global-search-tracking-v1-0
Updated: 2026-01-29

## Global Search Tracking Rules

The Global Search (not Map Search) searches across **businesses**, **events**, and **offers**.

### Tracking Logic by Result Type

| Type | On Appearance | On Click |
|------|---------------|----------|
| **Business** | `profile_view` (trackSearchResultView) | `profile_click` (trackSearchResultClick) - counts as interaction |
| **Event** | Nothing | `event_view` with source='search' (trackEventView) - counts as view |
| **Offer** | Nothing | `discount_view` with source='search' (trackDiscountView) - counts as view |

### Key Points

1. **Businesses**: Appearing in search results = profile view. Clicking = profile interaction.
2. **Events & Offers**: ONLY clicking counts as a view. Appearing in search results does NOT count.
3. The `search` source bypasses the normal `isAllowedEventViewSource()` and `isAllowedOfferViewSource()` checks.
4. Navigation state includes `analyticsTracked: true` to prevent double-tracking on destination pages.

### Search Function

The database function `search_content` returns:
- `result_type`: 'business' | 'event' | 'offer'
- `business_id`: UUID (populated for events and offers, links to parent business)
- Other fields: name, title, logo_url, cover_image_url, city, location, start_at, category, etc.

### Navigation Destinations

- Business: `/business/{id}` with `analyticsTracked: true`
- Event: `/event/{id}` with `analyticsTracked: true`
- Offer: `/business/{business_id}` with `highlightOfferId: {offer_id}` (navigates to business profile)

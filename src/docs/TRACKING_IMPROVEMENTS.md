# Analytics Tracking Improvements

## Overview
Comprehensive improvements to analytics tracking across all business content to ensure accurate data collection and reporting.

## Changes Implemented

### 1. **Enhanced Event View Tracking**
- **Location**: `src/components/EventCard.tsx`, `src/pages/EventDetail.tsx`
- **Improvement**: Dynamic source detection based on URL path
- **Sources tracked**: `feed`, `map`, `search`, `profile`, `direct`
- **Method**: Intersection Observer API (50% visibility threshold)

### 2. **Fixed Discount/Offer View Tracking**
- **Location**: `src/components/OfferCard.tsx`
- **Issue**: Discount views were not being tracked properly (0 records in database)
- **Fix**: 
  - Added dynamic source detection
  - Proper error handling for failed tracking attempts
  - Sources: `feed`, `profile`, `direct`
- **Impact**: Now accurately tracks when users view discount offers

### 3. **Improved Discount Scan Tracking**
- **Location**: `src/hooks/useDiscountScanStats.ts`, `src/components/user/MyOffers.tsx`
- **Improvements**:
  - Added `scanned_by` user_id tracking
  - Better error handling with try-catch blocks
  - Automatic stats refresh after scan tracking
  - Proper scan type categorization: `view`, `verify`, `redeem`

### 4. **Analytics Tracking Library Enhancements**
- **Location**: `src/lib/analyticsTracking.ts`
- **Changes**:
  - Added comprehensive error handling
  - Error logging for debugging
  - Graceful failure (doesn't break user experience if tracking fails)
  - Consistent error messages

### 5. **Business Profile Tracking**
- **Location**: `src/pages/BusinessProfile.tsx`
- **Current tracking**:
  - Profile views
  - Phone clicks
  - Website clicks
  - Event and offer views (via components)

## Tracking Architecture

### Event Tracking Flow
```
User views event card (50% visible)
  ↓
EventCard detects visibility (Intersection Observer)
  ↓
Determines source from URL path
  ↓
Calls trackEventView(eventId, source)
  ↓
Inserts into event_views table
  ↓
Analytics dashboard aggregates data
```

### Discount Tracking Flow
```
User views discount card (50% visible)
  ↓
OfferCard detects visibility
  ↓
Determines source from URL path
  ↓
Calls trackDiscountView(discountId, source)
  ↓
Inserts into discount_views table
  ↓
Analytics dashboard shows view stats
```

### Scan Tracking Flow
```
User opens QR code
  ↓
MyOffers component tracks 'view' scan
  ↓
Business scans for verification → 'verify' scan
  ↓
Business confirms redemption → 'redeem' scan
  ↓
All tracked in discount_scans table
  ↓
QR Scan Analytics component displays stats
```

## Database Tables Used

### event_views
- `event_id`: Event being viewed
- `user_id`: User viewing (null for anonymous)
- `source`: Where the view came from
- `device_type`: mobile/tablet/desktop
- `session_id`: Unique session identifier
- `viewed_at`: Timestamp

### discount_views
- `discount_id`: Discount being viewed
- `user_id`: User viewing (null for anonymous)
- `source`: Where the view came from
- `device_type`: mobile/tablet/desktop
- `session_id`: Unique session identifier
- `viewed_at`: Timestamp

### discount_scans
- `discount_id`: Discount QR code scanned
- `scanned_by`: User who scanned (null for business scans)
- `scan_type`: 'view', 'verify', or 'redeem'
- `success`: Whether scan was successful
- `scanned_at`: Timestamp
- `device_info`: Optional device metadata
- `location_info`: Optional location metadata

## Accuracy Improvements

### Before
- Event views: ✅ Tracked (but no source differentiation)
- Discount views: ❌ Not tracked (0 in database)
- Discount scans: ⚠️ Partially tracked (missing user attribution)
- Engagement events: ✅ Tracked

### After
- Event views: ✅ Fully tracked with source attribution
- Discount views: ✅ Fully tracked with source attribution
- Discount scans: ✅ Fully tracked with user attribution
- Engagement events: ✅ Enhanced with better error handling

## Testing Recommendations

1. **Verify Event Tracking**:
   - View events in feed → Check `event_views` with `source='feed'`
   - View events on map → Check `event_views` with `source='map'`
   - Open event detail → Check `event_views` with `source='direct'`

2. **Verify Discount Tracking**:
   - View offers in feed → Check `discount_views` with `source='feed'`
   - View offers on business profile → Check `discount_views` with `source='profile'`

3. **Verify Scan Tracking**:
   - Open QR code → Check `discount_scans` with `scan_type='view'`
   - Business scans QR → Check `discount_scans` with `scan_type='verify'`

## Next Steps

1. **Add Real-time Updates**: Consider adding real-time subscription to analytics updates
2. **Add Export Functionality**: Allow businesses to export their analytics data
3. **Add Data Retention Policy**: Define how long to keep analytics data
4. **Add Privacy Controls**: Allow users to opt-out of certain tracking
5. **Add A/B Testing**: Track different versions of content to optimize engagement

## Performance Considerations

- Intersection Observer is efficient and doesn't impact scroll performance
- All tracking is async and doesn't block user interactions
- Failed tracking attempts fail silently and don't affect UX
- Database inserts are lightweight (< 1KB per record)

## Privacy & GDPR Compliance

- User IDs are nullable (anonymous users are tracked)
- Session IDs are temporary and don't contain PII
- Device type is generic (mobile/tablet/desktop)
- No IP addresses or precise location data stored
- Users can be excluded from tracking if needed

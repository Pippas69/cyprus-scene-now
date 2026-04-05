-- =====================================================
-- PERFORMANCE INDEXES - Phase 1
-- =====================================================

-- 1. EVENTS: business_id
CREATE INDEX IF NOT EXISTS idx_events_business_id 
ON public.events (business_id);

-- 2. EVENTS: composite for dashboard
CREATE INDEX IF NOT EXISTS idx_events_business_start 
ON public.events (business_id, start_at DESC);

-- 3. DISCOUNTS: business_id
CREATE INDEX IF NOT EXISTS idx_discounts_business_id 
ON public.discounts (business_id);

-- 4. DISCOUNTS: composite for active offers
CREATE INDEX IF NOT EXISTS idx_discounts_business_active 
ON public.discounts (business_id, active, end_at DESC);

-- 5. DISCOUNTS: date range queries
CREATE INDEX IF NOT EXISTS idx_discounts_start_at 
ON public.discounts (start_at);

CREATE INDEX IF NOT EXISTS idx_discounts_end_at 
ON public.discounts (end_at);

-- 6. BUSINESSES: city filtering
CREATE INDEX IF NOT EXISTS idx_businesses_city 
ON public.businesses (city);

-- 7. TICKET_ORDERS: sales dashboard
CREATE INDEX IF NOT EXISTS idx_ticket_orders_event_status 
ON public.ticket_orders (event_id, status);

-- 8. TICKET_ORDERS: time sorting
CREATE INDEX IF NOT EXISTS idx_ticket_orders_created_at 
ON public.ticket_orders (created_at DESC);

-- 9. NOTIFICATIONS: sorted list
CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
ON public.notifications (user_id, created_at DESC);

-- 10. ENGAGEMENT_EVENTS: analytics
CREATE INDEX IF NOT EXISTS idx_engagement_type_date 
ON public.engagement_events (event_type, created_at DESC);

-- 11. RESERVATIONS: business dashboard
CREATE INDEX IF NOT EXISTS idx_reservations_business_status 
ON public.reservations (business_id, status);

-- 12. RESERVATIONS: time sorting
CREATE INDEX IF NOT EXISTS idx_reservations_created_at 
ON public.reservations (created_at DESC);

-- 13. REDEMPTIONS: discount counts
CREATE INDEX IF NOT EXISTS idx_redemptions_discount_id 
ON public.redemptions (discount_id);

-- 14. REDEMPTIONS: user history
CREATE INDEX IF NOT EXISTS idx_redemptions_user_id 
ON public.redemptions (user_id);
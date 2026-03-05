
-- Fix existing tickets: update tier_id to match seat_zone
UPDATE tickets t
SET tier_id = tt.id
FROM ticket_tiers tt
WHERE t.seat_zone IS NOT NULL
  AND t.seat_zone != (SELECT name FROM ticket_tiers WHERE id = t.tier_id)
  AND tt.event_id = t.event_id
  AND tt.name = t.seat_zone;


-- Fix unique constraint to include zone_id (same seat number can exist in different zones)
ALTER TABLE venue_seats DROP CONSTRAINT IF EXISTS venue_seats_venue_id_row_label_seat_number_key;
ALTER TABLE venue_seats ADD CONSTRAINT venue_seats_venue_zone_row_seat_key UNIQUE (venue_id, zone_id, row_label, seat_number);

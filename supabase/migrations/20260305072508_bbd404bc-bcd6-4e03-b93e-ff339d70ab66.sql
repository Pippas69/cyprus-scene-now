-- Fan-shape correction for left section (Αριστερά)
-- Shift seats LEFT progressively from front (y=920) to back (y=200)
-- Left section zone_id: 830a5897-829b-41fc-abb7-eea98a10ee07
UPDATE venue_seats
SET x = x - ROUND(((920.0 - y) / 720.0) * 55)
WHERE venue_id = 'f2431e30-9815-4c3f-a970-6eb2e0ca67d6'
  AND zone_id = '830a5897-829b-41fc-abb7-eea98a10ee07'
  AND is_active = true;

-- Fan-shape correction for right section (Δεξιά)
-- Shift seats RIGHT progressively from front (y=920) to back (y=200)
-- Right section zone_id: dc24b05e-10db-4fc8-96e1-8909486a7532
UPDATE venue_seats
SET x = x + ROUND(((920.0 - y) / 720.0) * 55)
WHERE venue_id = 'f2431e30-9815-4c3f-a970-6eb2e0ca67d6'
  AND zone_id = 'dc24b05e-10db-4fc8-96e1-8909486a7532'
  AND is_active = true;
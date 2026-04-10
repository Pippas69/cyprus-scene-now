

## Plan: Fix Section Δ seat counts and Row M alignment

### Two issues to fix

**1. Wrong seat counts in database (7 rows affected)**

The database has fewer seats than the actual theatre for most outer rows in Section Δ. Current vs correct:

| Row | Current DB | Correct | Seats to add |
|-----|-----------|---------|-------------|
| Σ | 59-74 (16) | 59-82 (24) | 75-82 (+8) |
| Ρ | 56-72 (17) | 56-78 (23) | 73-78 (+6) |
| Π | 55-71 (17) | 55-76 (22) | 72-76 (+5) |
| Ο | 54-69 (16) | 54-74 (21) | 70-74 (+5) |
| Ξ | 53-68 (16) | 53-72 (20) | 69-72 (+4) |
| Ν | 52-67 (16) | 52-70 (19) | 68-70 (+3) |
| Μ | 51-66 (16) | 51-68 (18) | 67-68 (+2) |
| Ι | 40-52 (13) | 40-53 (14) | 53 (+1) |

**Fix:** Database migration to INSERT the missing seat records into `venue_seats` for zone `Τμήμα Δ` (zone_id: `16551c22-6eda-4978-855c-f8dfdb9dc30b`).

**2. Row M starts too far inside**

With the current short-row detection (`< 60% of max nearby`), Row M (18 seats after fix) next to Λ (8) and Κ (4) may be getting classified oddly by the smoothing/reference logic. After fixing the seat counts, the `maxNearby` and `smoothedCount` values will change since rows will now have more seats. This should naturally fix Row M's alignment. If not, a small tweak to the smoothing window or short-row threshold in `ZoneSeatPicker.tsx` will be needed.

Also need to update the zone capacity in `venue_zones` table to reflect the new total.

### Steps

1. **Database migration**: Insert missing seats for rows Σ, Ρ, Π, Ο, Ξ, Ν, Μ, and Ι in Section Δ (34 new seats total)
2. **Update zone capacity**: Update `venue_zones` capacity for Τμήμα Δ from current value to current + 34
3. **Verify Row M alignment**: After the data fix, check if Row M aligns correctly. If not, adjust the smoothing logic in `ZoneSeatPicker.tsx`

### Technical details

- Zone ID: `16551c22-6eda-4978-855c-f8dfdb9dc30b`
- All new seats will be `seat_type = 'regular'`, `is_active = true`
- Seat labels will match seat numbers as strings
- Rows Κ and Λ will NOT be touched




# Populate Correct Pattihio Seat Data (2,017 seats)

## What This Does
Deletes all incorrect seat data for the Pattihio venue and inserts exactly 2,017 seats with the correct row-by-row seat number ranges you provided. No UI or layout changes — only database data.

## Steps

### 1. Delete all existing seats for Pattihio zones
Remove all ~2,725 incorrect seats from `venue_seats` for all 9 zones (including Πλατεία).

### 2. Delete the Πλατεία zone
Remove zone `88cfdd26-77b6-4edd-a0aa-cce66df2b5d1` — it's not part of the real layout.

### 3. Insert 2,017 correct seats
Using a Python script to generate and execute INSERT statements with the exact data:

| Section | Zone ID | Total |
|---------|---------|-------|
| Α | `aa9b38d1...` | 206 |
| Β | `64cbf972...` | 269 |
| Γ | `b03afd3a...` | 267 |
| Δ | `16551c22...` | 249 |
| Ε | `2692ac39...` | 270 |
| Ζ | `e3b5b0e6...` | 268 |
| Η | `84b46333...` | 271 |
| Θ | `6fe669bd...` | 217 |

Each seat: `row_label`, `seat_number`, `seat_label` (format "Τμ.Α Σειρά Σ Θέση 1"), `seat_type`="regular", `is_active`=true, `x`=0, `y`=0.

### 4. Verify totals
Query to confirm 2,017 seats with correct per-zone counts.

## What Won't Change
- Zone arc geometry, horseshoe shape, row letters, row placement
- ZoneSeatPicker rendering logic
- Any UI components


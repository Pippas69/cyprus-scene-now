

## Plan: Row Λ truncation and Row Κ AMEA seats in Section Δ

### What will change

**1. Row Λ (Lambda) — Section Δ only**
- Currently renders all seats in Row Λ for the zone. The DB data for Section Δ Row Λ should contain only seats 49–56 (8 seats). If extra seats exist, they will be removed via a DB migration. The visual rendering already respects DB data, so if the data is correct, no code change is needed for this row — I will verify first.

**2. Row Κ (Kappa) — Section Δ only**
- The DB already stores 4 AMEA seats in Row Κ of Section Δ (per project memory).
- Code change in `ZoneSeatPicker.tsx`: detect seats with `seat_type = 'wheelchair'` (or similar) and render a ♿ symbol instead of the seat number inside the circle. The circle styling will also be slightly different to visually distinguish AMEA seats.

### Files to modify

- **`src/components/theatre/ZoneSeatPicker.tsx`** — Add wheelchair icon rendering for AMEA-type seats (replace seat number text with ♿ symbol)

### Steps

1. Query the DB to verify Row Λ Section Δ has exactly seats 49–56, and Row Κ Section Δ has exactly 4 seats with a wheelchair/AMEA seat type. Fix data if needed via migration.
2. In `ZoneSeatPicker.tsx`, in the seat rendering loop (~line 570–638), check `seat.seat_type` — if it indicates wheelchair/AMEA, render ♿ instead of the seat number.
3. Build and verify.


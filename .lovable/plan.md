

## Plan: Fix seat counts showing 0 for sections E, Z, H, Θ

### Root cause

The Supabase PostgREST server has a `max_rows` limit of 1000. Even though the code uses `.limit(5000)`, only 1000 rows are actually returned. The venue has 2017 horseshoe seats, so queries fetching all `venue_seats` at once silently truncate after 1000 rows. Sections A-D get counted correctly (their seats come first), but sections E, Z, H, Θ (later in the result set) get 0 because their seat rows never arrive.

This same truncation causes:
1. **"0 available"** on the overview map for E, Z, H, Θ
2. **"Selected 0 of 1000"** in the top-right counter (only 1000 seats counted)
3. **Wrong parenthesis counts** in zone pricing for those same sections

### Fix: Paginate venue_seats queries

Create a shared helper that fetches all rows by paginating in batches of 1000, then use it in both affected files.

**File 1: `src/lib/fetchAllRows.ts`** (new)
- A generic helper that fetches all rows from a Supabase query by paginating (range 0-999, 1000-1999, etc.) until fewer than 1000 rows are returned.

**File 2: `src/components/theatre/ZoneOverviewMap.tsx`**
- Replace the single `.limit(5000)` venue_seats query with the paginated helper
- This fixes the "0 available" display for E, Z, H, Θ

**File 3: `src/components/business/productions/ShowInstanceEditor.tsx`**
- Replace the single `.limit(5000)` venue_seats query in the `venue-zones-with-counts` useQuery with the paginated helper
- This fixes the zone pricing parenthesis counts AND the maxSeats total passed to SeatSelectionStep

### What stays the same
- ZoneSeatPicker queries per-zone (max ~278 seats), well under 1000 — no change needed
- All display logic, legend behavior, alignment — unchanged

### Technical detail

```typescript
// src/lib/fetchAllRows.ts
export async function fetchAllRows<T>(
  queryBuilder: any, // SupabaseFilterBuilder
  pageSize = 1000
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  while (true) {
    const { data } = await queryBuilder.range(from, from + pageSize - 1);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}
```

The tricky part: Supabase JS query builders are consumed on execution, so we'll build the query inline in each pagination loop iteration rather than passing a pre-built builder. The helper will accept a function that builds and executes a ranged query.


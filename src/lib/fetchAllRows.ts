import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches all rows from a Supabase table, paginating in batches to bypass
 * the PostgREST max_rows limit (default 1000).
 *
 * @param buildQuery - A function that receives (from, to) range params and
 *   returns a Supabase query builder with .range() already applied.
 * @param pageSize - Number of rows per page (default 1000).
 */
export async function fetchAllRows<T = Record<string, unknown>>(
  buildQuery: (from: number, to: number) => ReturnType<typeof supabase.from>,
  pageSize = 1000
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await (buildQuery(from, from + pageSize - 1) as any);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as T[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

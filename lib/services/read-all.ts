import type { PostgrestError } from '@supabase/supabase-js';

// Supabase caps single responses. Keep metrics and sequence suggestions complete.
export async function readAll<T>(query: { range(from: number, to: number): PromiseLike<{ data: T[] | null; error: PostgrestError | null }> }) {
  const rows: T[] = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const page = await query.range(from, from + pageSize - 1);
    if (page.error) return { data: [] as T[], error: page.error };
    rows.push(...(page.data ?? []));
    if (!page.data || page.data.length < pageSize) return { data: rows, error: null };
  }
}

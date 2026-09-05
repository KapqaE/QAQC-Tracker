import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export const qualityTables = { WIR: 'inspections', MIR: 'mir_records', NCR: 'ncrs', SOR: 'sor_records', RRR: 'rrr_records' } as const;
export type RecordKind = keyof typeof qualityTables;

export async function recordProject(client: SupabaseClient<Database>, kind: RecordKind, id: string) {
  const { data, error } = await client.from(qualityTables[kind]).select('project_id').eq('id', id).maybeSingle();
  return error ? null : data?.project_id ?? null;
}

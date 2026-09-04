import type { SupabaseClient } from '@supabase/supabase-js';

import { serviceError, type ServiceResult } from '@/lib/services/shared';
import type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
} from '@/types/database';

type V2Table = 'mir_records' | 'sor_records' | 'rrr_records';

// Supabase's generated query-builder types do not preserve a generic table-key
// correlation through .from(table). Keep this narrow boundary inside the shared
// CRUD helper while callers retain generated insert/update/row types.
function genericTableClient(client: SupabaseClient<Database>) {
  // oxlint-disable-next-line typescript/no-explicit-any -- Supabase loses generic table correlation at this boundary.
  return client as unknown as SupabaseClient<any>;
}

export async function listV2Records<T extends V2Table>(
  client: SupabaseClient<Database>,
  table: T,
): Promise<ServiceResult<Tables<T>[]>> {
  const { data, error } = await genericTableClient(client)
    .from(table)
    .select('*')
    .order('record_date', { ascending: false });
  return {
    data: (data ?? []) as unknown as Tables<T>[],
    error: error
      ? serviceError(
          error,
          'QA/QC Records V2 could not be loaded. Apply database/006_quality_records_v2.sql in Supabase.',
        )
      : null,
  };
}

export async function getV2Record<T extends V2Table>(
  client: SupabaseClient<Database>,
  table: T,
  id: string,
): Promise<ServiceResult<Tables<T> | null>> {
  const { data, error } = await genericTableClient(client).from(table).select('*').eq('id', id).maybeSingle();
  return {
    data: data as unknown as Tables<T> | null,
    error: error ? serviceError(error, 'The quality record could not be loaded.') : null,
  };
}

export async function createV2Record<T extends V2Table>(
  client: SupabaseClient<Database>,
  table: T,
  values: TablesInsert<T>,
) {
  const { data, error } = await genericTableClient(client).from(table).insert(values).select('id').single();
  return {
    id: data?.id ?? null,
    error: error ? serviceError(error, 'The quality record could not be created.') : null,
  };
}

export async function updateV2Record<T extends V2Table>(
  client: SupabaseClient<Database>,
  table: T,
  id: string,
  values: TablesUpdate<T>,
) {
  const { error } = await genericTableClient(client).from(table).update(values).eq('id', id);
  return error ? serviceError(error, 'The quality record could not be updated.') : null;
}

export async function deleteV2Record<T extends V2Table>(
  client: SupabaseClient<Database>,
  table: T,
  id: string,
) {
  const { error } = await genericTableClient(client).from(table).delete().eq('id', id);
  return error ? serviceError(error, 'The quality record could not be deleted.') : null;
}

export async function listQualityActions(
  client: SupabaseClient<Database>,
  parentType?: string,
  parentId?: string,
) {
  let query = client.from('quality_record_actions').select('*').order('due_date');
  if (parentType) query = query.eq('parent_record_type', parentType);
  if (parentId) query = query.eq('parent_record_id', parentId);
  const { data, error } = await query;
  return {
    data: data ?? [],
    error: error ? serviceError(error, 'Record actions could not be loaded.') : null,
  };
}

export async function getRrrWorkspace(
  client: SupabaseClient<Database>,
  rrrId: string,
) {
  const [readiness, tags, openItems, evidence, attendance, signatories, revisions, attachments, actions] = await Promise.all([
    client.from('rrr_readiness_controls').select('*').eq('rrr_id', rrrId).order('sort_order'),
    client.from('rrr_commissioning_tags').select('*').eq('rrr_id', rrrId).order('created_at'),
    client.from('rrr_open_items').select('*').eq('rrr_id', rrrId).order('item_number'),
    client.from('rrr_evidence').select('*').eq('rrr_id', rrrId).order('created_at'),
    client.from('rrr_attendance').select('*').eq('rrr_id', rrrId).order('attendance_group'),
    client.from('rrr_signatories').select('*').eq('rrr_id', rrrId).order('created_at'),
    client.from('rrr_submission_revisions').select('*').eq('rrr_id', rrrId).order('created_at', { ascending: false }),
    client.from('rrr_linked_attachments').select('*').eq('rrr_id', rrrId).order('created_at'),
    client.from('quality_record_actions').select('*').eq('parent_record_type', 'RRR').eq('parent_record_id', rrrId).order('due_date'),
  ]);
  const error = [readiness.error, tags.error, openItems.error, evidence.error, attendance.error, signatories.error, revisions.error, attachments.error, actions.error].find(Boolean);
  return {
    readiness: readiness.data ?? [], tags: tags.data ?? [], openItems: openItems.data ?? [], evidence: evidence.data ?? [],
    attendance: attendance.data ?? [], signatories: signatories.data ?? [], revisions: revisions.data ?? [], attachments: attachments.data ?? [], actions: actions.data ?? [],
    error: error ? serviceError(error, 'The RRR workspace could not be loaded.') : null,
  };
}

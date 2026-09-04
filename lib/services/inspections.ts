import type { SupabaseClient } from '@supabase/supabase-js';
import { serviceError, type ServiceResult } from '@/lib/services/shared';
import type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
} from '@/types/database';

export async function listInspections(
  client: SupabaseClient<Database>,
): Promise<ServiceResult<Tables<'inspections'>[]>> {
  const { error: migrationError } = await client
    .from('inspections')
    .select(
      'id, wir_number, full_document_code, revision, inspection_item, source_filename',
    )
    .limit(1);
  if (migrationError)
    return {
      data: [],
      error:
        'The WIR PDF metadata migration is required. Run database/004_wir_integration.sql and database/005_wir_pdf_metadata.sql in Supabase.',
    };
  const { data, error } = await client
    .from('inspections')
    .select('*')
    .order('planned_inspection_date', { ascending: false });
  return {
    data: data ?? [],
    error: error
      ? serviceError(error, 'Inspections could not be loaded.')
      : null,
  };
}
export async function createInspection(
  client: SupabaseClient<Database>,
  values: TablesInsert<'inspections'>,
) {
  const { error } = await client.from('inspections').insert(values);
  return error ? serviceError(error, 'Inspection could not be created.') : null;
}
export async function updateInspection(
  client: SupabaseClient<Database>,
  id: string,
  values: TablesUpdate<'inspections'>,
) {
  const { error } = await client
    .from('inspections')
    .update(values)
    .eq('id', id);
  return error ? serviceError(error, 'Inspection could not be updated.') : null;
}
export async function deleteInspection(
  client: SupabaseClient<Database>,
  id: string,
) {
  const { error } = await client.from('inspections').delete().eq('id', id);
  return error ? serviceError(error, 'Inspection could not be deleted.') : null;
}

export async function findInspectionDuplicates(
  client: SupabaseClient<Database>,
  projectId: string,
  wirNumber: string,
  fullDocumentCode: string,
  excludeId?: string,
) {
  let wirQuery = client
    .from('inspections')
    .select('id')
    .eq('project_id', projectId)
    .eq('wir_number', wirNumber);
  let codeQuery = client
    .from('inspections')
    .select('id')
    .eq('full_document_code', fullDocumentCode);
  if (excludeId) {
    wirQuery = wirQuery.neq('id', excludeId);
    codeQuery = codeQuery.neq('id', excludeId);
  }
  const [wirResult, codeResult] = await Promise.all([
    wirQuery.limit(1).maybeSingle(),
    codeQuery.limit(1).maybeSingle(),
  ]);
  const error = wirResult.error ?? codeResult.error;
  return {
    duplicateWirNumber: Boolean(wirResult.data),
    duplicateFullCode: Boolean(codeResult.data),
    error: error
      ? serviceError(error, 'Existing WIR identifiers could not be checked.')
      : null,
  };
}

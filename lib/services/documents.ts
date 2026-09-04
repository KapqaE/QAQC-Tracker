import type { SupabaseClient } from '@supabase/supabase-js';
import { serviceError, type ServiceResult } from '@/lib/services/shared';
import type { Database, Tables, TablesInsert, TablesUpdate } from '@/types/database';

export async function listDocuments(client: SupabaseClient<Database>): Promise<ServiceResult<Tables<'documents'>[]>> {
  const { error: migrationError } = await client.from('documents').select('id, document_code').limit(1);
  if (migrationError) return { data: [], error: 'The Procore document register migration is required. Run database/003_procore_document_register.sql in Supabase.' };
  const { data, error } = await client.from('documents').select('*').order('updated_at', { ascending: false });
  return { data: data ?? [], error: error ? serviceError(error, 'Documents could not be loaded.') : null };
}
export async function createDocument(client: SupabaseClient<Database>, values: TablesInsert<'documents'>) { const { error } = await client.from('documents').insert(values); return error ? serviceError(error, 'Document metadata could not be created.') : null; }
export async function updateDocument(client: SupabaseClient<Database>, id: string, values: TablesUpdate<'documents'>) { const { error } = await client.from('documents').update(values).eq('id', id); return error ? serviceError(error, 'Document metadata could not be updated.') : null; }
export async function deleteDocument(client: SupabaseClient<Database>, id: string) { const { error } = await client.from('documents').delete().eq('id', id); return error ? serviceError(error, 'Document metadata could not be deleted.') : null; }

export async function findDocumentByCode(client: SupabaseClient<Database>, documentCode: string, excludeId?: string) {
  let query = client.from('documents').select('id').eq('document_code', documentCode);
  if (excludeId) query = query.neq('id', excludeId);
  const { data, error } = await query.limit(1).maybeSingle();
  return { exists: Boolean(data), error: error ? serviceError(error, 'The document code could not be checked.') : null };
}

export async function findDocumentIdByCode(client: SupabaseClient<Database>, documentCode: string) {
  const { data, error } = await client.from('documents').select('id').eq('document_code', documentCode).limit(1).maybeSingle();
  return { id: data?.id ?? null, error: error ? serviceError(error, 'The matching Procore document could not be checked.') : null };
}

export async function findExistingDocumentCodes(client: SupabaseClient<Database>, documentCodes: string[]) {
  if (!documentCodes.length) return { data: [] as string[], error: null };
  const { data, error } = await client.from('documents').select('document_code').in('document_code', documentCodes);
  return { data: data?.map((item) => item.document_code).filter((code): code is string => Boolean(code)) ?? [], error: error ? serviceError(error, 'Existing document codes could not be checked.') : null };
}

export async function importDocuments(client: SupabaseClient<Database>, values: TablesInsert<'documents'>[]) {
  const { error } = await client.from('documents').insert(values);
  return error ? serviceError(error, 'The Procore document metadata could not be imported.') : null;
}

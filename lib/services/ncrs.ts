import { readAll } from '@/lib/services/read-all';
import type { SupabaseClient } from '@supabase/supabase-js';
import { serviceError, type ServiceResult } from '@/lib/services/shared';
import type { Database, Tables, TablesInsert, TablesUpdate } from '@/types/database';

export async function listNcrs(client: SupabaseClient<Database>, projectId?: string): Promise<ServiceResult<Tables<'ncrs'>[]>> { let query = client.from('ncrs').select('*').order('due_date', { ascending: true }).order('id'); if (projectId) query = query.eq('project_id', projectId); const { data, error } = await readAll(query); return { data: data ?? [], error: error ? serviceError(error, 'NCRs could not be loaded.') : null }; }
export async function createNcr(client: SupabaseClient<Database>, values: TablesInsert<'ncrs'>) { const { error } = await client.from('ncrs').insert(values); return error ? serviceError(error, 'NCR could not be created.') : null; }
export async function updateNcr(client: SupabaseClient<Database>, id: string, values: TablesUpdate<'ncrs'>) { const { error } = await client.from('ncrs').update(values).eq('id', id); return error ? serviceError(error, 'NCR could not be updated.') : null; }
export async function deleteNcr(client: SupabaseClient<Database>, id: string) { const { error } = await client.from('ncrs').delete().eq('id', id); return error ? serviceError(error, 'NCR could not be deleted.') : null; }

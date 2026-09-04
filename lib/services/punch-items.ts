import type { SupabaseClient } from '@supabase/supabase-js';
import { serviceError, type ServiceResult } from '@/lib/services/shared';
import type { Database, Tables, TablesInsert, TablesUpdate } from '@/types/database';

export async function listPunchItems(client: SupabaseClient<Database>): Promise<ServiceResult<Tables<'punch_items'>[]>> { const { data, error } = await client.from('punch_items').select('*').order('due_date', { ascending: true }); return { data: data ?? [], error: error ? serviceError(error, 'Punch items could not be loaded.') : null }; }
export async function createPunchItem(client: SupabaseClient<Database>, values: TablesInsert<'punch_items'>) { const { error } = await client.from('punch_items').insert(values); return error ? serviceError(error, 'Punch item could not be created.') : null; }
export async function updatePunchItem(client: SupabaseClient<Database>, id: string, values: TablesUpdate<'punch_items'>) { const { error } = await client.from('punch_items').update(values).eq('id', id); return error ? serviceError(error, 'Punch item could not be updated.') : null; }
export async function deletePunchItem(client: SupabaseClient<Database>, id: string) { const { error } = await client.from('punch_items').delete().eq('id', id); return error ? serviceError(error, 'Punch item could not be deleted.') : null; }

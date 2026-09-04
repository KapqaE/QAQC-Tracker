import type { SupabaseClient } from '@supabase/supabase-js';

import { serviceError, type ServiceResult } from '@/lib/services/shared';
import type { Database, Tables, TablesInsert, TablesUpdate } from '@/types/database';

export async function listProjects(client: SupabaseClient<Database>): Promise<ServiceResult<Tables<'projects'>[]>> {
  const { data, error } = await client.from('projects').select('*').order('updated_at', { ascending: false });
  return { data: data ?? [], error: error ? serviceError(error, 'Projects could not be loaded.') : null };
}

export async function createProject(client: SupabaseClient<Database>, values: TablesInsert<'projects'>) {
  const { error } = await client.from('projects').insert(values);
  return error ? serviceError(error, 'Project could not be created.') : null;
}

export async function updateProject(client: SupabaseClient<Database>, id: string, values: TablesUpdate<'projects'>) {
  const { error } = await client.from('projects').update(values).eq('id', id);
  return error ? serviceError(error, 'Project could not be updated.') : null;
}

export async function deleteProject(client: SupabaseClient<Database>, id: string) {
  const { error } = await client.from('projects').delete().eq('id', id);
  return error ? serviceError(error, 'Project could not be deleted.') : null;
}

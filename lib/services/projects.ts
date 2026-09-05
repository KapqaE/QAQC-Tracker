import type { SupabaseClient } from '@supabase/supabase-js';

import { serviceError, type ServiceResult } from '@/lib/services/shared';
import type { Database, Tables, TablesInsert, TablesUpdate } from '@/types/database';

export async function listProjects(client: SupabaseClient<Database>): Promise<ServiceResult<Tables<'projects'>[]>> {
  const { data, error } = await client.from('projects').select('*').order('updated_at', { ascending: false });
  return { data: data ?? [], error: error ? serviceError(error, 'Projects could not be loaded.') : null };
}

export async function createProject(client: SupabaseClient<Database>, values: TablesInsert<'projects'>) {
  const { data, error } = await client.from('projects').insert(values).select('*').single();
  return {
    data,
    error: error ? serviceError(error, 'Project could not be created.') : null,
  };
}

export async function setActiveProject(
  client: SupabaseClient<Database>,
  userId: string,
  projectId: string,
) {
  const { data: project, error: projectError } = await client
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .maybeSingle();

  if (projectError || !project)
    return projectError
      ? serviceError(projectError, 'The selected project could not be verified.')
      : 'The selected project is not available to your account.';

  const { error } = await client
    .from('profiles')
    .update({ active_project_id: projectId })
    .eq('id', userId);
  return error ? serviceError(error, 'The active project could not be changed.') : null;
}

export async function updateProject(client: SupabaseClient<Database>, id: string, values: TablesUpdate<'projects'>) {
  const { error } = await client.from('projects').update(values).eq('id', id);
  return error ? serviceError(error, 'Project could not be updated.') : null;
}

export async function deleteProject(client: SupabaseClient<Database>, id: string) {
  const { error } = await client.from('projects').delete().eq('id', id);
  return error ? serviceError(error, 'Project could not be deleted.') : null;
}

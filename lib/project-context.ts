import { cache } from 'react';
import { cookies } from 'next/headers';

import { requireUser } from '@/lib/auth';
import { listProjects } from '@/lib/services/projects';
import { createClient } from '@/lib/supabase/server';

// One request-local source of project context for layouts, registers and metrics.
// Cookies only hold a preference; every selection is resolved through RLS.
export const getProjectContext = cache(async () => {
  const user = await requireUser();
  const client = await createClient();
  const [projects, profile, cookieStore] = await Promise.all([
    listProjects(client),
    client.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    cookies(),
  ]);
  const preferredId = cookieStore.get(`qaqc-project-${user.id}`)?.value ?? profile.data?.active_project_id;
  const activeProject = projects.data.find((p) => p.id === preferredId)
    ?? projects.data.find((p) => p.status === 'Active') ?? projects.data[0] ?? null;
  return { projects: projects.data, activeProject, error: projects.error };
});

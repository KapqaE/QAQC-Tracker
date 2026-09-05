import type { ReactNode } from 'react';

import { AppShell } from '@/components/layout/app-shell';
import { SetupRequired } from '@/components/shared/setup-required';
import { ensureProfile, requireUser } from '@/lib/auth';
import { getProjectContext } from '@/lib/project-context';
import { getUnreadNotificationCount } from '@/lib/services/profile';
import { hasSupabaseEnv } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  if (!hasSupabaseEnv()) return <SetupRequired />;

  const user = await requireUser();
  const client = await createClient();

  let loaded;
  try {
    loaded = await Promise.all([
      ensureProfile(user),
      getProjectContext(),
      getUnreadNotificationCount(client, user.id),
    ]);
  } catch {
    return <SetupRequired databaseReady />;
  }
  const [profile, projectsResult, notificationsResult] = loaded;
  const activeProject = projectsResult.activeProject;
  return <AppShell currentUser={profile} projects={projectsResult.projects} activeProject={activeProject} projectLoadError={projectsResult.error} unreadNotifications={notificationsResult.data}>{children}</AppShell>;
}

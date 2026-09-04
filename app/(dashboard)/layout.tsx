import type { ReactNode } from 'react';

import { AppShell } from '@/components/layout/app-shell';
import { SetupRequired } from '@/components/shared/setup-required';
import { ensureProfile, requireUser } from '@/lib/auth';
import { listProjects } from '@/lib/services/projects';
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
      listProjects(client),
      getUnreadNotificationCount(client, user.id),
    ]);
  } catch {
    return <SetupRequired databaseReady />;
  }
  const [profile, projectsResult, notificationsResult] = loaded;
  const activeProject = projectsResult.data.find((project) => project.status === 'Active') ?? projectsResult.data[0] ?? null;
  return <AppShell currentUser={profile} activeProject={activeProject} unreadNotifications={notificationsResult.data}>{children}</AppShell>;
}

import type { ReactNode } from 'react';

import { Navbar } from '@/components/layout/navbar';
import { Sidebar } from '@/components/layout/sidebar';
import type { Profile, Project } from '@/types/qaqc';

export function AppShell({ children, currentUser, activeProject, unreadNotifications }: { children: ReactNode; currentUser: Profile; activeProject: Project | null; unreadNotifications: number }) {
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[252px_minmax(0,1fr)]">
      <Sidebar currentUser={currentUser} activeProject={activeProject} />
      <div className="min-w-0">
        <Navbar currentUser={currentUser} activeProject={activeProject} unreadNotifications={unreadNotifications} />
        <main className="industrial-grid min-h-[calc(100vh-69px)] p-4 sm:p-6 xl:p-8">{children}</main>
      </div>
    </div>
  );
}

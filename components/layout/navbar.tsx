import { Bell, ChevronDown, Menu, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

import { logoutAction } from '@/app/actions/auth';
import { ProjectSelector } from '@/components/layout/project-selector';
import { Button } from '@/components/ui/button';
import type { Profile, Project } from '@/types/qaqc';

const mobileItems = [
  { label: 'Dashboard', href: '/' },
  { label: 'Projects', href: '/projects' },
  { label: 'WIR', href: '/wir' },
  { label: 'MIR', href: '/mir' },
  { label: 'NCR', href: '/ncr' },
  { label: 'SOR', href: '/sor' },
  { label: 'RRR', href: '/rrr' },
  { label: 'Documents', href: '/documents' },
  { label: 'Reports', href: '/reports' },
  { label: 'Naming Convention', href: '/settings/naming-convention' },
  { label: 'Settings', href: '/settings' },
];

export function Navbar({ currentUser, projects, activeProject, projectLoadError, unreadNotifications }: { currentUser: Profile; projects: Project[]; activeProject: Project | null; projectLoadError?: string | null; unreadNotifications: number }) {
  const initials = (currentUser.full_name || currentUser.email).split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return (
    <header className="sticky top-0 z-30 flex h-[69px] items-center justify-between border-b bg-card/95 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <details className="group relative lg:hidden">
          <summary className="grid size-9 cursor-pointer list-none place-items-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted [&::-webkit-details-marker]:hidden"><Menu className="size-[18px]" /><span className="sr-only">Open navigation</span></summary>
          <nav className="absolute left-0 top-12 w-60 rounded-xl border bg-popover p-2 shadow-xl" aria-label="Mobile navigation">
            <div className="mb-2 flex items-center gap-2 border-b px-2 pb-3 pt-1"><span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground"><ShieldCheck className="size-4" /></span><span className="text-sm font-semibold">QAQC Tracker</span></div>
            {mobileItems.map((item) => <Link key={item.label} href={item.href} className={`block rounded-lg px-3 py-2 text-sm ${item.label === 'Dashboard' ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>{item.label}</Link>)}
          </nav>
        </details>
        <ProjectSelector projects={projects} activeProject={activeProject} loadError={projectLoadError} />
      </div>

      <div className="mx-6 hidden items-center gap-2 rounded-full border bg-muted/45 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground lg:flex"><ShieldCheck className="size-3.5 text-emerald-600" />Authenticated data workspace</div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications, ${unreadNotifications} unread`}><Bell />{unreadNotifications ? <span className="absolute right-0.5 top-0.5 grid min-w-4 place-items-center rounded-full border-2 border-card bg-red-500 px-0.5 text-[8px] font-bold text-white">{Math.min(unreadNotifications, 9)}{unreadNotifications > 9 ? '+' : ''}</span> : null}</Button>
        <details className="group relative ml-1"><summary className="flex h-9 cursor-pointer list-none items-center gap-2 border-l pl-3 [&::-webkit-details-marker]:hidden"><div className="grid size-8 place-items-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">{initials}</div><div className="hidden text-left xl:block"><div className="max-w-32 truncate text-xs font-medium">{currentUser.full_name || currentUser.email}</div><div className="max-w-32 truncate text-[10px] text-muted-foreground">{currentUser.job_title || 'QA/QC Engineer'}</div></div><ChevronDown className="hidden size-3.5 text-muted-foreground xl:block" /></summary><div className="absolute right-0 top-12 w-64 rounded-xl border bg-popover p-2 shadow-xl"><div className="border-b px-2 pb-3 pt-1"><p className="truncate text-xs font-medium">{currentUser.full_name || 'QA/QC User'}</p><p className="mt-0.5 truncate text-[10px] text-muted-foreground">{currentUser.email}</p></div><form action={logoutAction} className="mt-2"><Button type="submit" variant="ghost" className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700">Sign out</Button></form></div></details>
      </div>
    </header>
  );
}

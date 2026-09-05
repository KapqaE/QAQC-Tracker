'use client';

import {
  BarChart3,
  Building2,
  ClipboardCheck,
  ClipboardList,
  FileStack,
  FileWarning,
  GitBranch,
  LayoutDashboard,
  PackageCheck,
  PanelsTopLeft,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { Profile, Project } from '@/types/qaqc';

const qualityRecords = [
  { label: 'WIR', icon: ClipboardCheck, href: '/wir' },
  { label: 'MIR', icon: PackageCheck, href: '/mir' },
  { label: 'NCR', icon: FileWarning, href: '/ncr' },
  { label: 'SOR', icon: ClipboardList, href: '/sor' },
  { label: 'RRR', icon: PanelsTopLeft, href: '/rrr' },
];

export function Sidebar({ currentUser, activeProject }: { currentUser: Profile; activeProject: Project | null }) {
  const pathname = usePathname();
  const initials = (currentUser.full_name || currentUser.email).split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return (
    <aside className="sticky top-0 hidden h-screen flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex h-[69px] items-center gap-3 border-b border-sidebar-border px-5">
        <span className="grid size-9 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_0_22px_rgb(79_190_181/18%)]">
          <ShieldCheck className="size-[19px]" />
        </span>
        <div><div className="text-[15px] font-semibold tracking-tight">QAQC Tracker</div><div className="text-[10px] uppercase tracking-[0.16em] text-sidebar-foreground/45">Quality command</div></div>
      </div>

      <div className="mx-4 mt-5 rounded-lg border border-sidebar-border bg-sidebar-accent/60 p-3">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/45">
          <span className={`size-1.5 rounded-full ${activeProject ? 'bg-emerald-400' : 'bg-amber-400'}`} /> {activeProject ? 'Active project' : 'Project required'}
        </div>
        <div className="mt-2 text-sm font-medium leading-5">{activeProject?.name ?? 'No active project'}</div>
        <div className="mt-1 font-mono text-[11px] text-sidebar-foreground/50">{activeProject ? `${activeProject.project_code} · ${activeProject.status}` : 'Create a project to begin'}</div>
        {!activeProject ? <Link href="/projects?create=1" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-teal-200 hover:text-white"><Building2 className="size-3.5" />Create Project</Link> : null}
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full w-2/3 rounded-full bg-sidebar-primary" /></div>
      </div>

      <nav className="flex-1 px-3 py-5" aria-label="Primary navigation">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/35">Workspace</p>
        <ul className="space-y-1">
          {[{ label: 'Dashboard', icon: LayoutDashboard, href: '/' }, { label: 'Projects', icon: Building2, href: '/projects' }].map(({ label, icon: Icon, href }) => {
            const active = pathname === href;
            return (
            <li key={label}>
              <Link href={href} aria-current={active ? 'page' : undefined} className={`group flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors ${active ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'}`}>
                <Icon className={`size-[17px] ${active ? 'text-sidebar-primary' : 'text-sidebar-foreground/45 group-hover:text-sidebar-foreground/75'}`} />
                <span className="flex-1">{label}</span>
              </Link>
            </li>
          );})}
        </ul>
        <p className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/35">Quality records</p>
        <ul className="space-y-1">{qualityRecords.map(({ label, icon: Icon, href }) => { const active = pathname === href || pathname.startsWith(`${href}/`); return <li key={label}><Link href={href} aria-current={active ? 'page' : undefined} className={`group flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors ${active ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'}`}><Icon className={`size-[17px] ${active ? 'text-sidebar-primary' : 'text-sidebar-foreground/45 group-hover:text-sidebar-foreground/75'}`} /><span className="flex-1">{label}</span></Link></li>; })}</ul>
        <p className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/35">Control</p>
        <ul className="space-y-1">{[{ label: 'Documents', icon: FileStack, href: '/documents' }, { label: 'Reports', icon: BarChart3, href: '/reports' }].map(({ label, icon: Icon, href }) => { const active = pathname === href || pathname.startsWith(`${href}/`); return <li key={label}><Link href={href} className={`group flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium ${active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'}`}><Icon className="size-[17px] text-sidebar-foreground/45" />{label}</Link></li>; })}</ul>
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <Link href="/settings/naming-convention" className="flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground"><GitBranch className="size-[17px] text-sidebar-foreground/45" />Naming Convention</Link>
        <Link href="/settings" className="flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground"><Settings className="size-[17px] text-sidebar-foreground/45" />Settings</Link>
        <div className="mt-3 flex items-center gap-3 rounded-lg bg-white/[0.035] p-3">
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-teal-400/15 text-xs font-semibold text-teal-200">{initials}</div>
          <div className="min-w-0"><div className="truncate text-xs font-medium">{currentUser.full_name || currentUser.email}</div><div className="truncate text-[10px] text-sidebar-foreground/40">{currentUser.job_title || 'QA/QC Engineer'}</div></div>
        </div>
      </div>
    </aside>
  );
}

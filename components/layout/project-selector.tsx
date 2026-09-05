'use client';

import { useRef, useState, useTransition } from 'react';
import { Building2, Check, ChevronDown, LoaderCircle, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { selectActiveProjectAction } from '@/app/actions/records';
import type { Project } from '@/types/qaqc';

export function ProjectSelector({
  projects,
  activeProject,
  loadError,
}: {
  projects: Project[];
  activeProject: Project | null;
  loadError?: string | null;
}) {
  const router = useRouter();
  const menu = useRef<HTMLDetailsElement>(null);
  const [error, setError] = useState(loadError ?? null);
  const [isPending, startTransition] = useTransition();

  function selectProject(projectId: string) {
    if (projectId === activeProject?.id || isPending) return;
    setError(null);
    const formData = new FormData();
    formData.set('project_id', projectId);
    startTransition(async () => {
      const result = await selectActiveProjectAction(formData);
      if (!result.success) {
        setError(result.message);
        return;
      }
      menu.current?.removeAttribute('open');
      router.refresh();
    });
  }

  return (
    <details ref={menu} className="group relative hidden sm:block">
      <summary className="flex max-w-[300px] cursor-pointer list-none items-center gap-2 rounded-lg px-1.5 py-1 text-left hover:bg-muted [&::-webkit-details-marker]:hidden" aria-label="Change active project">
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-secondary text-secondary-foreground"><Building2 className="size-4" /></span>
        <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{activeProject?.name ?? 'No active project'}</span><span className="block truncate text-[10px] text-muted-foreground">{activeProject ? `${activeProject.project_code} · ${activeProject.location}` : 'Create a project to begin'}</span></span>
        {isPending ? <LoaderCircle className="size-3.5 shrink-0 animate-spin text-muted-foreground" /> : <ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />}
      </summary>

      <div className="absolute left-0 top-12 z-50 w-80 rounded-xl border bg-popover p-2 shadow-xl">
        <div className="px-2 pb-2 pt-1">
          <p className="text-xs font-semibold">Active project</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Choose the project context used across QA/QC records.</p>
        </div>
        {error ? <p className="mx-1 mb-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] text-red-800">{error}</p> : null}
        {projects.length ? <div className="max-h-64 space-y-1 overflow-y-auto border-y py-2">
          {projects.map((project) => {
            const selected = project.id === activeProject?.id;
            return <button key={project.id} type="button" disabled={isPending} onClick={() => selectProject(project.id)} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${selected ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-secondary font-mono text-[9px] font-semibold">{project.project_code.slice(0, 3)}</span>
              <span className="min-w-0 flex-1"><span className="block truncate font-medium text-foreground">{project.name}</span><span className="block truncate text-[10px]">{project.project_code} · {project.status}</span></span>
              {selected ? <Check className="size-3.5 text-primary" /> : null}
            </button>;
          })}
        </div> : <div className="mx-1 rounded-lg border border-dashed p-4 text-center"><Building2 className="mx-auto size-5 text-muted-foreground" /><p className="mt-2 text-xs font-medium">No projects yet</p><p className="mt-1 text-[10px] leading-4 text-muted-foreground">Create the first project to unlock the quality registers.</p></div>}
        <Link href="/projects?create=1" className="mt-2 flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-primary hover:bg-muted" onClick={() => menu.current?.removeAttribute('open')}><Plus className="size-3.5" />Create new project</Link>
        {projects.length ? <Link href="/projects" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => menu.current?.removeAttribute('open')}><Building2 className="size-3.5" />Manage projects</Link> : null}
      </div>
    </details>
  );
}

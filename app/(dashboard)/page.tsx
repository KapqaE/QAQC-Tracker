import { AlertTriangle, Building2, CheckCircle2, ClipboardCheck, FileWarning, ListChecks, PackageCheck, PanelsTopLeft, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

import { MetricCard } from '@/components/dashboard/metric-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getQualityDashboard } from '@/lib/services/quality-dashboard';
import { listProjects } from '@/lib/services/projects';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const client = await createClient();
  const [data, projectsResult] = await Promise.all([
    getQualityDashboard(client),
    listProjects(client),
  ]);
  const { metrics } = data;
  const hasProjects = projectsResult.data.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
      <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div><div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary">QA/QC Records V2</div><h1 className="text-2xl font-semibold tracking-tight sm:text-[30px]">Quality control overview</h1><p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">Live Supabase records across WIR, MIR, NCR, SOR and room readiness. No dashboard values are mocked.</p></div>
        <Button nativeButton={false} size="lg" render={<Link href={hasProjects ? '/wir' : '/projects?create=1'} />}>{hasProjects ? <ClipboardCheck data-icon="inline-start" /> : <Building2 data-icon="inline-start" />}{hasProjects ? 'Create WIR' : 'Create Project'}</Button>
      </section>

      {data.error ? <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900"><AlertTriangle className="size-4 shrink-0" />{data.error}</div> : null}
      {projectsResult.error ? <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-900"><AlertTriangle className="size-4 shrink-0" />{projectsResult.error}</div> : null}
      {!projectsResult.error && !hasProjects ? <Card className="border-primary/25 bg-primary/[0.035]"><CardContent className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"><Building2 className="size-5" /></span><div><h2 className="text-sm font-semibold">Create your first project</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">A project provides the code and organization context required by WIR, MIR, NCR, SOR, RRR, documents, and reports. Your first project is selected automatically.</p></div></div><Button nativeButton={false} render={<Link href="/projects?create=1" />}><Building2 data-icon="inline-start" />Create Project</Button></CardContent></Card> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6" aria-label="Quality metrics">
        <MetricCard label="Total quality records" value={metrics.total} detail="All five modules" tone="neutral" icon={ShieldCheck} />
        <MetricCard label="WIR" value={metrics.wir} detail="Work inspections" tone="primary" icon={ClipboardCheck} />
        <MetricCard label="MIR" value={metrics.mir} detail="Material inspections" tone="primary" icon={PackageCheck} />
        <MetricCard label="NCR" value={metrics.ncr} detail="Non-conformances" tone="danger" icon={FileWarning} />
        <MetricCard label="SOR" value={metrics.sor} detail="Site observations" tone="warning" icon={ListChecks} />
        <MetricCard label="RRR" value={metrics.rrr} detail="Room readiness" tone="neutral" icon={PanelsTopLeft} />
        <MetricCard label="In review" value={metrics.inReview} detail="Workflow review" tone="warning" icon={ListChecks} />
        <MetricCard label="Approved / Proceed" value={metrics.approved} detail="Accepted outcomes" tone="success" icon={CheckCircle2} />
        <MetricCard label="Rejected" value={metrics.rejected} detail="Revision required" tone="danger" icon={AlertTriangle} />
        <MetricCard label="Open actions" value={metrics.openActions} detail={`${metrics.overdueActions} overdue`} tone="warning" icon={ListChecks} />
        <MetricCard label="Rooms ready" value={metrics.roomsReady} detail="Released without blockers" tone="success" icon={CheckCircle2} />
        <MetricCard label="Rooms not ready" value={metrics.roomsNotReady} detail={`${metrics.rr4Incomplete} with readiness blockers`} tone="danger" icon={AlertTriangle} />
      </section>
      <section className="grid gap-4 2xl:grid-cols-[minmax(0,1.35fr)_minmax(420px,0.8fr)]"><Card className="gap-0 overflow-hidden py-0"><CardHeader className="border-b bg-slate-800 px-4 py-3"><CardTitle className="text-sm text-white">Recent quality records</CardTitle></CardHeader><CardContent className="p-0">{data.recentRecords.length ? <Table><TableHeader><TableRow><TableHead>Record</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead>Discipline</TableHead><TableHead>Status</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader><TableBody>{data.recentRecords.map((record) => <TableRow key={`${record.type}-${record.id}`}><TableCell><Link href={`/${record.type.toLowerCase()}/${record.id}`} className="font-mono text-xs font-semibold text-primary hover:underline">{record.number}</Link></TableCell><TableCell>{record.type}</TableCell><TableCell className="max-w-sm truncate font-medium">{record.description}</TableCell><TableCell>{record.discipline}</TableCell><TableCell><StatusBadge status={record.status} /></TableCell><TableCell className="font-mono text-xs text-muted-foreground">{new Date(record.updated_at).toLocaleDateString('en-GB')}</TableCell></TableRow>)}</TableBody></Table> : <p className="p-6 text-sm text-muted-foreground">No quality records yet.</p>}</CardContent></Card>
      <Card className="gap-0 overflow-hidden py-0"><CardHeader className="border-b bg-slate-800 px-4 py-3"><CardTitle className="text-sm text-white">Action required</CardTitle></CardHeader><CardContent className="p-0">{data.actions.length ? <Table><TableHeader><TableRow><TableHead>Record</TableHead><TableHead>Action</TableHead><TableHead>Responsible</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{data.actions.map((action) => <TableRow key={action.id}><TableCell className="font-mono text-xs">{action.parent_record_type}</TableCell><TableCell className="max-w-xs whitespace-normal">{action.action_description}</TableCell><TableCell>{action.responsible_person}</TableCell><TableCell className={action.due_date < new Date().toISOString().slice(0,10) ? 'font-mono text-xs text-red-700' : 'font-mono text-xs'}>{action.due_date}</TableCell><TableCell><StatusBadge status={action.status} /></TableCell></TableRow>)}</TableBody></Table> : <p className="p-6 text-sm text-muted-foreground">No open actions.</p>}</CardContent></Card></section>
    </div>
  );
}

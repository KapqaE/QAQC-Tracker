import Link from 'next/link';
import { ArrowLeft, CalendarDays, FileText, FolderKanban, MapPin } from 'lucide-react';

import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export type DetailSection = { title: string; fields: { label: string; value: unknown; wide?: boolean }[] };

export function QualityRecordDetail({ module, route, recordNumber, documentCode, title, status, revision, recordDate, discipline, location, sections, children }:
  { module: string; route: string; recordNumber: string; documentCode?: string | null; title: string; status: string; revision?: string | null; recordDate?: string | null; discipline?: string | null; location?: string | null; sections: DetailSection[]; children?: React.ReactNode }) {
  return <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5">
    <div><Button nativeButton={false} variant="ghost" size="sm" className="-ml-2 mb-2" render={<Link href={route} />}><ArrowLeft />Back to {module} register</Button>
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm"><div className="h-1.5 bg-gradient-to-r from-slate-800 via-teal-700 to-sky-700" /><div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start"><div><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-semibold text-primary">{recordNumber}</span><StatusBadge status={status} /></div><h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-[30px]">{title}</h1>{documentCode ? <p className="mt-2 break-all font-mono text-xs text-muted-foreground">{documentCode}</p> : null}</div><div className="grid min-w-[250px] grid-cols-2 gap-3 text-xs"><Meta icon={FileText} label="Revision" value={revision} /><Meta icon={CalendarDays} label="Record date" value={formatDate(recordDate)} /><Meta icon={FolderKanban} label="Discipline" value={discipline} /><Meta icon={MapPin} label="Location" value={location} /></div></div></div>
    </div>
    <div className="grid gap-4 xl:grid-cols-2">{sections.map((section) => <Card key={section.title} className="gap-0 overflow-hidden py-0"><CardHeader className="border-b bg-slate-800 px-4 py-3 text-white"><CardTitle className="text-xs uppercase tracking-[0.11em] text-white">{section.title}</CardTitle></CardHeader><CardContent className="grid gap-x-6 gap-y-4 p-4 sm:grid-cols-2">{section.fields.map((field) => <div key={field.label} className={field.wide ? 'sm:col-span-2' : undefined}><dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{field.label}</dt><dd className="mt-1 whitespace-pre-wrap text-sm leading-6">{display(field.value)}</dd></div>)}</CardContent></Card>)}</div>
    {children}
  </div>;
}

function Meta({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value?: string | null }) { return <div className="rounded-lg border bg-muted/25 p-3"><Icon className="mb-2 size-4 text-primary" /><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div><div className="mt-1 font-medium">{value || 'Not provided'}</div></div>; }
function display(value: unknown) {
  if (value === null || value === undefined || value === '') return 'Not provided';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') return String(value);
  return JSON.stringify(value);
}
function formatDate(value?: string | null) { if (!value) return null; return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`)); }

'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { AlertTriangle, Database, FileSearch, LoaderCircle, Pencil, Plus, Search, Trash2, X } from 'lucide-react';

import type { CrudActionResult } from '@/app/actions/records';
import { normalizeQualityStatus } from '@/lib/quality-records/model';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

export type QualityRecordRow = { id: string; [key: string]: string | number | boolean | null };
export type QualityRecordColumn = { key: string; label: string; style?: 'primary' | 'mono' | 'status' | 'date' | 'muted' };
export type QualityRecordField = {
  name: string; label: string; section: string; type?: 'text' | 'date' | 'time' | 'number' | 'textarea' | 'select' | 'checkbox';
  required?: boolean; options?: { label: string; value: string }[]; placeholder?: string; span?: 1 | 2; defaultValue?: string | boolean;
};
type Action = (formData: FormData) => Promise<CrudActionResult>;

export function QualityRecordManager({ module, title, description, noun, route, rows, columns, fields, createAction, updateAction, deleteAction, loadError, createDefaults }:
  { module: string; title: string; description: string; noun: string; route: string; rows: QualityRecordRow[]; columns: QualityRecordColumn[]; fields: QualityRecordField[];
    createAction: Action; updateAction: Action; deleteAction: Action; loadError?: string | null; createDefaults?: Record<string, string | boolean> }) {
  const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const [discipline, setDiscipline] = useState('');
  const [editing, setEditing] = useState<QualityRecordRow | null | undefined>(undefined); const [deleting, setDeleting] = useState<QualityRecordRow | null>(null);
  const [feedback, setFeedback] = useState<CrudActionResult | null>(loadError ? { success: false, message: loadError } : null); const [pending, startTransition] = useTransition();
  const statuses = useMemo(() => [...new Set(rows.map((row) => String(row.status ?? '')).filter(Boolean))], [rows]);
  const disciplines = useMemo(() => [...new Set(rows.map((row) => String(row.discipline ?? '')).filter(Boolean))], [rows]);
  const visible = useMemo(() => rows.filter((row) => (!search || Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(search.toLowerCase()))) && (!status || row.status === status) && (!discipline || row.discipline === discipline)), [rows, search, status, discipline]);
  const counts = useMemo(() => ({ total: rows.length, review: rows.filter((row) => normalizeQualityStatus(String(row.status)) === 'review').length,
    approved: rows.filter((row) => normalizeQualityStatus(String(row.status)) === 'approved').length, rejected: rows.filter((row) => normalizeQualityStatus(String(row.status)) === 'rejected').length,
    open: rows.filter((row) => normalizeQualityStatus(String(row.status)) === 'open').length }), [rows]);
  const sections = useMemo(() => [...new Set(fields.map((field) => field.section))], [fields]);

  function save(formData: FormData) { if (editing?.id) formData.set('id', editing.id); setFeedback(null); startTransition(async () => { const result = editing?.id ? await updateAction(formData) : await createAction(formData); setFeedback(result); if (result.success) setEditing(undefined); }); }
  function remove() { if (!deleting) return; const formData = new FormData(); formData.set('id', deleting.id); startTransition(async () => { const result = await deleteAction(formData); setFeedback(result); if (result.success) setDeleting(null); }); }
  const openCreate = () => { setEditing(null); setFeedback(null); };

  return <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-5">
    <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Quality Records · {module}</p><h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-[30px]">{title}</h1><p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p></div><Button size="lg" onClick={openCreate} disabled={Boolean(loadError)}><Plus />Create {module}</Button></header>
    {feedback ? <output className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-xs ${feedback.success ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}><span>{feedback.message}</span><button type="button" onClick={() => setFeedback(null)} aria-label="Dismiss"><X className="size-3.5" /></button></output> : null}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label={`${module} summary`}>
      <Metric label="Total" value={counts.total} /><Metric label="In review" value={counts.review} tone="violet" /><Metric label="Approved / Proceed" value={counts.approved} tone="green" /><Metric label="Rejected" value={counts.rejected} tone="red" /><Metric label="Open / Action required" value={counts.open} tone="amber" />
    </section>
    <Card className="gap-0 overflow-hidden py-0"><CardContent className="border-b p-4"><div className="grid gap-2 md:grid-cols-[minmax(260px,1fr)_180px_180px_auto]">
      <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="h-9 bg-muted/45 pl-9" placeholder={`Search ${module} records...`} /></div>
      <Filter label="All statuses" value={status} onChange={setStatus} options={statuses} /><Filter label="All disciplines" value={discipline} onChange={setDiscipline} options={disciplines} />
      {(search || status || discipline) ? <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatus(''); setDiscipline(''); }}><X />Clear</Button> : <span />}
    </div></CardContent>
    {visible.length ? <div className="overflow-x-auto"><Table className="min-w-[1080px]"><TableHeader><TableRow>{columns.map((column) => <TableHead key={column.key} className="h-11 text-[10px] uppercase tracking-wider text-muted-foreground first:pl-4">{column.label}</TableHead>)}<TableHead className="w-24 pr-4 text-right text-[10px] uppercase tracking-wider text-muted-foreground">Actions</TableHead></TableRow></TableHeader><TableBody>{visible.map((row) => <TableRow key={row.id}>{columns.map((column) => <TableCell key={column.key} className="max-w-[340px] py-3 first:pl-4">{renderCell(row, column, `${route}/${row.id}`)}</TableCell>)}<TableCell className="pr-4"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon-sm" onClick={() => { setEditing(row); setFeedback(null); }} aria-label={`Edit ${noun}`}><Pencil /></Button><Button variant="ghost" size="icon-sm" className="text-red-600" onClick={() => setDeleting(row)} aria-label={`Delete ${noun}`}><Trash2 /></Button></div></TableCell></TableRow>)}</TableBody></Table></div> : <Empty className="m-4 min-h-64 border"><EmptyHeader><EmptyMedia variant="icon"><Database /></EmptyMedia><EmptyTitle>No {module} records</EmptyTitle><EmptyDescription>Create the first record or adjust the register filters.</EmptyDescription></EmptyHeader><Button size="sm" onClick={openCreate}><Plus />Create {module}</Button></Empty>}
    </Card>
    <Dialog open={editing !== undefined} onOpenChange={(open) => { if (!open && !pending) setEditing(undefined); }}><DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-5xl"><DialogHeader><DialogTitle>{editing?.id ? `Edit ${module}` : `Create ${module}`}</DialogTitle><DialogDescription>Structured fields are saved to Supabase. Uploaded source document contents are never stored by this workflow.</DialogDescription></DialogHeader><form action={save} className="space-y-5">
      {sections.map((section) => <section key={section} className="overflow-hidden rounded-xl border bg-card"><div className="bg-slate-800 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.11em] text-white">{section}</div><div className="grid gap-4 p-4 sm:grid-cols-2">{fields.filter((field) => field.section === section).map((field) => <FormField key={field.name} field={field} value={editing?.[field.name] ?? createDefaults?.[field.name]} />)}</div></section>)}
      {feedback && editing !== undefined ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{feedback.message}</div> : null}<DialogFooter className="sticky bottom-0 border-t bg-background/95 py-3 backdrop-blur"><Button type="button" variant="outline" onClick={() => setEditing(undefined)} disabled={pending}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : null}{pending ? 'Saving...' : `Save ${module}`}</Button></DialogFooter>
    </form></DialogContent></Dialog>
    <Dialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open && !pending) setDeleting(null); }}><DialogContent className="sm:max-w-md"><DialogHeader><div className="grid size-10 place-items-center rounded-full bg-red-50 text-red-600"><AlertTriangle /></div><DialogTitle>Delete {module} record?</DialogTitle><DialogDescription>This removes this application record and its database child rows. It does not affect any external Procore record.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button><Button variant="destructive" onClick={remove} disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : <Trash2 />}Delete</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

function Metric({ label, value, tone = 'slate' }: { label: string; value: number; tone?: 'slate' | 'violet' | 'green' | 'red' | 'amber' }) { const colors = { slate: 'border-slate-200', violet: 'border-violet-200', green: 'border-emerald-200', red: 'border-red-200', amber: 'border-amber-200' }; return <Card className={`gap-1 border-l-4 p-4 ${colors[tone]}`}><span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span><span className="text-2xl font-semibold tabular-nums">{value}</span></Card>; }
function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) { return <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label} className="h-9 rounded-lg border bg-background px-2.5 text-xs"><option value="">{label}</option>{options.map((option) => <option key={option}>{option}</option>)}</select>; }
function FormField({ field, value }: { field: QualityRecordField; value: string | number | boolean | null | undefined }) { const initial = typeof value === 'boolean' ? value : value == null ? field.defaultValue ?? '' : String(value); const className = field.span === 2 ? 'sm:col-span-2' : '';
  if (field.type === 'checkbox') return <label className={`${className} flex min-h-10 items-center gap-3 rounded-lg border bg-muted/25 px-3 text-sm`}><input type="checkbox" name={field.name} defaultChecked={Boolean(initial)} className="size-4 accent-teal-600" /><span>{field.label}</span></label>;
  return <div className={className}><label htmlFor={field.name} className="mb-1.5 block text-xs font-medium">{field.label}{field.required ? <span className="ml-1 text-red-500">*</span> : null}</label>{field.type === 'textarea' ? <Textarea id={field.name} name={field.name} defaultValue={String(initial)} required={field.required} placeholder={field.placeholder} className="min-h-24" /> : field.type === 'select' ? <select id={field.name} name={field.name} defaultValue={String(initial)} required={field.required} className="h-9 w-full rounded-lg border bg-background px-2.5 text-sm"><option value="">Select {field.label.toLowerCase()}</option>{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <Input id={field.name} name={field.name} type={field.type ?? 'text'} defaultValue={String(initial)} required={field.required} placeholder={field.placeholder} min={field.type === 'number' ? 0 : undefined} />}</div>; }
function renderCell(row: QualityRecordRow, column: QualityRecordColumn, href: string) { const value = String(row[column.key] ?? 'Not provided'); if (column.style === 'status') return <StatusBadge status={value} />; if (column.style === 'date') return <span className="font-mono text-xs text-muted-foreground">{value === 'Not provided' ? value : new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`))}</span>; if (column.style === 'mono') return <Link href={href} className="font-mono text-xs font-semibold text-primary hover:underline">{value}</Link>; if (column.style === 'primary') return <Link href={href} className="block truncate font-medium hover:text-primary"><span className="inline-flex items-center gap-1.5"><FileSearch className="size-3.5" />{value}</span></Link>; return <span className="block truncate text-sm text-muted-foreground">{value}</span>; }

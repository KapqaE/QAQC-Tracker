'use client';

import { useMemo, useState, useTransition } from 'react';
import { AlertTriangle, Database, LoaderCircle, Pencil, Plus, Search, Trash2, X } from 'lucide-react';

import type { CrudActionResult } from '@/app/actions/records';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

export type CrudRow = { id: string; [key: string]: string | boolean | null };
export type CrudColumn = { key: string; label: string; style?: 'primary' | 'mono' | 'status' | 'date' | 'muted' };
export type CrudField = { name: string; label: string; type?: 'text' | 'date' | 'textarea' | 'select'; required?: boolean; options?: { label: string; value: string }[]; placeholder?: string; span?: 1 | 2; defaultValue?: string };
type CrudAction = (formData: FormData) => Promise<CrudActionResult>;

export function CrudManager({ title, description, noun, rows, columns, fields, createAction, updateAction, deleteAction, loadError, enableDiscipline = false, enableProject = false }: { title: string; description: string; noun: string; rows: CrudRow[]; columns: CrudColumn[]; fields: CrudField[]; createAction: CrudAction; updateAction: CrudAction; deleteAction: CrudAction; loadError?: string | null; enableDiscipline?: boolean; enableProject?: boolean }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [project, setProject] = useState('');
  const [editing, setEditing] = useState<CrudRow | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<CrudRow | null>(null);
  const [feedback, setFeedback] = useState<CrudActionResult | null>(loadError ? { success: false, message: loadError } : null);
  const [isPending, startTransition] = useTransition();

  const statuses = useMemo(() => [...new Set(rows.map((row) => String(row.status ?? '')).filter(Boolean))], [rows]);
  const disciplines = useMemo(() => [...new Set(rows.map((row) => String(row.discipline ?? '')).filter(Boolean))], [rows]);
  const projects = useMemo(() => [...new Map(rows.map((row) => [String(row.project_id ?? ''), String(row.project_name ?? 'Unknown project')])).entries()].filter(([id]) => id), [rows]);
  const filteredRows = useMemo(() => rows.filter((row) => {
    const matchesSearch = !search || Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(search.toLowerCase()));
    return matchesSearch && (!status || row.status === status) && (!discipline || row.discipline === discipline) && (!project || row.project_id === project);
  }), [rows, search, status, discipline, project]);

  function save(formData: FormData) {
    setFeedback(null);
    if (editing?.id) formData.set('id', editing.id);
    startTransition(async () => {
      const result = editing?.id ? await updateAction(formData) : await createAction(formData);
      setFeedback(result);
      if (result.success) setEditing(undefined);
    });
  }

  function remove() {
    if (!deleting) return;
    const formData = new FormData();
    formData.set('id', deleting.id);
    setFeedback(null);
    startTransition(async () => {
      const result = await deleteAction(formData);
      setFeedback(result);
      if (result.success) setDeleting(null);
    });
  }

  const filtersActive = Boolean(search || status || discipline || project);

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Quality register</p><h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-[30px]">{title}</h1><p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p></div>
        <Button size="lg" onClick={() => { setEditing(null); setFeedback(null); }}><Plus data-icon="inline-start" />New {noun}</Button>
      </div>

      {feedback ? <output className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-xs ${feedback.success ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}><span>{feedback.message}</span><button type="button" onClick={() => setFeedback(null)} aria-label="Dismiss message"><X className="size-3.5" /></button></output> : null}

      <Card className="gap-0 py-0">
        <CardContent className="border-b p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="h-9 bg-muted/45 pl-9" placeholder={`Search ${title.toLowerCase()}...`} aria-label={`Search ${title}`} /></div>
            <div className="flex flex-wrap gap-2">
              {statuses.length ? <FilterSelect label="All statuses" value={status} onChange={setStatus} options={statuses.map((value) => [value, value])} /> : null}
              {enableDiscipline ? <FilterSelect label="All disciplines" value={discipline} onChange={setDiscipline} options={disciplines.map((value) => [value, value])} /> : null}
              {enableProject ? <FilterSelect label="All projects" value={project} onChange={setProject} options={projects.map(([id, name]) => [id, name])} /> : null}
              {filtersActive ? <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatus(''); setDiscipline(''); setProject(''); }}><X />Clear</Button> : null}
            </div>
          </div>
        </CardContent>

        {filteredRows.length ? <Table>
          <TableHeader><TableRow className="hover:bg-transparent">{columns.map((column) => <TableHead key={column.key} className="h-11 text-[10px] uppercase tracking-wider text-muted-foreground first:pl-4">{column.label}</TableHead>)}<TableHead className="w-24 pr-4 text-right text-[10px] uppercase tracking-wider text-muted-foreground">Actions</TableHead></TableRow></TableHeader>
          <TableBody>{filteredRows.map((row) => <TableRow key={row.id} className={row.overdue ? 'bg-red-50/45 hover:bg-red-50/70' : undefined}>
            {columns.map((column) => <TableCell key={column.key} className="max-w-[320px] py-3 first:pl-4">{renderCell(row, column)}</TableCell>)}
            <TableCell className="pr-4"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon-sm" onClick={() => { setEditing(row); setFeedback(null); }} aria-label={`Edit ${noun}`}><Pencil /></Button><Button variant="ghost" size="icon-sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => { setDeleting(row); setFeedback(null); }} aria-label={`Delete ${noun}`}><Trash2 /></Button></div></TableCell>
          </TableRow>)}</TableBody>
        </Table> : <Empty className="m-4 min-h-64 border"><EmptyHeader><EmptyMedia variant="icon"><Database /></EmptyMedia><EmptyTitle>{filtersActive ? 'No matching records' : `No ${title.toLowerCase()} yet`}</EmptyTitle><EmptyDescription>{filtersActive ? 'Adjust or clear the filters to see more records.' : `Create the first ${noun} to start this register.`}</EmptyDescription></EmptyHeader>{!filtersActive ? <Button size="sm" onClick={() => setEditing(null)}><Plus />New {noun}</Button> : null}</Empty>}
      </Card>

      <Dialog open={editing !== undefined} onOpenChange={(open) => { if (!open && !isPending) setEditing(undefined); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? `Edit ${noun}` : `Create ${noun}`}</DialogTitle><DialogDescription>Fields marked with * are required. Changes are protected by your authenticated Supabase session.</DialogDescription></DialogHeader>
          <form action={save} className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => <FormField key={field.name} field={field} value={editing?.[field.name]} />)}
            {feedback && editing !== undefined ? <div className={`sm:col-span-2 rounded-lg border px-3 py-2.5 text-xs ${feedback.success ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>{feedback.message}</div> : null}
            <DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" onClick={() => setEditing(undefined)} disabled={isPending}>Cancel</Button><Button type="submit" disabled={isPending}>{isPending ? <LoaderCircle className="animate-spin" /> : null}{isPending ? 'Saving...' : `Save ${noun}`}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open && !isPending) setDeleting(null); }}>
        <DialogContent className="sm:max-w-md"><DialogHeader><div className="mb-1 grid size-10 place-items-center rounded-full bg-red-50 text-red-600"><AlertTriangle className="size-5" /></div><DialogTitle>Delete {noun}?</DialogTitle><DialogDescription>This action cannot be undone. Linked records may also be removed according to the database relationships.</DialogDescription></DialogHeader>{feedback && deleting ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800">{feedback.message}</div> : null}<DialogFooter><Button variant="outline" onClick={() => setDeleting(null)} disabled={isPending}>Cancel</Button><Button variant="destructive" onClick={remove} disabled={isPending}>{isPending ? <LoaderCircle className="animate-spin" /> : <Trash2 />}{isPending ? 'Deleting...' : 'Delete record'}</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}

function FormField({ field, value }: { field: CrudField; value: string | boolean | null | undefined }) {
  const initial = typeof value === 'string' ? value : field.defaultValue ?? '';
  return <div className={field.span === 2 ? 'sm:col-span-2' : undefined}><label htmlFor={field.name} className="mb-1.5 block text-xs font-medium">{field.label}{field.required ? <span className="ml-1 text-red-500">*</span> : null}</label>{field.type === 'textarea' ? <Textarea id={field.name} name={field.name} defaultValue={initial} required={field.required} placeholder={field.placeholder} className="min-h-24" /> : field.type === 'select' ? <select id={field.name} name={field.name} defaultValue={initial} required={field.required} className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"><option value="" disabled={field.required}>Select {field.label.toLowerCase()}</option>{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <Input id={field.name} name={field.name} type={field.type ?? 'text'} defaultValue={initial} required={field.required} placeholder={field.placeholder} className="h-9" />}</div>;
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} className="h-8 max-w-48 rounded-lg border border-input bg-background px-2.5 text-xs text-muted-foreground outline-none focus:border-ring" aria-label={label}><option value="">{label}</option>{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select>;
}

function renderCell(row: CrudRow, column: CrudColumn) {
  const value = String(row[column.key] ?? '—');
  if (column.style === 'status') return <div className="flex items-center gap-2"><StatusBadge status={value} />{row.overdue ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">Overdue</span> : null}</div>;
  if (column.style === 'date') return <span className="font-mono text-xs text-muted-foreground">{value === '—' ? value : new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`))}</span>;
  if (column.style === 'mono') return <span className="font-mono text-xs font-medium text-primary">{value}</span>;
  if (column.style === 'primary') return <span className="block truncate font-medium text-foreground">{value}</span>;
  return <span className="block truncate text-muted-foreground">{value}</span>;
}

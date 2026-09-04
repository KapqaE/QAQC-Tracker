'use client';

import { useMemo, useState, useTransition } from 'react';
import { AlertTriangle, FilePlus2, FileSearch, LoaderCircle, Pencil, Plus, Search, Sparkles, Trash2, Upload, X } from 'lucide-react';
import Link from 'next/link';

import type { CrudActionResult } from '@/app/actions/records';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { analyzeLevelAreaSegment, analyzeNumberSegment, buildDocumentCodeSegments, documentCodeComplianceNotes, generateDocumentCode, parseDocumentCode, projectNamingCode, suggestNextPrefixedNumber, validateDocumentNumber } from '@/lib/procore/naming';
import { procoreReference, referenceLabel } from '@/lib/procore/reference';
import type { Project, ProjectDocument } from '@/types/qaqc';

type CrudAction = (formData: FormData) => Promise<CrudActionResult>;
type DocumentFormState = {
  project_id: string; project_code: string; document_type_code: string; discipline_code: string; number: string; location_code: string; volume_system_code: string; classification_code: string; originator_code: string; revision: string; status: string; project_stage: string; description: string;
};

const emptyForm: DocumentFormState = { project_id: '', project_code: '', document_type_code: '', discipline_code: '', number: '', location_code: '', volume_system_code: '', classification_code: '', originator_code: '', revision: '', status: '', project_stage: '', description: '' };

export function DocumentRegister({ documents, projects, loadError, createAction, updateAction, deleteAction }: { documents: ProjectDocument[]; projects: Project[]; loadError?: string | null; createAction: CrudAction; updateAction: CrudAction; deleteAction: CrudAction }) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ project: '', type: '', discipline: '', status: '', originator: '', revision: '', workflow: '' });
  const [editing, setEditing] = useState<ProjectDocument | null | undefined>(undefined);
  const [form, setForm] = useState<DocumentFormState>(emptyForm);
  const [deleting, setDeleting] = useState<ProjectDocument | null>(null);
  const [feedback, setFeedback] = useState<CrudActionResult | null>(loadError ? { success: false, message: loadError } : null);
  const [isPending, startTransition] = useTransition();
  const projectNames = useMemo(() => new Map(projects.map((project) => [project.id, project.name])), [projects]);
  const mappedProjects = useMemo(() => projects.map((project) => ({ project, namingCode: projectNamingCode(project.project_code) })).filter((item): item is { project: Project; namingCode: string } => Boolean(item.namingCode)), [projects]);

  const rows = useMemo(() => documents.filter((document) => {
    const documentCode = document.document_code || document.document_number;
    const description = document.description || document.title;
    const matchesSearch = !search || `${documentCode} ${description}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (!filters.project || document.project_id === filters.project) && (!filters.type || document.document_type_code === filters.type) && (!filters.discipline || document.discipline_code === filters.discipline) && (!filters.status || document.status === filters.status) && (!filters.originator || document.originator_code === filters.originator) && (!filters.revision || document.revision === filters.revision) && (!filters.workflow || (document.workflow_status ?? '') === filters.workflow);
  }), [documents, filters, search]);

  const codeFieldsComplete = Boolean(form.project_code && form.document_type_code && form.discipline_code && form.number && form.location_code && form.volume_system_code && form.classification_code && form.originator_code);
  const codeParts = useMemo(() => ({ projectCode: form.project_code, documentTypeCode: form.document_type_code, disciplineCode: form.discipline_code, number: form.number, locationCode: form.location_code, volumeSystemCode: form.volume_system_code, classificationCode: form.classification_code, originatorCode: form.originator_code }), [form.classification_code, form.discipline_code, form.document_type_code, form.location_code, form.number, form.originator_code, form.project_code, form.volume_system_code]);
  const generatedSegments = useMemo(() => codeFieldsComplete ? buildDocumentCodeSegments(codeParts) : [], [codeFieldsComplete, codeParts]);
  const generatedCode = useMemo(() => codeFieldsComplete ? generateDocumentCode(codeParts) : '', [codeFieldsComplete, codeParts]);
  const complianceNotes = useMemo(() => codeFieldsComplete ? documentCodeComplianceNotes(codeParts) : [], [codeFieldsComplete, codeParts]);
  const numberAnalysis = form.document_type_code && form.number ? analyzeNumberSegment(form.document_type_code, form.number) : null;
  const levelAreaAnalysis = form.location_code ? analyzeLevelAreaSegment(form.location_code) : null;
  const numberError = form.document_type_code && form.number ? validateDocumentNumber(form.document_type_code, form.number) : null;
  const duplicate = Boolean(generatedCode && documents.some((document) => (document.document_code || document.document_number).toUpperCase() === generatedCode.toUpperCase() && document.id !== editing?.id));
  const scopedNumbers = documents.filter((document) => document.project_id === form.project_id && document.document_type_code === form.document_type_code && document.discipline_code === form.discipline_code).map((document) => document.number ?? '').filter(Boolean);
  const nextWir = suggestNextPrefixedNumber(scopedNumbers, form.document_type_code, 'WIR');
  const filtersActive = Boolean(search || Object.values(filters).some(Boolean));

  function change<K extends keyof DocumentFormState>(key: K, value: DocumentFormState[K]) { setForm((current) => ({ ...current, [key]: value })); }
  function setFilter(key: keyof typeof filters, value: string) { setFilters((current) => ({ ...current, [key]: value })); }

  function openCreate() {
    setEditing(null);
    setFeedback(null);
    setForm({ ...emptyForm, project_stage: procoreReference.projectStages[0]?.code ?? '', originator_code: procoreReference.originators[0]?.code ?? '' });
  }

  function openEdit(document: ProjectDocument) {
    const code = parseDocumentCode(document.document_code || document.document_number);
    setEditing(document);
    setFeedback(null);
    setForm({ project_id: document.project_id, project_code: code?.projectCode ?? '', document_type_code: document.document_type_code ?? code?.documentTypeCode ?? '', discipline_code: document.discipline_code ?? code?.disciplineCode ?? '', number: document.number ?? code?.number ?? '', location_code: document.location_code ?? code?.locationCode ?? '', volume_system_code: document.volume_system_code ?? code?.volumeSystemCode ?? '', classification_code: document.classification_code ?? code?.classificationCode ?? '', originator_code: document.originator_code ?? code?.originatorCode ?? '', revision: document.revision, status: document.status, project_stage: document.project_stage ?? procoreReference.projectStages[0]?.code ?? '', description: document.description || document.title });
  }

  function save(formData: FormData) {
    if (duplicate || numberError) return;
    setFeedback(null);
    if (editing?.id) formData.set('id', editing.id);
    startTransition(async () => { const result = editing?.id ? await updateAction(formData) : await createAction(formData); setFeedback(result); if (result.success) setEditing(undefined); });
  }

  function remove() {
    if (!deleting) return;
    const formData = new FormData(); formData.set('id', deleting.id);
    startTransition(async () => { const result = await deleteAction(formData); setFeedback(result); if (result.success) setDeleting(null); });
  }

  return (
    <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-5">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Procore document control</p><h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-[30px]">Document register</h1><p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">Create, import, filter, and trace document metadata using the naming codes detected in the supplied Procore export.</p></div>
        <div className="flex flex-wrap gap-2"><Button nativeButton={false} variant="outline" render={<Link href="/settings/naming-convention" />}><FileSearch />Naming rules</Button><Button nativeButton={false} variant="outline" render={<Link href="/documents/import" />}><Upload />Import Procore CSV</Button><Button onClick={openCreate} disabled={Boolean(loadError)}><Plus />Create document</Button></div>
      </div>
      {feedback ? <output className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-xs ${feedback.success ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}><span>{feedback.message}</span><button type="button" onClick={() => setFeedback(null)} aria-label="Dismiss message"><X className="size-3.5" /></button></output> : null}
      {!mappedProjects.length ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900"><strong>Manual Procore creation needs a mapped project.</strong> Create or update a QAQC project with code <code>IL05</code> or <code>IL051</code>. CSV import can still target any existing QAQC project.</div> : null}

      <Card className="gap-0 py-0"><CardContent className="border-b p-4"><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_repeat(7,minmax(120px,auto))]">
        <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="h-9 bg-muted/45 pl-9" placeholder="Search document code or description..." aria-label="Search documents" /></div>
        <FilterSelect label="All projects" value={filters.project} onChange={(value) => setFilter('project', value)} options={projects.map((project) => [project.id, project.name])} />
        <FilterSelect label="All types" value={filters.type} onChange={(value) => setFilter('type', value)} options={procoreReference.documentTypes.map((item) => [item.code, `${item.code} · ${item.label}`])} />
        <FilterSelect label="All disciplines" value={filters.discipline} onChange={(value) => setFilter('discipline', value)} options={procoreReference.disciplines.map((item) => [item.code, `${item.code} · ${item.label}`])} />
        <FilterSelect label="All statuses" value={filters.status} onChange={(value) => setFilter('status', value)} options={procoreReference.statuses.map((item) => [item.code, `${item.code} · ${item.label}`])} />
        <FilterSelect label="All originators" value={filters.originator} onChange={(value) => setFilter('originator', value)} options={procoreReference.originators.map((item) => [item.code, `${item.code} · ${item.label}`])} />
        <FilterSelect label="All revisions" value={filters.revision} onChange={(value) => setFilter('revision', value)} options={procoreReference.revisionPatterns.map((item) => [item.code, item.label])} />
        <FilterSelect label="All workflows" value={filters.workflow} onChange={(value) => setFilter('workflow', value)} options={procoreReference.workflowStatuses.map((item) => [item.code, item.label])} />
      </div>{filtersActive ? <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setSearch(''); setFilters({ project: '', type: '', discipline: '', status: '', originator: '', revision: '', workflow: '' }); }}><X />Clear filters</Button> : null}</CardContent>

      {rows.length ? <div className="overflow-x-auto"><Table className="min-w-[1420px]"><TableHeader><TableRow className="hover:bg-transparent">{['Document code', 'Description', 'Type', 'Discipline', 'Revision', 'Status', 'Originator', 'Project', 'Workflow status', 'Updated date', 'Actions'].map((label) => <TableHead key={label} className="h-11 text-[10px] uppercase tracking-wider text-muted-foreground first:pl-4 last:pr-4 last:text-right">{label}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.map((document) => <TableRow key={document.id}>
        <TableCell className="max-w-[280px] pl-4 font-mono text-xs font-medium text-primary">{document.document_code || document.document_number}</TableCell>
        <TableCell className="max-w-[300px]"><span className="block truncate font-medium">{document.description || document.title}</span>{document.file_name ? <span className="mt-1 block truncate text-[10px] text-muted-foreground">{document.file_name}</span> : null}</TableCell>
        <TableCell className="text-xs text-muted-foreground">{document.document_type_code ? `${document.document_type_code} · ${referenceLabel(procoreReference.documentTypes, document.document_type_code)}` : document.document_type}</TableCell>
        <TableCell className="text-xs text-muted-foreground">{document.discipline_code ? `${document.discipline_code} · ${referenceLabel(procoreReference.disciplines, document.discipline_code)}` : document.discipline}</TableCell>
        <TableCell className="font-mono text-xs">{document.revision}</TableCell><TableCell><StatusBadge status={document.status} /></TableCell>
        <TableCell className="text-xs text-muted-foreground">{document.originator_code ? `${document.originator_code} · ${referenceLabel(procoreReference.originators, document.originator_code)}` : '—'}</TableCell>
        <TableCell className="text-xs text-muted-foreground">{projectNames.get(document.project_id) ?? 'Unknown project'}</TableCell><TableCell className="text-xs text-muted-foreground">{document.workflow_status || '—'}</TableCell><TableCell className="font-mono text-xs text-muted-foreground">{formatDateTime(document.date_updated || document.updated_at)}</TableCell>
        <TableCell className="pr-4"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon-sm" onClick={() => openEdit(document)} aria-label="Edit document"><Pencil /></Button><Button variant="ghost" size="icon-sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDeleting(document)} aria-label="Delete document"><Trash2 /></Button></div></TableCell>
      </TableRow>)}</TableBody></Table></div> : <Empty className="m-4 min-h-72 border"><EmptyHeader><EmptyMedia variant="icon"><FilePlus2 /></EmptyMedia><EmptyTitle>{filtersActive ? 'No matching documents' : 'No document metadata yet'}</EmptyTitle><EmptyDescription>{filtersActive ? 'Adjust or clear the filters.' : 'Import a Procore export or create the first controlled document.'}</EmptyDescription></EmptyHeader>{!filtersActive ? <div className="flex gap-2"><Button nativeButton={false} variant="outline" render={<Link href="/documents/import" />}><Upload />Import CSV</Button><Button onClick={openCreate} disabled={Boolean(loadError)}><Plus />Create document</Button></div> : null}</Empty>}</Card>

      <Dialog open={editing !== undefined} onOpenChange={(open) => { if (!open && !isPending) setEditing(undefined); }}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl"><DialogHeader><DialogTitle>{editing?.id ? 'Edit controlled document' : 'Create controlled document'}</DialogTitle><DialogDescription>Labels come from the supplied Procore export; only their codes are used in the generated number.</DialogDescription></DialogHeader><form action={save} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField label="Project" name="project_id" value={form.project_id} required options={mappedProjects.map(({ project, namingCode }) => [project.id, `${namingCode} · ${project.name}`])} onChange={(value) => { const match = mappedProjects.find((item) => item.project.id === value); setForm((current) => ({ ...current, project_id: value, project_code: match?.namingCode ?? '' })); }} /><input type="hidden" name="project_code" value={form.project_code} />
        <SelectField label="Type" name="document_type_code" value={form.document_type_code} required options={procoreReference.documentTypes.map((item) => [item.code, `${item.code} · ${item.label}`])} onChange={(value) => change('document_type_code', value)} />
        <SelectField label="Discipline" name="discipline_code" value={form.discipline_code} required options={procoreReference.disciplines.map((item) => [item.code, `${item.code} · ${item.label}`])} onChange={(value) => change('discipline_code', value)} />
        <div><label htmlFor="number" className="mb-1.5 block text-xs font-medium">Segment 4 · Number / sheet data <span className="text-red-500">*</span></label><div className="flex gap-2"><Input id="number" name="number" value={form.number} onChange={(event) => change('number', event.target.value.toUpperCase())} required placeholder="WIR.0001 or 120" className="font-mono" />{nextWir ? <Button type="button" variant="outline" className="shrink-0" onClick={() => change('number', nextWir)} title={`Use suggested ${nextWir}`}><Sparkles />{nextWir}</Button> : null}</div>{numberError ? <p className="mt-1 text-[10px] text-red-600">{numberError}</p> : numberAnalysis ? <p className="mt-1 text-[10px] text-muted-foreground">{numberAnalysis.kind === 'drawing-sheet' ? `Sheet type ${numberAnalysis.components.sheetType} + sub-type ${numberAnalysis.components.sheetSubType}${numberAnalysis.components.optionalDigits ? ` + optional ${numberAnalysis.components.optionalDigits}` : ''}` : numberAnalysis.note}</p> : null}</div>
        <div><SelectField label="Segment 5 · Floor level + plan area" name="location_code" value={form.location_code} required options={procoreReference.namingLocationSlots.map((item) => [item.code, `${item.code} · ${item.label}`])} onChange={(value) => change('location_code', value)} />{levelAreaAnalysis ? <p className={`mt-1 text-[10px] ${levelAreaAnalysis.officialStatus === 'matches' ? 'text-muted-foreground' : 'text-amber-700'}`}>{levelAreaAnalysis.note}</p> : null}</div><SelectField label="Segment 6 · Volume / System" name="volume_system_code" value={form.volume_system_code} required options={procoreReference.volumesSystems.map((item) => [item.code, `${item.code} · ${item.label}`])} onChange={(value) => change('volume_system_code', value)} /><SelectField label="Segment 7 · Classification" name="classification_code" value={form.classification_code} required options={procoreReference.namingClassificationSlots.map((item) => [item.code, `${item.code} · ${item.label}`])} onChange={(value) => change('classification_code', value)} /><SelectField label="Segment 8 · Originator" name="originator_code" value={form.originator_code} required options={procoreReference.originators.map((item) => [item.code, `${item.code} · ${item.label}`])} onChange={(value) => change('originator_code', value)} />
        <SelectField label="Revision" name="revision" value={form.revision} required options={procoreReference.revisionPatterns.map((item) => [item.code, item.label])} onChange={(value) => change('revision', value)} /><SelectField label="Status" name="status" value={form.status} required options={procoreReference.statuses.map((item) => [item.code, `${item.code} · ${item.label}`])} onChange={(value) => change('status', value)} /><SelectField label="Project stage" name="project_stage" value={form.project_stage} required options={procoreReference.projectStages.map((item) => [item.code, `${item.code} · ${item.label}`])} onChange={(value) => change('project_stage', value)} />
        <div className="sm:col-span-2 lg:col-span-4"><label htmlFor="description" className="mb-1.5 block text-xs font-medium">Description <span className="text-red-500">*</span></label><Textarea id="description" name="description" value={form.description} onChange={(event) => change('description', event.target.value)} required className="min-h-24" /></div>
        <div className={`sm:col-span-2 lg:col-span-4 rounded-xl border p-4 ${duplicate ? 'border-red-200 bg-red-50' : 'border-primary/20 bg-primary/[0.035]'}`}><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Generated document code</p><p className="mt-2 break-all font-mono text-sm font-semibold">{generatedCode || 'Select every code field to generate the document code.'}</p>{generatedSegments.length ? <div className="mt-3 grid gap-1.5 sm:grid-cols-4 lg:grid-cols-8">{generatedSegments.map((segment) => <div key={segment.key} className="rounded-md border bg-background px-2 py-1.5"><span className="block text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">{segment.position} · {segment.name}</span><span className="mt-0.5 block font-mono text-[11px] font-semibold">{segment.value}</span></div>)}</div> : null}{complianceNotes.length ? <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[10px] leading-4 text-amber-900"><p className="font-semibold">Official convention notes</p><ul className="mt-1 list-disc pl-4">{complianceNotes.map((note) => <li key={note}>{note}</li>)}</ul></div> : null}{duplicate ? <p className="mt-2 text-xs font-medium text-red-700">Already exists — duplicate document codes cannot be saved.</p> : null}</div>
        {feedback && editing !== undefined ? <div className={`sm:col-span-2 lg:col-span-4 rounded-lg border px-3 py-2.5 text-xs ${feedback.success ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>{feedback.message}</div> : null}<DialogFooter className="sm:col-span-2 lg:col-span-4"><Button type="button" variant="outline" onClick={() => setEditing(undefined)} disabled={isPending}>Cancel</Button><Button type="submit" disabled={isPending || duplicate || Boolean(numberError) || !generatedCode}>{isPending ? <LoaderCircle className="animate-spin" /> : null}{isPending ? 'Saving...' : 'Save document'}</Button></DialogFooter>
      </form></DialogContent></Dialog>

      <Dialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open && !isPending) setDeleting(null); }}><DialogContent className="sm:max-w-md"><DialogHeader><div className="mb-1 grid size-10 place-items-center rounded-full bg-red-50 text-red-600"><AlertTriangle className="size-5" /></div><DialogTitle>Delete document metadata?</DialogTitle><DialogDescription>This removes the QAQC metadata record. It does not delete a Procore file.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleting(null)} disabled={isPending}>Cancel</Button><Button variant="destructive" onClick={remove} disabled={isPending}>{isPending ? <LoaderCircle className="animate-spin" /> : <Trash2 />}{isPending ? 'Deleting...' : 'Delete record'}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

function SelectField({ label, name, value, options, required, onChange }: { label: string; name: string; value: string; options: [string, string][]; required?: boolean; onChange: (value: string) => void }) { const currentMissing = value && !options.some(([option]) => option === value); return <div><label htmlFor={name} className="mb-1.5 block text-xs font-medium">{label}{required ? <span className="ml-1 text-red-500">*</span> : null}</label><select id={name} name={name} value={value} onChange={(event) => onChange(event.target.value)} required={required} className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"><option value="">Select {label.toLowerCase()}</option>{currentMissing ? <option value={value}>{value} · Existing legacy value</option> : null}{options.map(([option, optionLabel]) => <option key={option} value={option}>{optionLabel}</option>)}</select></div>; }
function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) { return <select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 min-w-0 rounded-lg border border-input bg-background px-2 text-[11px] text-muted-foreground outline-none focus:border-ring" aria-label={label}><option value="">{label}</option>{options.map(([option, optionLabel]) => <option key={option} value={option}>{optionLabel}</option>)}</select>; }
function formatDateTime(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date); }

'use client';

import { useMemo, useState, useTransition } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, FileSpreadsheet, LoaderCircle, ShieldCheck, Upload, XCircle } from 'lucide-react';
import Link from 'next/link';

import { importProcoreDocumentsAction, type ProcoreImportActionResult } from '@/app/actions/procore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { analyzeProcoreCsv } from '@/lib/procore/csv';
import type { Project } from '@/types/qaqc';
import type { ProcoreCsvAnalysis } from '@/types/procore';

export function ProcoreCsvImport({ projects, existingCodes, loadError }: { projects: Project[]; existingCodes: string[]; loadError?: string | null }) {
  const [analysis, setAnalysis] = useState<ProcoreCsvAnalysis | null>(null);
  const [fileName, setFileName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcoreImportActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const importableRecords = useMemo(() => analysis?.rows.flatMap((row) => row.record && !row.duplicate ? [row.record] : []) ?? [], [analysis]);
  const blockingError = loadError ?? parseError;

  async function selectFile(file: File | undefined) {
    setAnalysis(null); setResult(null); setParseError(null); setFileName(file?.name ?? '');
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) { setParseError('Select a Procore CSV export.'); return; }
    try {
      const text = await file.text();
      const next = analyzeProcoreCsv(text, existingCodes);
      setAnalysis(next);
      if (next.missingColumns.length) setParseError(`Missing required columns: ${next.missingColumns.join(', ')}`);
    } catch {
      setParseError('The CSV could not be read. Confirm it is a valid UTF-8 Procore export.');
    }
  }

  function submitImport() {
    if (!projectId || !importableRecords.length || analysis?.missingColumns.length) return;
    const formData = new FormData();
    formData.set('project_id', projectId);
    formData.set('records', JSON.stringify(importableRecords));
    setResult(null);
    startTransition(async () => setResult(await importProcoreDocumentsAction(formData)));
  }

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><Button nativeButton={false} variant="ghost" size="sm" className="-ml-2 mb-2" render={<Link href="/documents" />}><ArrowLeft />Document register</Button><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Procore metadata bridge</p><h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-[30px]">Import Procore CSV</h1><p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">Validate and preview document metadata before importing it. PDF files are never uploaded by this process.</p></div></div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card><CardHeader><CardTitle>1. Select export</CardTitle></CardHeader><CardContent className="space-y-4"><label htmlFor="procore_csv_file" aria-label="Choose Procore Documents CSV" className="grid min-h-44 cursor-pointer place-items-center rounded-xl border border-dashed border-primary/30 bg-primary/[0.025] p-6 text-center transition-colors hover:bg-primary/[0.05]"><input id="procore_csv_file" type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => void selectFile(event.target.files?.[0])} /><span><span className="mx-auto grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><Upload className="size-5" /></span><span className="mt-3 block text-sm font-semibold">Choose Procore Documents CSV</span><span className="mt-1 block text-xs text-muted-foreground">{fileName || 'Only metadata is read locally before confirmation.'}</span></span></label>{blockingError ? <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800"><XCircle className="mt-0.5 size-4 shrink-0" />{blockingError}</div> : null}{analysis && !blockingError ? <div className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"><CheckCircle2 className="mt-0.5 size-4 shrink-0" />Required columns are present and the file parsed successfully.</div> : null}</CardContent></Card>
        <Card><CardHeader><CardTitle>2. Safe import</CardTitle></CardHeader><CardContent className="space-y-4"><div><label htmlFor="target_project" className="mb-1.5 block text-xs font-medium">Target QAQC project</label><select id="target_project" value={projectId} onChange={(event) => setProjectId(event.target.value)} className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"><option value="">Select target project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.project_code} · {project.name}</option>)}</select></div><div className="rounded-lg border bg-muted/35 p-3 text-xs leading-5 text-muted-foreground"><div className="flex items-center gap-2 font-semibold text-foreground"><ShieldCheck className="size-4 text-primary" />Default: skip duplicates</div><p className="mt-1">Existing document codes and duplicates inside the selected CSV are excluded. No existing metadata is updated.</p></div><Button className="w-full" size="lg" disabled={isPending || !projectId || !importableRecords.length || Boolean(blockingError)} onClick={submitImport}>{isPending ? <LoaderCircle className="animate-spin" /> : <FileSpreadsheet />}{isPending ? 'Importing...' : `Import ${importableRecords.length} valid records`}</Button>{result ? <output className={`block rounded-lg border p-3 text-xs leading-5 ${result.success ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>{result.message}</output> : null}</CardContent></Card>
      </div>

      {analysis ? <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><SummaryCard label="Total records" value={analysis.total} tone="neutral" /><SummaryCard label="Valid to import" value={analysis.valid} tone="success" /><SummaryCard label="Invalid records" value={analysis.invalid} tone="danger" /><SummaryCard label="Duplicates skipped" value={analysis.duplicates} tone="warning" /></div><Card className="gap-0 py-0"><CardHeader className="border-b"><CardTitle>Preview first records</CardTitle><p className="text-xs text-muted-foreground">Row numbers match the source CSV, including the header row.</p></CardHeader><div className="overflow-x-auto"><Table className="min-w-[1100px]"><TableHeader><TableRow><TableHead>Row</TableHead><TableHead>Document code / Name</TableHead><TableHead>Description</TableHead><TableHead>Type</TableHead><TableHead>Discipline</TableHead><TableHead>Revision</TableHead><TableHead>Validation</TableHead></TableRow></TableHeader><TableBody>{analysis.rows.slice(0, 12).map((row) => <TableRow key={row.rowNumber}><TableCell className="font-mono text-xs">{row.rowNumber}</TableCell><TableCell className="max-w-[320px] font-mono text-xs text-primary">{(row.record?.documentCode ?? row.rawName) || '—'}</TableCell><TableCell className="max-w-[280px] truncate text-xs">{row.record?.description ?? '—'}</TableCell><TableCell className="text-xs">{row.record?.documentTypeCode ?? '—'}</TableCell><TableCell className="text-xs">{row.record?.disciplineCode ?? '—'}</TableCell><TableCell className="font-mono text-xs">{row.record?.revision ?? '—'}</TableCell><TableCell>{row.duplicate ? <StatePill tone="warning" label="Already exists" /> : row.errors.length ? <span className="inline-flex max-w-72 items-start gap-1.5 text-xs text-red-700"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" />{row.errors.join(' ')}</span> : <StatePill tone="success" label="Valid" />}</TableCell></TableRow>)}</TableBody></Table></div></Card></> : null}
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: 'neutral' | 'success' | 'danger' | 'warning' }) { const colors = { neutral: 'text-foreground', success: 'text-emerald-700', danger: 'text-red-700', warning: 'text-amber-700' }; return <Card><CardContent className="p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p><p className={`mt-2 text-2xl font-semibold ${colors[tone]}`}>{value}</p></CardContent></Card>; }
function StatePill({ tone, label }: { tone: 'success' | 'warning'; label: string }) { return <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${tone === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{label}</span>; }

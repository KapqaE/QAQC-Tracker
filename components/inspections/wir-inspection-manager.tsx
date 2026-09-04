'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FileScan,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
  XCircle,
} from 'lucide-react';

import type { CrudActionResult } from '@/app/actions/records';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  buildDocumentCodeSegments,
  projectNamingCode,
} from '@/lib/procore/naming';
import {
  officialReferenceLabel,
  procoreReference,
} from '@/lib/procore/reference';
import {
  combineLevelPlanArea,
  generateProcoreWirFilename,
  generateWirDocumentCode,
  suggestNextWirNumber,
  WIR_FILE_TYPE_CODE,
  WIR_NUMBER_PATTERN,
} from '@/lib/wir/naming';
import type {
  WirPdfExtractedFields,
  WirPdfExtractionConflict,
} from '@/lib/wir/pdf-extraction-parser';
import { cn } from '@/lib/utils';
import type { Inspection, Project, ProjectDocument } from '@/types/qaqc';
import { inspectionResults, inspectionStatuses } from '@/types/qaqc';

type CrudAction = (formData: FormData) => Promise<CrudActionResult>;
type WirFormState = {
  project_id: string;
  project_code: string;
  wir_number: string;
  file_type_code: typeof WIR_FILE_TYPE_CODE;
  discipline_code: string;
  level_code: string;
  plan_area_code: string;
  volume_code: string;
  classification_code: string;
  originator_code: string;
  revision: string;
  inspection_item: string;
  file_title: string;
  source_filename: string;
  pile_location_numbers: string;
  inspection_type: string;
  consultant: string;
  contractor: string;
  inspector: string;
  reviewer_name: string;
  responsible_company: string;
  location_grid: string;
  planned_inspection_date: string;
  actual_inspection_date: string;
  inspection_time_window: string;
  method_statement: string;
  itp_reference: string;
  itp_revision: string;
  itp_item: string;
  itp_control_point: string;
  estimated_volume: string;
  drawing_reference: string;
  engineer_inspection_result: string;
  status: string;
  result: string;
  comments: string;
};
type PdfExtractionState = {
  status: 'idle' | 'extracting' | 'success' | 'error';
  message: string;
  percent: number;
  conflicts: WirPdfExtractionConflict[];
};

const baseForm: WirFormState = {
  project_id: '',
  project_code: '',
  wir_number: '',
  file_type_code: WIR_FILE_TYPE_CODE,
  discipline_code: '',
  level_code: 'XX',
  plan_area_code: '',
  volume_code: 'XX',
  classification_code: 'XXXX',
  originator_code: 'SRB',
  revision: 'R00',
  inspection_item: '',
  file_title: '',
  source_filename: '',
  pile_location_numbers: '',
  inspection_type: 'Work Inspection Request',
  consultant: 'ARUP',
  contractor: 'SERBAN',
  inspector: '',
  reviewer_name: '',
  responsible_company: 'SERBAN',
  location_grid: '',
  planned_inspection_date: '',
  actual_inspection_date: '',
  inspection_time_window: '',
  method_statement: '',
  itp_reference: '',
  itp_revision: '',
  itp_item: '',
  itp_control_point: '',
  estimated_volume: '',
  drawing_reference: '',
  engineer_inspection_result: '',
  status: 'Planned',
  result: '',
  comments: '',
};
const idlePdfExtraction: PdfExtractionState = {
  status: 'idle',
  message: '',
  percent: 0,
  conflicts: [],
};

export function WirInspectionManager({
  inspections,
  projects,
  documents,
  loadError,
  createAction,
  updateAction,
  deleteAction,
}: {
  inspections: Inspection[];
  projects: Project[];
  documents: ProjectDocument[];
  loadError?: string | null;
  createAction: CrudAction;
  updateAction: CrudAction;
  deleteAction: CrudAction;
}) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    project: '',
    discipline: '',
    status: '',
  });
  const [editing, setEditing] = useState<Inspection | null | undefined>(
    undefined,
  );
  const [deleting, setDeleting] = useState<Inspection | null>(null);
  const [form, setForm] = useState<WirFormState>(baseForm);
  const [feedback, setFeedback] = useState<CrudActionResult | null>(
    loadError ? { success: false, message: loadError } : null,
  );
  const [pdfExtraction, setPdfExtraction] =
    useState<PdfExtractionState>(idlePdfExtraction);
  const [isPending, startTransition] = useTransition();
  const isPdfExtracting = pdfExtraction.status === 'extracting';

  const mappedProjects = useMemo(
    () =>
      projects
        .map((project) => ({
          project,
          namingCode: projectNamingCode(project.project_code),
        }))
        .filter((item): item is { project: Project; namingCode: string } =>
          Boolean(item.namingCode),
        ),
    [projects],
  );
  const projectNames = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );
  const usedNumbers = useMemo(
    () => [
      ...inspections.map((inspection) => ({
        projectId: inspection.project_id,
        number: inspection.wir_number,
      })),
      ...documents
        .filter(
          (document) =>
            document.document_type_code === WIR_FILE_TYPE_CODE &&
            document.number?.startsWith('WIR.'),
        )
        .map((document) => ({
          projectId: document.project_id,
          number: document.number,
        })),
    ],
    [documents, inspections],
  );
  const scopedNumbers = useMemo(
    () =>
      usedNumbers
        .filter(
          (item) =>
            item.projectId === form.project_id &&
            item.number !== editing?.wir_number,
        )
        .map((item) => item.number),
    [editing?.wir_number, form.project_id, usedNumbers],
  );
  const nextWirNumber = form.project_id
    ? suggestNextWirNumber(scopedNumbers)
    : null;

  const complete = Boolean(
    form.project_code &&
    form.wir_number &&
    form.discipline_code &&
    form.level_code &&
    form.volume_code &&
    form.classification_code &&
    form.originator_code,
  );
  const fullDocumentCode = useMemo(
    () =>
      complete
        ? generateWirDocumentCode({
            projectCode: form.project_code,
            wirNumber: form.wir_number,
            disciplineCode: form.discipline_code,
            levelCode: form.level_code,
            planAreaCode: form.plan_area_code,
            volumeCode: form.volume_code,
            classificationCode: form.classification_code,
            originatorCode: form.originator_code,
          })
        : '',
    [
      complete,
      form.classification_code,
      form.discipline_code,
      form.level_code,
      form.originator_code,
      form.plan_area_code,
      form.project_code,
      form.volume_code,
      form.wir_number,
    ],
  );
  const codeSegments = useMemo(
    () =>
      complete
        ? buildDocumentCodeSegments({
            projectCode: form.project_code,
            documentTypeCode: WIR_FILE_TYPE_CODE,
            disciplineCode: form.discipline_code,
            number: form.wir_number,
            locationCode: combineLevelPlanArea(
              form.level_code,
              form.plan_area_code,
            ),
            volumeSystemCode: form.volume_code,
            classificationCode: form.classification_code,
            originatorCode: form.originator_code,
          })
        : [],
    [
      complete,
      form.classification_code,
      form.discipline_code,
      form.level_code,
      form.originator_code,
      form.plan_area_code,
      form.project_code,
      form.volume_code,
      form.wir_number,
    ],
  );
  const generatedFilename = useMemo(
    () =>
      generateProcoreWirFilename(
        fullDocumentCode,
        form.revision,
        form.inspection_item,
      ),
    [fullDocumentCode, form.inspection_item, form.revision],
  );
  const validWirNumber =
    !form.wir_number || WIR_NUMBER_PATTERN.test(form.wir_number);
  const duplicateWir = Boolean(
    form.project_id &&
    form.wir_number &&
    inspections.some(
      (inspection) =>
        inspection.id !== editing?.id &&
        inspection.project_id === form.project_id &&
        inspection.wir_number === form.wir_number,
    ),
  );
  const duplicateCode = Boolean(
    fullDocumentCode &&
    inspections.some(
      (inspection) =>
        inspection.id !== editing?.id &&
        inspection.full_document_code === fullDocumentCode,
    ),
  );
  const matchingDocument = fullDocumentCode
    ? documents.find(
        (document) =>
          (document.document_code || document.document_number) ===
          fullDocumentCode,
      )
    : null;

  const visibleRows = useMemo(
    () =>
      inspections.filter((inspection) => {
        const haystack =
          `${inspection.wir_number || inspection.inspection_number} ${inspection.full_document_code ?? ''} ${inspection.file_title ?? ''} ${inspection.source_filename ?? ''} ${inspection.description} ${inspection.discipline_code ?? inspection.discipline}`.toLowerCase();
        return (
          (!search || haystack.includes(search.toLowerCase())) &&
          (!filters.project || inspection.project_id === filters.project) &&
          (!filters.discipline ||
            inspection.discipline_code === filters.discipline) &&
          (!filters.status || inspection.status === filters.status)
        );
      }),
    [filters, inspections, search],
  );

  function change<K extends keyof WirFormState>(
    key: K,
    value: WirFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openCreate() {
    const initialProject =
      mappedProjects.length === 1 ? mappedProjects[0] : null;
    const initialNumber = initialProject
      ? (suggestNextWirNumber(
          usedNumbers
            .filter((item) => item.projectId === initialProject.project.id)
            .map((item) => item.number),
        ) ?? '')
      : '';
    setEditing(null);
    setFeedback(null);
    setPdfExtraction(idlePdfExtraction);
    setForm({
      ...baseForm,
      project_id: initialProject?.project.id ?? '',
      project_code: initialProject?.namingCode ?? '',
      wir_number: initialNumber,
    });
  }

  function openEdit(inspection: Inspection) {
    const mappedProject = mappedProjects.find(
      (item) => item.project.id === inspection.project_id,
    );
    const fallbackDiscipline =
      procoreReference.eas6bDisciplines.find(
        (item) => item.label === inspection.discipline,
      )?.code ?? '';
    const suggested =
      suggestNextWirNumber(
        usedNumbers
          .filter(
            (item) =>
              item.projectId === inspection.project_id &&
              item.number !== inspection.wir_number,
          )
          .map((item) => item.number),
      ) ?? '';
    setEditing(inspection);
    setFeedback(null);
    setPdfExtraction(idlePdfExtraction);
    setForm({
      project_id: inspection.project_id,
      project_code: mappedProject?.namingCode ?? '',
      wir_number:
        inspection.wir_number ??
        (WIR_NUMBER_PATTERN.test(inspection.inspection_number)
          ? inspection.inspection_number
          : suggested),
      file_type_code: WIR_FILE_TYPE_CODE,
      discipline_code: inspection.discipline_code ?? fallbackDiscipline,
      level_code: inspection.level_code ?? 'XX',
      plan_area_code: inspection.plan_area_code ?? '',
      volume_code: inspection.volume_code ?? 'XX',
      classification_code: inspection.classification_code ?? 'XXXX',
      originator_code: inspection.originator_code ?? 'SRB',
      revision: inspection.revision ?? 'R00',
      inspection_item: inspection.inspection_item ?? inspection.description,
      file_title: inspection.file_title ?? `WIR ${inspection.description}`,
      source_filename: inspection.source_filename ?? '',
      pile_location_numbers: inspection.pile_location_numbers ?? '',
      inspection_type: inspection.inspection_type,
      consultant: inspection.consultant ?? 'ARUP',
      contractor:
        inspection.contractor ?? inspection.responsible_company ?? 'SERBAN',
      inspector: inspection.inspector,
      reviewer_name: inspection.reviewer_name ?? '',
      responsible_company: inspection.responsible_company,
      location_grid: inspection.location_grid ?? '',
      planned_inspection_date: inspection.planned_inspection_date,
      actual_inspection_date: inspection.actual_inspection_date ?? '',
      inspection_time_window: inspection.inspection_time_window ?? '',
      method_statement: inspection.method_statement ?? '',
      itp_reference: inspection.itp_reference ?? '',
      itp_revision: inspection.itp_revision ?? '',
      itp_item: inspection.itp_item ?? '',
      itp_control_point: inspection.itp_control_point ?? '',
      estimated_volume: inspection.estimated_volume ?? '',
      drawing_reference: inspection.drawing_reference ?? '',
      engineer_inspection_result: inspection.engineer_inspection_result ?? '',
      status: inspection.status,
      result: inspection.result ?? '',
      comments: inspection.comments ?? '',
    });
  }

  async function importPdf(file: File) {
    setFeedback(null);
    setPdfExtraction({
      status: 'extracting',
      message: 'Preparing local extraction...',
      percent: 1,
      conflicts: [],
    });
    try {
      const { extractWirPdfInBrowser } =
        await import('@/lib/wir/pdf-extraction.client');
      const extracted = await extractWirPdfInBrowser(
        file,
        ({ label, percent }) =>
          setPdfExtraction((current) => ({
            ...current,
            status: 'extracting',
            message: label,
            percent,
          })),
        (filenameFields) => {
          applyExtractedFields(filenameFields);
          if (filenameFields.full_document_code) {
            setPdfExtraction({
              status: 'extracting',
              message: 'Filename parsed. Reading the WIR form locally...',
              percent: 3,
              conflicts: [],
            });
          }
        },
      );
      applyExtractedFields(extracted);
      const count = Object.keys(extracted).filter(
        (key) => key !== 'conflicts',
      ).length;
      const conflicts = extracted.conflicts ?? [];
      setPdfExtraction({
        status: 'success',
        message: `${count} editable field${count === 1 ? '' : 's'} extracted${conflicts.length ? ` with ${conflicts.length} filename/PDF difference${conflicts.length === 1 ? '' : 's'} to review` : ''}. The PDF has been discarded and was not uploaded.`,
        percent: 100,
        conflicts,
      });
    } catch (error) {
      setPdfExtraction({
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Extraction failed. The PDF was discarded.',
        percent: 0,
        conflicts: [],
      });
    }
  }

  function applyExtractedFields(extracted: WirPdfExtractedFields) {
    const extractedProjectCode =
      extracted.project_code === 'IL05' ? 'IL051' : extracted.project_code;
    const matchedProject = mappedProjects.find(
      (item) => item.namingCode === extractedProjectCode,
    );
    setForm((current) => ({
      ...current,
      ...(matchedProject
        ? {
            project_id: matchedProject.project.id,
            project_code: matchedProject.namingCode,
          }
        : {}),
      wir_number: extracted.wir_number ?? current.wir_number,
      discipline_code: extracted.discipline_code ?? current.discipline_code,
      level_code: extracted.level_code ?? current.level_code,
      plan_area_code: extracted.plan_area_code ?? current.plan_area_code,
      volume_code: extracted.volume_code ?? current.volume_code,
      classification_code:
        extracted.classification_code ?? current.classification_code,
      originator_code: extracted.originator_code ?? current.originator_code,
      revision: extracted.revision ?? current.revision,
      inspection_item:
        extracted.inspection_item ??
        extracted.description ??
        current.inspection_item,
      file_title: extracted.file_title ?? current.file_title,
      source_filename: extracted.source_filename ?? current.source_filename,
      pile_location_numbers:
        extracted.pile_location_numbers ?? current.pile_location_numbers,
      inspection_type: extracted.inspection_type ?? current.inspection_type,
      consultant: extracted.consultant ?? current.consultant,
      contractor: extracted.contractor ?? current.contractor,
      inspector: extracted.inspector ?? current.inspector,
      reviewer_name: extracted.reviewer_name ?? current.reviewer_name,
      responsible_company:
        extracted.responsible_company ?? current.responsible_company,
      location_grid: extracted.location_grid ?? current.location_grid,
      planned_inspection_date:
        extracted.planned_inspection_date ?? current.planned_inspection_date,
      actual_inspection_date:
        extracted.actual_inspection_date ?? current.actual_inspection_date,
      inspection_time_window:
        extracted.inspection_time_window ?? current.inspection_time_window,
      method_statement: extracted.method_statement ?? current.method_statement,
      itp_reference: extracted.itp_reference ?? current.itp_reference,
      itp_revision: extracted.itp_revision ?? current.itp_revision,
      itp_item: extracted.itp_item ?? current.itp_item,
      itp_control_point:
        extracted.itp_control_point ?? current.itp_control_point,
      estimated_volume: extracted.estimated_volume ?? current.estimated_volume,
      drawing_reference:
        extracted.drawing_reference ?? current.drawing_reference,
      engineer_inspection_result:
        extracted.engineer_inspection_result ??
        current.engineer_inspection_result,
      status: extracted.status ?? current.status,
      result: extracted.result ?? current.result,
      comments: extracted.comments ?? current.comments,
    }));
  }

  function save(formData: FormData) {
    if (!validWirNumber || duplicateWir || duplicateCode || !fullDocumentCode)
      return;
    if (editing?.id) formData.set('id', editing.id);
    setFeedback(null);
    startTransition(async () => {
      const result = editing?.id
        ? await updateAction(formData)
        : await createAction(formData);
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

  const filtersActive = Boolean(
    search || filters.project || filters.discipline || filters.status,
  );
  const structuredCount = inspections.filter(
    (inspection) => inspection.wir_number && inspection.full_document_code,
  ).length;

  return (
    <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-5">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            Quality Records · WIR
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-[30px]">
            Work Inspection Requests
          </h1>
          <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">
            Plan inspections, preserve the EAS-6-B identity, import locally from
            real WIR PDFs, and control inspection review and closure.
          </p>
        </div>
        <Button
          size="lg"
          onClick={openCreate}
          disabled={Boolean(loadError) || !mappedProjects.length}
        >
          <Plus />
          Create WIR inspection
        </Button>
      </div>

      {feedback ? (
        <output
          className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-xs ${feedback.success ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Dismiss message"
          >
            <X className="size-3.5" />
          </button>
        </output>
      ) : null}
      {!mappedProjects.length ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
          <strong>A mapped project is required.</strong> Set the QAQC project
          code to <code>IL05</code> or <code>IL051</code> before creating a WIR.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Inspection records" value={String(inspections.length)} />
        <Metric label="Structured WIRs" value={String(structuredCount)} />
        <Metric
          label="Legacy inspections preserved"
          value={String(inspections.length - structuredCount)}
        />
      </div>

      <Card className="gap-0 py-0">
        <CardContent className="border-b p-4">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(280px,1fr)_repeat(3,minmax(150px,auto))]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-9 bg-muted/45 pl-9"
                placeholder="Search WIR number, code, description..."
                aria-label="Search WIR inspections"
              />
            </div>
            <FilterSelect
              label="All projects"
              value={filters.project}
              onChange={(value) =>
                setFilters((current) => ({ ...current, project: value }))
              }
              options={projects.map((project) => [project.id, project.name])}
            />
            <FilterSelect
              label="All disciplines"
              value={filters.discipline}
              onChange={(value) =>
                setFilters((current) => ({ ...current, discipline: value }))
              }
              options={procoreReference.eas6bDisciplines.map((item) => [
                item.code,
                `${item.code} · ${item.label}`,
              ])}
            />
            <FilterSelect
              label="All statuses"
              value={filters.status}
              onChange={(value) =>
                setFilters((current) => ({ ...current, status: value }))
              }
              options={inspectionStatuses.map((item) => [item, item])}
            />
          </div>
          {filtersActive ? (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => {
                setSearch('');
                setFilters({ project: '', discipline: '', status: '' });
              }}
            >
              <X />
              Clear filters
            </Button>
          ) : null}
        </CardContent>

        {visibleRows.length ? (
          <div className="overflow-x-auto">
            <Table className="min-w-[1280px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {[
                    'WIR number',
                    'Full document code',
                    'Discipline',
                    'Description',
                    'Planned date',
                    'Status',
                    'Result',
                    'Actions',
                  ].map((label) => (
                    <TableHead
                      key={label}
                      className="h-11 text-[10px] uppercase tracking-wider text-muted-foreground first:pl-4 last:pr-4 last:text-right"
                    >
                      {label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.map((inspection) => (
                  <TableRow key={inspection.id}>
                    <TableCell className="pl-4">
                      <Link href={`/wir/${inspection.id}`} className="font-mono text-xs font-semibold text-primary hover:underline">
                        {inspection.wir_number || inspection.inspection_number}
                      </Link>
                      {!inspection.wir_number ? (
                        <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                          Legacy
                        </span>
                      ) : null}
                      {inspection.revision ? (
                        <span className="mt-1 block font-mono text-[10px] text-muted-foreground">
                          Rev {inspection.revision}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-[360px] font-mono text-[11px] font-medium">
                      {inspection.full_document_code || 'Not structured yet'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {inspection.discipline_code
                        ? `${inspection.discipline_code} · ${officialReferenceLabel(procoreReference.eas6bDisciplines, inspection.discipline_code)}`
                        : inspection.discipline}
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <Link href={`/wir/${inspection.id}`} className="block truncate font-medium hover:text-primary">
                        {inspection.description}
                      </Link>
                      <span className="mt-1 block text-[10px] text-muted-foreground">
                        {projectNames.get(inspection.project_id) ??
                          'Unknown project'}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatDate(inspection.planned_inspection_date)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={inspection.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {inspection.result || '—'}
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(inspection)}
                          aria-label="Edit WIR inspection"
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => {
                            setDeleting(inspection);
                            setFeedback(null);
                          }}
                          aria-label="Delete WIR inspection"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <Empty className="m-4 min-h-72 border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ClipboardCheck />
              </EmptyMedia>
              <EmptyTitle>
                {filtersActive
                  ? 'No matching WIR inspections'
                  : 'No inspections yet'}
              </EmptyTitle>
              <EmptyDescription>
                {filtersActive
                  ? 'Adjust or clear the filters.'
                  : 'Create WIR.0001 to start the project inspection register.'}
              </EmptyDescription>
            </EmptyHeader>
            {!filtersActive ? (
              <Button
                onClick={openCreate}
                disabled={Boolean(loadError) || !mappedProjects.length}
              >
                <Plus />
                Create WIR inspection
              </Button>
            ) : null}
          </Empty>
        )}
      </Card>

      <Dialog
        open={editing !== undefined}
        onOpenChange={(open) => {
          if (!open && !isPending && !isPdfExtracting) setEditing(undefined);
        }}
      >
        <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? 'Edit WIR inspection' : 'Create WIR inspection'}
            </DialogTitle>
            <DialogDescription>
              The full code is generated from eight controlled segments.
              Existing legacy inspections are converted only when you save them.
            </DialogDescription>
          </DialogHeader>
          <form
            action={save}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="sm:col-span-2 lg:col-span-4 rounded-xl border border-dashed border-primary/30 bg-primary/[0.025] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <FileScan className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">
                      Pre-fill from a WIR PDF
                    </p>
                    <p className="mt-0.5 max-w-2xl text-xs leading-5 text-muted-foreground">
                      The PDF is read only in this browser for extraction. It is
                      never sent to Supabase, attached to the form, or retained
                      after processing.
                    </p>
                  </div>
                </div>
                <label
                  htmlFor="wir_pdf_import"
                  className={cn(
                    buttonVariants({ variant: 'outline' }),
                    isPdfExtracting && 'pointer-events-none opacity-50',
                  )}
                  aria-disabled={isPdfExtracting}
                >
                  <Upload />
                  {isPdfExtracting ? 'Extracting...' : 'Choose WIR PDF'}
                </label>
                <input
                  id="wir_pdf_import"
                  type="file"
                  accept="application/pdf,.pdf"
                  className="sr-only"
                  disabled={isPdfExtracting}
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = '';
                    if (file) void importPdf(file);
                  }}
                />
              </div>
              {pdfExtraction.status !== 'idle' ? (
                <div
                  className={`mt-3 rounded-lg border px-3 py-2.5 text-xs ${pdfExtraction.status === 'error' ? 'border-red-200 bg-red-50 text-red-800' : pdfExtraction.status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-primary/20 bg-background text-foreground'}`}
                >
                  <div className="flex items-center gap-2">
                    {pdfExtraction.status === 'extracting' ? (
                      <LoaderCircle className="size-4 shrink-0 animate-spin text-primary" />
                    ) : pdfExtraction.status === 'success' ? (
                      <CheckCircle2 className="size-4 shrink-0" />
                    ) : (
                      <XCircle className="size-4 shrink-0" />
                    )}
                    <span>{pdfExtraction.message}</span>
                  </div>
                  {pdfExtraction.status === 'extracting' ? (
                    <progress
                      className="mt-2 h-1.5 w-full overflow-hidden rounded-full accent-primary"
                      aria-label="WIR PDF extraction progress"
                      value={pdfExtraction.percent}
                      max={100}
                    />
                  ) : null}
                  {pdfExtraction.conflicts.length ? (
                    <ul className="mt-2 space-y-1 border-t border-amber-200 pt-2 text-amber-900">
                      {pdfExtraction.conflicts.map((conflict) => (
                        <li key={`${conflict.field}-${conflict.filenameValue}`}>
                          <strong>
                            {conflict.field.replaceAll('_', ' ')}:
                          </strong>{' '}
                          filename “{conflict.filenameValue}” / PDF “
                          {conflict.pdfValue}”. The{' '}
                          {conflict.selectedSource === 'pdf'
                            ? 'PDF'
                            : 'filename'}{' '}
                          value was pre-filled; review it before saving.
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>
            <SelectField
              label="Project"
              name="project_id"
              value={form.project_id}
              required
              options={mappedProjects.map(({ project, namingCode }) => [
                project.id,
                `${namingCode} · ${project.name}`,
              ])}
              onChange={(value) => {
                const match = mappedProjects.find(
                  (item) => item.project.id === value,
                );
                const number =
                  suggestNextWirNumber(
                    usedNumbers
                      .filter((item) => item.projectId === value)
                      .map((item) => item.number),
                  ) ?? '';
                setForm((current) => ({
                  ...current,
                  project_id: value,
                  project_code: match?.namingCode ?? '',
                  wir_number: editing?.id ? current.wir_number : number,
                }));
              }}
            />
            <input
              type="hidden"
              name="project_code"
              value={form.project_code}
            />
            <div>
              <label
                htmlFor="wir_number"
                className="mb-1.5 block text-xs font-medium"
              >
                WIR number <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <Input
                  id="wir_number"
                  name="wir_number"
                  value={form.wir_number}
                  onChange={(event) =>
                    change('wir_number', event.target.value.toUpperCase())
                  }
                  required
                  placeholder="WIR.0001"
                  className="font-mono"
                />
                {nextWirNumber ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => change('wir_number', nextWirNumber)}
                    title={`Use suggested ${nextWirNumber}`}
                  >
                    <Sparkles />
                    {nextWirNumber}
                  </Button>
                ) : null}
              </div>
              {!validWirNumber ? (
                <p className="mt-1 text-[10px] text-red-600">
                  Use WIR. followed by four digits, for example WIR.0001.
                </p>
              ) : null}
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-medium">
                File type
              </span>
              <div className="flex h-9 items-center rounded-lg border bg-muted/35 px-3 font-mono text-sm">
                <FileCheck2 className="mr-2 size-4 text-primary" />
                IP · Inspection Test Plan
              </div>
              <input
                type="hidden"
                name="file_type_code"
                value={WIR_FILE_TYPE_CODE}
              />
            </div>
            <SelectField
              label="Discipline"
              name="discipline_code"
              value={form.discipline_code}
              required
              options={procoreReference.eas6bDisciplines.map((item) => [
                item.code,
                `${item.code} · ${item.label}`,
              ])}
              onChange={(value) => change('discipline_code', value)}
            />
            <SelectField
              label="Level"
              name="level_code"
              value={form.level_code}
              required
              options={procoreReference.eas6bLevels.map((item) => [
                item.code,
                `${item.code} · ${item.label}`,
              ])}
              onChange={(value) => change('level_code', value)}
            />
            <SelectField
              label="Plan Area"
              name="plan_area_code"
              value={form.plan_area_code}
              options={procoreReference.eas6bPlanAreas.map((item) => [
                item.code,
                `${item.code} · ${item.label}`,
              ])}
              onChange={(value) => change('plan_area_code', value)}
              allowBlank
            />
            <SelectField
              label="Volume"
              name="volume_code"
              value={form.volume_code}
              required
              options={procoreReference.eas6bVolumes.map((item) => [
                item.code,
                `${item.code} · ${item.label}`,
              ])}
              onChange={(value) => change('volume_code', value)}
            />
            <SelectField
              label="Classification"
              name="classification_code"
              value={form.classification_code}
              required
              options={procoreReference.eas6bClassifications.map((item) => [
                item.code,
                `${item.code} · ${item.label}`,
              ])}
              onChange={(value) => change('classification_code', value)}
            />
            <SelectField
              label="Originator"
              name="originator_code"
              value={form.originator_code}
              required
              options={procoreReference.eas6bOriginators.map((item) => [
                item.code,
                `${item.code} · ${item.label}`,
              ])}
              onChange={(value) => change('originator_code', value)}
            />
            <TextField
              label="Revision"
              name="revision"
              value={form.revision}
              onChange={(value) => change('revision', value.toUpperCase())}
              required
            />
            <div className="sm:col-span-2 lg:col-span-4">
              <label
                htmlFor="inspection_item"
                className="mb-1.5 block text-xs font-medium"
              >
                Inspection Request Item / Description{' '}
                <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="inspection_item"
                name="inspection_item"
                value={form.inspection_item}
                onChange={(event) => {
                  const inspectionItem = event.target.value;
                  setForm((current) => {
                    const previousAutomaticTitle = current.inspection_item
                      ? `WIR ${current.inspection_item}`
                      : '';
                    const pileNumbers = inspectionItem
                      .match(/\((\d+(?:\s*-\s*\d+)+)\)/)?.[1]
                      ?.replace(/\s+/g, '');
                    return {
                      ...current,
                      inspection_item: inspectionItem,
                      file_title:
                        !current.file_title ||
                        current.file_title === previousAutomaticTitle
                          ? inspectionItem
                            ? `WIR ${inspectionItem}`
                            : ''
                          : current.file_title,
                      pile_location_numbers:
                        pileNumbers ?? current.pile_location_numbers,
                    };
                  });
                }}
                required
                className="min-h-24"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                This is the primary description. Pile/location numbers in
                parentheses are preserved.
              </p>
            </div>
            <div className="sm:col-span-2">
              <TextField
                label="File title"
                name="file_title"
                value={form.file_title}
                onChange={(value) => change('file_title', value)}
                required
              />
            </div>
            <TextField
              label="Pile / location numbers"
              name="pile_location_numbers"
              value={form.pile_location_numbers}
              onChange={(value) => change('pile_location_numbers', value)}
            />
            <TextField
              label="Inspection type"
              name="inspection_type"
              value={form.inspection_type}
              onChange={(value) => change('inspection_type', value)}
              required
            />
            <TextField
              label="To / Consultant"
              name="consultant"
              value={form.consultant}
              onChange={(value) => change('consultant', value)}
            />
            <TextField
              label="From / Contractor"
              name="contractor"
              value={form.contractor}
              onChange={(value) => change('contractor', value)}
            />
            <TextField
              label="Inspector"
              name="inspector"
              value={form.inspector}
              onChange={(value) => change('inspector', value)}
              required
            />
            <TextField
              label="Reviewer name"
              name="reviewer_name"
              value={form.reviewer_name}
              onChange={(value) => change('reviewer_name', value)}
            />
            <TextField
              label="Responsible company"
              name="responsible_company"
              value={form.responsible_company}
              onChange={(value) => change('responsible_company', value)}
              required
            />
            <TextField
              label="Location / Grid"
              name="location_grid"
              value={form.location_grid}
              onChange={(value) => change('location_grid', value)}
            />
            <TextField
              label="Planned date"
              name="planned_inspection_date"
              value={form.planned_inspection_date}
              onChange={(value) => change('planned_inspection_date', value)}
              type="date"
              required
            />
            <TextField
              label="Time window"
              name="inspection_time_window"
              value={form.inspection_time_window}
              onChange={(value) => change('inspection_time_window', value)}
            />
            <TextField
              label="Actual date"
              name="actual_inspection_date"
              value={form.actual_inspection_date}
              onChange={(value) => change('actual_inspection_date', value)}
              type="date"
            />
            <div className="sm:col-span-2">
              <TextField
                label="Method Statement Ref. / Rev."
                name="method_statement"
                value={form.method_statement}
                onChange={(value) => change('method_statement', value)}
              />
            </div>
            <div className="sm:col-span-2">
              <TextField
                label="ITP reference"
                name="itp_reference"
                value={form.itp_reference}
                onChange={(value) => change('itp_reference', value)}
              />
            </div>
            <TextField
              label="ITP revision"
              name="itp_revision"
              value={form.itp_revision}
              onChange={(value) => change('itp_revision', value)}
            />
            <TextField
              label="ITP item"
              name="itp_item"
              value={form.itp_item}
              onChange={(value) => change('itp_item', value)}
            />
            <TextField
              label="ITP control point"
              name="itp_control_point"
              value={form.itp_control_point}
              onChange={(value) => change('itp_control_point', value)}
            />
            <TextField
              label="Estimated volume"
              name="estimated_volume"
              value={form.estimated_volume}
              onChange={(value) => change('estimated_volume', value)}
            />
            <div className="sm:col-span-2">
              <TextField
                label="Drawing reference"
                name="drawing_reference"
                value={form.drawing_reference}
                onChange={(value) => change('drawing_reference', value)}
              />
            </div>
            <SelectField
              label="Status"
              name="status"
              value={form.status}
              required
              options={inspectionStatuses.map((item) => [item, item])}
              onChange={(value) => change('status', value)}
            />
            <SelectField
              label="Result"
              name="result"
              value={form.result}
              options={inspectionResults.map((item) => [item, item])}
              onChange={(value) => change('result', value)}
              allowBlank
            />
            <TextField
              label="Engineer inspection result (as read)"
              name="engineer_inspection_result"
              value={form.engineer_inspection_result}
              onChange={(value) => change('engineer_inspection_result', value)}
            />
            <input
              type="hidden"
              name="source_filename"
              value={form.source_filename}
            />
            <div className="sm:col-span-2 lg:col-span-4">
              <label
                htmlFor="comments"
                className="mb-1.5 block text-xs font-medium"
              >
                Comments
              </label>
              <Textarea
                id="comments"
                name="comments"
                value={form.comments}
                onChange={(event) => change('comments', event.target.value)}
                className="min-h-20"
              />
            </div>
            <div
              className={`sm:col-span-2 lg:col-span-4 rounded-xl border p-4 ${duplicateWir || duplicateCode ? 'border-red-200 bg-red-50' : 'border-primary/20 bg-primary/[0.035]'}`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                Generated full document code
              </p>
              <p className="mt-2 break-all font-mono text-sm font-semibold">
                {fullDocumentCode ||
                  'Complete the controlled code fields to generate the full document code.'}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                The EAS-6-B document code ends at the Originator segment. The
                revision and title are filename metadata, not code segments.
              </p>
              {codeSegments.length ? (
                <div className="mt-3 grid gap-1.5 sm:grid-cols-4 lg:grid-cols-8">
                  {codeSegments.map((segment) => (
                    <div
                      key={segment.key}
                      className="rounded-md border bg-background px-2 py-1.5"
                    >
                      <span className="block text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {segment.position} · {segment.name}
                      </span>
                      <span className="mt-0.5 block font-mono text-[11px] font-semibold">
                        {segment.value}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="mt-3 rounded-lg border bg-background px-3 py-2.5">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Generated Procore filename
                </p>
                <p className="mt-1 break-all font-mono text-[11px] font-semibold">
                  {generatedFilename ||
                    'Complete the document code, revision, and inspection item.'}
                </p>
                {form.source_filename ? (
                  <p className="mt-2 break-all text-[10px] text-muted-foreground">
                    Original filename: {form.source_filename}
                  </p>
                ) : null}
              </div>
              {duplicateWir ? (
                <p className="mt-2 text-xs font-medium text-red-700">
                  This WIR number already exists for the selected project.
                </p>
              ) : null}
              {duplicateCode ? (
                <p className="mt-2 text-xs font-medium text-red-700">
                  This full document code already exists in the inspection
                  register.
                </p>
              ) : null}
              {matchingDocument ? (
                <p className="mt-2 text-xs font-medium text-emerald-700">
                  A matching Procore document exists and will be linked
                  automatically.
                </p>
              ) : null}
            </div>
            {feedback && editing !== undefined ? (
              <div
                className={`sm:col-span-2 lg:col-span-4 rounded-lg border px-3 py-2.5 text-xs ${feedback.success ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}
              >
                {feedback.message}
              </div>
            ) : null}
            <DialogFooter className="sm:col-span-2 lg:col-span-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(undefined)}
                disabled={isPending || isPdfExtracting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isPending ||
                  isPdfExtracting ||
                  !validWirNumber ||
                  duplicateWir ||
                  duplicateCode ||
                  !fullDocumentCode
                }
              >
                {isPending ? <LoaderCircle className="animate-spin" /> : null}
                {isPending ? 'Saving...' : 'Save WIR inspection'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open && !isPending) setDeleting(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-1 grid size-10 place-items-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle className="size-5" />
            </div>
            <DialogTitle>Delete WIR inspection?</DialogTitle>
            <DialogDescription>
              This removes the inspection record. A linked Procore document
              remains unchanged.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleting(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={remove} disabled={isPending}>
              {isPending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Trash2 />
              )}
              {isPending ? 'Deleting...' : 'Delete inspection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SelectField({
  label,
  name,
  value,
  options,
  required,
  allowBlank,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  options: [string, string][];
  required?: boolean;
  allowBlank?: boolean;
  onChange: (value: string) => void;
}) {
  const legacy = Boolean(
    value && !options.some(([option]) => option === value),
  );
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-xs font-medium">
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
      >
        <option value="" disabled={required && !allowBlank}>
          {allowBlank
            ? `No ${label.toLowerCase()}`
            : `Select ${label.toLowerCase()}`}
        </option>
        {legacy ? (
          <option value={value}>{value} · Existing legacy value</option>
        ) : null}
        {options.map(([option, optionLabel]) => (
          <option key={option} value={option}>
            {optionLabel}
          </option>
        ))}
      </select>
    </div>
  );
}
function TextField({
  label,
  name,
  value,
  onChange,
  type = 'text',
  required,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'date';
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-xs font-medium">
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </label>
      <Input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
      />
    </div>
  );
}
function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 min-w-0 rounded-lg border border-input bg-background px-2 text-[11px] text-muted-foreground outline-none focus:border-ring"
      aria-label={label}
    >
      <option value="">{label}</option>
      {options.map(([option, optionLabel]) => (
        <option key={option} value={option}>
          {optionLabel}
        </option>
      ))}
    </select>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-mono text-xl font-semibold">{value}</p>
    </div>
  );
}
function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(date);
}

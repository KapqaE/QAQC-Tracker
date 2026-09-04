import Papa from 'papaparse';

import { parseDocumentCode, splitCodeLabel } from '@/lib/procore/naming';
import { procoreCsvRowSchema, procoreRequiredColumns } from '@/lib/procore/schema';
import type { ProcoreCsvAnalysis, ProcoreCsvRow, ProcoreImportPreviewRow, ProcoreImportRecord } from '@/types/procore';

function normalizeRow(row: ProcoreCsvRow, parsedCode: NonNullable<ReturnType<typeof parseDocumentCode>>): ProcoreImportRecord {
  const type = splitCodeLabel(row.Type);
  const discipline = splitCodeLabel(row.Discipline);
  return {
    ...parsedCode,
    description: row.Description.trim(),
    revision: row.Revision.trim(),
    version: row.Version.trim(),
    status: splitCodeLabel(row.Status).code,
    projectStage: splitCodeLabel(row['Project Stage']).code,
    workflowStatus: row['Workflow Status'].trim() || null,
    currentWorkflowStep: row['Current Workflow Step'].trim() || null,
    assignedWorkflow: row['Assigned Workflow'].trim() || null,
    fileName: row.File.trim(),
    dateUploaded: new Date(row['Date Uploaded']).toISOString(),
    dateUpdated: new Date(row['Date Updated']).toISOString(),
    procoreName: row.Name.trim(),
    procoreProject: row.Project.trim(),
    documentTypeLabel: type.label,
    disciplineLabel: discipline.label,
    sourceLocationCode: splitCodeLabel(row.Location).code,
    sourceClassificationCode: splitCodeLabel(row.Classification).code,
  };
}

export function analyzeProcoreCsv(csvText: string, existingCodes: Iterable<string> = []): ProcoreCsvAnalysis {
  const parsed = Papa.parse<Record<string, string>>(csvText, { header: true, skipEmptyLines: 'greedy' });
  const headers = parsed.meta.fields ?? [];
  const missingColumns = procoreRequiredColumns.filter((column) => !headers.includes(column));
  const existing = new Set([...existingCodes].map((code) => code.trim().toUpperCase()));
  const seen = new Set<string>();

  const rows: ProcoreImportPreviewRow[] = parsed.data.map((raw, index) => {
    const errors = parsed.errors.filter((error) => error.row === index).map((error) => error.message);
    const validated = procoreCsvRowSchema.safeParse(raw);
    if (!validated.success) errors.push(...validated.error.issues.map((issue) => issue.message));
    const parsedCode = validated.success ? parseDocumentCode(validated.data.Name) : null;
    if (validated.success && !parsedCode) errors.push('Name does not contain the eight-part Procore document code.');
    if (validated.success && parsedCode) {
      const comparisons = [
        [parsedCode.documentTypeCode, splitCodeLabel(validated.data.Type).code, 'Type'],
        [parsedCode.disciplineCode, splitCodeLabel(validated.data.Discipline).code, 'Discipline'],
        [parsedCode.number, validated.data.Number.trim(), 'Number'],
        [parsedCode.volumeSystemCode, splitCodeLabel(validated.data['Volume / System']).code, 'Volume / System'],
        [parsedCode.originatorCode, splitCodeLabel(validated.data.Originator).code, 'Originator'],
      ];
      for (const [nameCode, fieldCode, label] of comparisons) if (nameCode !== fieldCode) errors.push(`${label} does not match the Name code.`);
    }
    const record = validated.success && parsedCode && !errors.length ? normalizeRow(validated.data as ProcoreCsvRow, parsedCode) : null;
    const normalizedCode = record?.documentCode.toUpperCase() ?? '';
    const duplicate = Boolean(normalizedCode && (existing.has(normalizedCode) || seen.has(normalizedCode)));
    if (normalizedCode) seen.add(normalizedCode);
    return { rowNumber: index + 2, rawName: String(raw.Name ?? ''), record, errors, duplicate };
  });

  return {
    headers,
    missingColumns,
    rows,
    total: rows.length,
    valid: rows.filter((row) => row.record && !row.duplicate).length,
    invalid: rows.filter((row) => !row.record).length,
    duplicates: rows.filter((row) => row.duplicate).length,
  };
}

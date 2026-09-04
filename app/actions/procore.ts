'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireUser } from '@/lib/auth';
import { findExistingDocumentCodes, importDocuments } from '@/lib/services/documents';
import { procoreImportRecordSchema } from '@/lib/procore/schema';
import { createClient } from '@/lib/supabase/server';
import type { TablesInsert } from '@/types/database';

export type ProcoreImportActionResult = {
  success: boolean;
  message: string;
  imported: number;
  skipped: number;
};

const requestSchema = z.object({
  projectId: z.uuid('Select the target QAQC project.'),
  records: z.array(procoreImportRecordSchema).min(1, 'No valid records were supplied.').max(1000, 'Import a maximum of 1,000 records at a time.'),
});

function failure(message: string): ProcoreImportActionResult {
  return { success: false, message, imported: 0, skipped: 0 };
}

export async function importProcoreDocumentsAction(formData: FormData): Promise<ProcoreImportActionResult> {
  const rawRecords = formData.get('records');
  if (typeof rawRecords !== 'string') return failure('The import payload is missing. Re-select the CSV and try again.');
  let records: unknown;
  try {
    records = JSON.parse(rawRecords);
  } catch {
    return failure('The import payload is not valid JSON. Re-select the CSV and try again.');
  }

  const parsed = requestSchema.safeParse({ projectId: formData.get('project_id'), records });
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? 'The import request is invalid.');

  const user = await requireUser();
  const client = await createClient();
  const uniqueRecords = [...new Map(parsed.data.records.map((record) => [record.documentCode.toUpperCase(), record])).values()];
  const duplicateInputCount = parsed.data.records.length - uniqueRecords.length;
  const existingResult = await findExistingDocumentCodes(client, uniqueRecords.map((record) => record.documentCode));
  if (existingResult.error) return failure(existingResult.error);
  const existing = new Set(existingResult.data.map((code) => code.toUpperCase()));
  const importable = uniqueRecords.filter((record) => !existing.has(record.documentCode.toUpperCase()));
  const skipped = duplicateInputCount + uniqueRecords.length - importable.length;

  if (!importable.length) return { success: true, message: 'No new records were imported. Every valid document already exists.', imported: 0, skipped };

  const values: TablesInsert<'documents'>[] = importable.map((record) => ({
    document_number: record.documentCode,
    document_code: record.documentCode,
    title: record.description,
    description: record.description,
    project_id: parsed.data.projectId,
    document_type: record.documentTypeLabel,
    document_type_code: record.documentTypeCode,
    discipline: record.disciplineLabel,
    discipline_code: record.disciplineCode,
    number: record.number,
    volume_system_code: record.volumeSystemCode,
    location_code: record.locationCode,
    classification_code: record.classificationCode,
    originator_code: record.originatorCode,
    revision: record.revision,
    version: record.version,
    status: record.status,
    project_stage: record.projectStage,
    workflow_status: record.workflowStatus,
    current_workflow_step: record.currentWorkflowStep,
    assigned_workflow: record.assignedWorkflow,
    file_name: record.fileName,
    file_path: null,
    date_uploaded: record.dateUploaded,
    date_updated: record.dateUpdated,
    uploaded_by: user.id,
    created_by: user.id,
    procore_name: record.procoreName,
    procore_project: record.procoreProject,
    source_location_code: record.sourceLocationCode,
    source_classification_code: record.sourceClassificationCode,
    source: 'procore_csv',
  }));

  for (let index = 0; index < values.length; index += 100) {
    const error = await importDocuments(client, values.slice(index, index + 100));
    if (error) return { success: false, message: `${error} ${index} records were imported before the failure.`, imported: index, skipped };
  }

  revalidatePath('/documents');
  revalidatePath('/documents/import');
  revalidatePath('/');
  return { success: true, message: `${values.length} Procore document records imported. ${skipped} duplicate records were skipped.`, imported: values.length, skipped };
}

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireUser } from '@/lib/auth';
import {
  createDocument,
  deleteDocument,
  findDocumentByCode,
  findDocumentIdByCode,
  updateDocument,
} from '@/lib/services/documents';
import {
  createInspection,
  deleteInspection,
  findInspectionDuplicates,
  updateInspection,
} from '@/lib/services/inspections';
import { createNcr, deleteNcr, updateNcr } from '@/lib/services/ncrs';
import {
  createProject,
  deleteProject,
  setActiveProject,
  updateProject,
} from '@/lib/services/projects';
import {
  createPunchItem,
  deletePunchItem,
  updatePunchItem,
} from '@/lib/services/punch-items';
import { createClient } from '@/lib/supabase/server';
import { generateDocumentCode, projectNamingCode } from '@/lib/procore/naming';
import {
  officialReferenceLabel,
  procoreReference,
  referenceLabel,
} from '@/lib/procore/reference';
import { procoreDocumentFormSchema } from '@/lib/procore/schema';
import {
  combineLevelPlanArea,
  generateWirDocumentCode,
} from '@/lib/wir/naming';
import {
  wirInspectionSchema,
  type WirInspectionFormValues,
} from '@/lib/wir/schema';
import type { TablesInsert, TablesUpdate } from '@/types/database';
import {
  disciplines,
  ncrStatuses,
  priorities,
  projectStatuses,
  punchStatuses,
} from '@/types/qaqc';

export type CrudActionResult = { success: boolean; message: string };

const required = (label: string) =>
  z.string().trim().min(1, `${label} is required.`);
const optional = z
  .string()
  .trim()
  .transform((value) => value || null);
const date = (label: string) =>
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${label} is required.`);
const optionalDate = z
  .string()
  .refine(
    (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value),
    'Enter a valid date.',
  )
  .transform((value) => value || null);
const recordId = z.uuid('The selected record is invalid.');

const projectSchema = z.object({
  name: required('Project name'),
  project_code: required('Project code').max(40),
  client: required('Client'),
  contractor: optional,
  consultant: optional,
  location: required('Location'),
  status: z.enum(projectStatuses),
  description: optional,
  start_date: optionalDate,
  target_completion_date: optionalDate,
});
const ncrSchema = z.object({
  ncr_number: required('NCR number').max(50),
  project_id: recordId,
  title: required('Title'),
  description: required('Description'),
  discipline: z.enum(disciplines),
  area: required('Area'),
  severity: z.enum(priorities),
  responsible_company: required('Responsible company'),
  assigned_person: required('Assigned person'),
  date_raised: date('Date raised'),
  due_date: date('Due date'),
  status: z.enum(ncrStatuses),
  root_cause: optional,
  corrective_action: optional,
  closeout_comments: optional,
});
const punchSchema = z.object({
  punch_number: required('Punch number').max(50),
  project_id: recordId,
  area: required('Area'),
  discipline: z.enum(disciplines),
  description: required('Description'),
  responsible_company: required('Responsible company'),
  assigned_person: required('Assigned person'),
  priority: z.enum(priorities),
  due_date: date('Due date'),
  status: z.enum(punchStatuses),
});

function values(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function invalid(error: z.ZodError): CrudActionResult {
  return {
    success: false,
    message: error.issues[0]?.message ?? 'Check the required fields.',
  };
}

async function context() {
  const user = await requireUser();
  const client = await createClient();
  return { user, client };
}

function finish(
  error: string | null,
  route: string,
  noun: string,
): CrudActionResult {
  if (error) return { success: false, message: error };
  revalidatePath(route);
  revalidatePath('/');
  return { success: true, message: `${noun} saved successfully.` };
}

export async function createProjectAction(
  formData: FormData,
): Promise<CrudActionResult> {
  const parsed = projectSchema.safeParse(values(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { user, client } = await context();
  const { count, error: countError } = await client
    .from('projects')
    .select('id', { count: 'exact', head: true });
  if (countError)
    return { success: false, message: 'Existing projects could not be checked.' };

  const created = await createProject(client, {
    ...parsed.data,
    created_by: user.id,
  });
  if (created.error || !created.data)
    return {
      success: false,
      message: created.error ?? 'Project could not be created.',
    };

  if ((count ?? 0) === 0) {
    const selectionError = await setActiveProject(
      client,
      user.id,
      created.data.id,
    );
    if (selectionError)
      return {
        success: true,
        message: `Project created, but it could not be made active: ${selectionError}`,
      };
  }

  revalidatePath('/projects');
  revalidatePath('/');
  return {
    success: true,
    message:
      (count ?? 0) === 0
        ? 'Project created and set as your active project.'
        : 'Project saved successfully.',
  };
}

export async function selectActiveProjectAction(
  formData: FormData,
): Promise<CrudActionResult> {
  const projectId = recordId.safeParse(formData.get('project_id'));
  if (!projectId.success) return invalid(projectId.error);
  const { user, client } = await context();
  const error = await setActiveProject(client, user.id, projectId.data);
  if (error) return { success: false, message: error };
  revalidatePath('/projects');
  revalidatePath('/');
  return { success: true, message: 'Active project changed.' };
}
export async function updateProjectAction(
  formData: FormData,
): Promise<CrudActionResult> {
  const id = recordId.safeParse(formData.get('id'));
  const parsed = projectSchema.safeParse(values(formData));
  if (!id.success) return invalid(id.error);
  if (!parsed.success) return invalid(parsed.error);
  const { client } = await context();
  return finish(
    await updateProject(client, id.data, parsed.data),
    '/projects',
    'Project',
  );
}
export async function deleteProjectAction(
  formData: FormData,
): Promise<CrudActionResult> {
  const id = recordId.safeParse(formData.get('id'));
  if (!id.success) return invalid(id.error);
  const { client } = await context();
  const error = await deleteProject(client, id.data);
  if (!error) {
    revalidatePath('/projects');
    revalidatePath('/');
  }
  return { success: !error, message: error ?? 'Project deleted.' };
}

async function buildWirInspectionValues(
  client: Awaited<ReturnType<typeof createClient>>,
  form: WirInspectionFormValues,
  excludeId?: string,
): Promise<{ data: TablesInsert<'inspections'> | null; error: string | null }> {
  const { data: project, error: projectError } = await client
    .from('projects')
    .select('project_code')
    .eq('id', form.project_id)
    .limit(1)
    .maybeSingle();
  if (projectError || !project)
    return { data: null, error: 'The selected project could not be verified.' };
  const namingProjectCode = projectNamingCode(project.project_code);
  if (!namingProjectCode)
    return {
      data: null,
      error:
        'This project is not mapped to the IL051 naming convention. Use project code IL05 or IL051.',
    };
  if (form.project_code !== namingProjectCode)
    return {
      data: null,
      error:
        'The project naming code changed. Re-select the project and try again.',
    };

  const fullDocumentCode = generateWirDocumentCode({
    projectCode: namingProjectCode,
    wirNumber: form.wir_number,
    disciplineCode: form.discipline_code,
    levelCode: form.level_code,
    planAreaCode: form.plan_area_code,
    volumeCode: form.volume_code,
    classificationCode: form.classification_code,
    originatorCode: form.originator_code,
  });
  const duplicates = await findInspectionDuplicates(
    client,
    form.project_id,
    form.wir_number,
    fullDocumentCode,
    excludeId,
  );
  if (duplicates.error) return { data: null, error: duplicates.error };
  if (duplicates.duplicateWirNumber)
    return {
      data: null,
      error: `WIR number ${form.wir_number} already exists for this project.`,
    };
  if (duplicates.duplicateFullCode)
    return {
      data: null,
      error: `Full document code ${fullDocumentCode} already exists.`,
    };

  const matchingDocument = await findDocumentIdByCode(client, fullDocumentCode);
  if (matchingDocument.error)
    return { data: null, error: matchingDocument.error };
  const levelArea = combineLevelPlanArea(form.level_code, form.plan_area_code);
  return {
    data: {
      inspection_number: form.wir_number,
      wir_number: form.wir_number,
      full_document_code: fullDocumentCode,
      project_id: form.project_id,
      document_id: matchingDocument.id,
      file_type_code: form.file_type_code,
      inspection_type: form.inspection_type,
      discipline: officialReferenceLabel(
        procoreReference.eas6bDisciplines,
        form.discipline_code,
      ),
      discipline_code: form.discipline_code,
      area: levelArea,
      level_code: form.level_code,
      plan_area_code: form.plan_area_code,
      volume_code: form.volume_code,
      classification_code: form.classification_code,
      originator_code: form.originator_code,
      revision: form.revision,
      inspection_item: form.inspection_item,
      file_title: form.file_title,
      source_filename: form.source_filename,
      pile_location_numbers: form.pile_location_numbers,
      description: form.inspection_item,
      consultant: form.consultant,
      contractor: form.contractor,
      inspector: form.inspector,
      reviewer_name: form.reviewer_name,
      responsible_company: form.responsible_company,
      location_grid: form.location_grid,
      planned_inspection_date: form.planned_inspection_date,
      actual_inspection_date: form.actual_inspection_date,
      inspection_time_window: form.inspection_time_window,
      method_statement: form.method_statement,
      itp_reference: form.itp_reference,
      itp_revision: form.itp_revision,
      itp_item: form.itp_item,
      itp_control_point: form.itp_control_point,
      estimated_volume: form.estimated_volume,
      drawing_reference: form.drawing_reference,
      engineer_inspection_result: form.engineer_inspection_result,
      status: form.status,
      result: form.result,
      comments: form.comments,
    },
    error: null,
  };
}

export async function createInspectionAction(
  formData: FormData,
): Promise<CrudActionResult> {
  const parsed = wirInspectionSchema.safeParse(values(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { user, client } = await context();
  const structured = await buildWirInspectionValues(client, parsed.data);
  if (structured.error || !structured.data)
    return {
      success: false,
      message: structured.error ?? 'The WIR could not be prepared.',
    };
  return finish(
    await createInspection(client, { ...structured.data, created_by: user.id }),
    '/wir',
    'WIR inspection',
  );
}

export async function updateInspectionAction(
  formData: FormData,
): Promise<CrudActionResult> {
  const id = recordId.safeParse(formData.get('id'));
  const parsed = wirInspectionSchema.safeParse(values(formData));
  if (!id.success) return invalid(id.error);
  if (!parsed.success) return invalid(parsed.error);
  const { client } = await context();
  const structured = await buildWirInspectionValues(
    client,
    parsed.data,
    id.data,
  );
  if (structured.error || !structured.data)
    return {
      success: false,
      message: structured.error ?? 'The WIR could not be prepared.',
    };
  return finish(
    await updateInspection(
      client,
      id.data,
      structured.data as TablesUpdate<'inspections'>,
    ),
    '/wir',
    'WIR inspection',
  );
}
export async function deleteInspectionAction(
  formData: FormData,
): Promise<CrudActionResult> {
  const id = recordId.safeParse(formData.get('id'));
  if (!id.success) return invalid(id.error);
  const { client } = await context();
  const error = await deleteInspection(client, id.data);
  if (!error) {
    revalidatePath('/inspections');
    revalidatePath('/wir');
    revalidatePath('/');
  }
  return { success: !error, message: error ?? 'Inspection deleted.' };
}

export async function createNcrAction(
  formData: FormData,
): Promise<CrudActionResult> {
  const parsed = ncrSchema.safeParse(values(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { user, client } = await context();
  return finish(
    await createNcr(client, { ...parsed.data, created_by: user.id }),
    '/ncrs',
    'NCR',
  );
}
export async function updateNcrAction(
  formData: FormData,
): Promise<CrudActionResult> {
  const id = recordId.safeParse(formData.get('id'));
  const parsed = ncrSchema.safeParse(values(formData));
  if (!id.success) return invalid(id.error);
  if (!parsed.success) return invalid(parsed.error);
  const { client } = await context();
  return finish(await updateNcr(client, id.data, parsed.data), '/ncrs', 'NCR');
}
export async function deleteNcrAction(
  formData: FormData,
): Promise<CrudActionResult> {
  const id = recordId.safeParse(formData.get('id'));
  if (!id.success) return invalid(id.error);
  const { client } = await context();
  const error = await deleteNcr(client, id.data);
  if (!error) {
    revalidatePath('/ncrs');
    revalidatePath('/');
  }
  return { success: !error, message: error ?? 'NCR deleted.' };
}

export async function createPunchItemAction(
  formData: FormData,
): Promise<CrudActionResult> {
  const parsed = punchSchema.safeParse(values(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { user, client } = await context();
  return finish(
    await createPunchItem(client, { ...parsed.data, created_by: user.id }),
    '/punch-list',
    'Punch item',
  );
}
export async function updatePunchItemAction(
  formData: FormData,
): Promise<CrudActionResult> {
  const id = recordId.safeParse(formData.get('id'));
  const parsed = punchSchema.safeParse(values(formData));
  if (!id.success) return invalid(id.error);
  if (!parsed.success) return invalid(parsed.error);
  const { client } = await context();
  return finish(
    await updatePunchItem(client, id.data, parsed.data),
    '/punch-list',
    'Punch item',
  );
}
export async function deletePunchItemAction(
  formData: FormData,
): Promise<CrudActionResult> {
  const id = recordId.safeParse(formData.get('id'));
  if (!id.success) return invalid(id.error);
  const { client } = await context();
  const error = await deletePunchItem(client, id.data);
  if (!error) {
    revalidatePath('/punch-list');
    revalidatePath('/');
  }
  return { success: !error, message: error ?? 'Punch item deleted.' };
}

export async function createDocumentAction(
  formData: FormData,
): Promise<CrudActionResult> {
  const parsed = procoreDocumentFormSchema.safeParse(values(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { user, client } = await context();
  const documentCode = generateDocumentCode({
    projectCode: parsed.data.project_code,
    documentTypeCode: parsed.data.document_type_code,
    disciplineCode: parsed.data.discipline_code,
    number: parsed.data.number,
    locationCode: parsed.data.location_code,
    volumeSystemCode: parsed.data.volume_system_code,
    classificationCode: parsed.data.classification_code,
    originatorCode: parsed.data.originator_code,
  });
  const duplicate = await findDocumentByCode(client, documentCode);
  if (duplicate.error) return { success: false, message: duplicate.error };
  if (duplicate.exists)
    return {
      success: false,
      message: 'A document with this generated code already exists.',
    };
  const now = new Date().toISOString();
  return finish(
    await createDocument(client, {
      document_number: documentCode,
      document_code: documentCode,
      title: parsed.data.description,
      description: parsed.data.description,
      project_id: parsed.data.project_id,
      document_type: referenceLabel(
        procoreReference.documentTypes,
        parsed.data.document_type_code,
      ),
      document_type_code: parsed.data.document_type_code,
      discipline: referenceLabel(
        procoreReference.disciplines,
        parsed.data.discipline_code,
      ),
      discipline_code: parsed.data.discipline_code,
      number: parsed.data.number,
      volume_system_code: parsed.data.volume_system_code,
      location_code: parsed.data.location_code,
      classification_code: parsed.data.classification_code,
      originator_code: parsed.data.originator_code,
      revision: parsed.data.revision,
      version: '1',
      status: parsed.data.status,
      project_stage: parsed.data.project_stage,
      date_uploaded: now,
      date_updated: now,
      uploaded_by: user.id,
      created_by: user.id,
      file_path: null,
      source: 'manual',
      source_location_code: parsed.data.location_code,
      source_classification_code: parsed.data.classification_code,
    }),
    '/documents',
    'Document',
  );
}
export async function updateDocumentAction(
  formData: FormData,
): Promise<CrudActionResult> {
  const id = recordId.safeParse(formData.get('id'));
  const parsed = procoreDocumentFormSchema.safeParse(values(formData));
  if (!id.success) return invalid(id.error);
  if (!parsed.success) return invalid(parsed.error);
  const { client } = await context();
  const documentCode = generateDocumentCode({
    projectCode: parsed.data.project_code,
    documentTypeCode: parsed.data.document_type_code,
    disciplineCode: parsed.data.discipline_code,
    number: parsed.data.number,
    locationCode: parsed.data.location_code,
    volumeSystemCode: parsed.data.volume_system_code,
    classificationCode: parsed.data.classification_code,
    originatorCode: parsed.data.originator_code,
  });
  const duplicate = await findDocumentByCode(client, documentCode, id.data);
  if (duplicate.error) return { success: false, message: duplicate.error };
  if (duplicate.exists)
    return {
      success: false,
      message: 'A document with this generated code already exists.',
    };
  return finish(
    await updateDocument(client, id.data, {
      document_number: documentCode,
      document_code: documentCode,
      title: parsed.data.description,
      description: parsed.data.description,
      project_id: parsed.data.project_id,
      document_type: referenceLabel(
        procoreReference.documentTypes,
        parsed.data.document_type_code,
      ),
      document_type_code: parsed.data.document_type_code,
      discipline: referenceLabel(
        procoreReference.disciplines,
        parsed.data.discipline_code,
      ),
      discipline_code: parsed.data.discipline_code,
      number: parsed.data.number,
      volume_system_code: parsed.data.volume_system_code,
      location_code: parsed.data.location_code,
      classification_code: parsed.data.classification_code,
      originator_code: parsed.data.originator_code,
      revision: parsed.data.revision,
      status: parsed.data.status,
      project_stage: parsed.data.project_stage,
      date_updated: new Date().toISOString(),
      source_location_code: parsed.data.location_code,
      source_classification_code: parsed.data.classification_code,
    }),
    '/documents',
    'Document',
  );
}
export async function deleteDocumentAction(
  formData: FormData,
): Promise<CrudActionResult> {
  const id = recordId.safeParse(formData.get('id'));
  if (!id.success) return invalid(id.error);
  const { client } = await context();
  const error = await deleteDocument(client, id.data);
  if (!error) {
    revalidatePath('/documents');
    revalidatePath('/');
  }
  return { success: !error, message: error ?? 'Document deleted.' };
}

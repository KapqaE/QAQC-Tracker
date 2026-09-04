import { z } from 'zod';

import { procoreReference } from '@/lib/procore/reference';
import { generateDocumentCode, validateDocumentNumber } from '@/lib/procore/naming';

const required = (label: string) => z.string().trim().min(1, `${label} is required.`);
const optional = z.string().trim().default('');
const isoDate = (label: string) => required(label).refine((value) => !Number.isNaN(Date.parse(value)), `${label} is invalid.`);

export const procoreRequiredColumns = [
  'Name', 'Description', 'Type', 'Revision', 'Version', 'Status', 'Originator',
  'Volume / System', 'Location', 'Discipline', 'Number', 'Classification',
  'Project Stage', 'File', 'Date Uploaded', 'Date Updated', 'Project',
] as const;

export const procoreCsvRowSchema = z.object({
  Name: required('Name'),
  Description: required('Description'),
  Type: required('Type'),
  Revision: required('Revision'),
  Version: required('Version'),
  Status: required('Status'),
  'Document Stage': optional,
  'Assigned Workflow': optional,
  'Workflow Status': optional,
  'Current Workflow Step': optional,
  Originator: required('Originator'),
  'Volume / System': required('Volume / System'),
  Location: required('Location'),
  Discipline: required('Discipline'),
  Number: required('Number'),
  Classification: required('Classification'),
  'Project Stage': required('Project Stage'),
  File: required('File'),
  'Date Uploaded': isoDate('Date Uploaded'),
  'Date Updated': isoDate('Date Updated'),
  Project: required('Project'),
}).loose();

const codes = (items: { code: string }[]) => items.map((item) => item.code) as [string, ...string[]];

export const procoreDocumentFormSchema = z.object({
  project_id: z.uuid('Select a QAQC project.'),
  project_code: z.enum(codes(procoreReference.projects)),
  document_type_code: z.enum(codes(procoreReference.documentTypes)),
  discipline_code: z.enum(codes(procoreReference.disciplines)),
  number: required('Number'),
  location_code: z.enum(codes(procoreReference.namingLocationSlots)),
  volume_system_code: z.enum(codes(procoreReference.volumesSystems)),
  classification_code: z.enum(codes(procoreReference.namingClassificationSlots)),
  originator_code: z.enum(codes(procoreReference.originators)),
  revision: z.enum(codes(procoreReference.revisionPatterns)),
  status: z.enum(codes(procoreReference.statuses)),
  description: required('Description'),
  project_stage: z.enum(codes(procoreReference.projectStages)),
}).superRefine((value, context) => {
  const error = validateDocumentNumber(value.document_type_code, value.number);
  if (error) context.addIssue({ code: 'custom', path: ['number'], message: error });
});

export const procoreImportRecordSchema = z.object({
  documentCode: required('Document code'),
  projectCode: required('Project code'),
  documentTypeCode: required('Document type code'),
  disciplineCode: required('Discipline code'),
  number: required('Number'),
  locationCode: required('Location code'),
  volumeSystemCode: required('Volume / System code'),
  classificationCode: required('Classification code'),
  originatorCode: required('Originator code'),
  suffix: z.string().nullable(),
  description: required('Description'),
  revision: required('Revision'),
  version: required('Version'),
  status: required('Status'),
  projectStage: required('Project stage'),
  workflowStatus: z.string().nullable(),
  currentWorkflowStep: z.string().nullable(),
  assignedWorkflow: z.string().nullable(),
  fileName: required('File name'),
  dateUploaded: isoDate('Date Uploaded'),
  dateUpdated: isoDate('Date Updated'),
  procoreName: required('Procore Name'),
  procoreProject: required('Procore Project'),
  documentTypeLabel: required('Document type label'),
  disciplineLabel: required('Discipline label'),
  sourceLocationCode: required('Source location code'),
  sourceClassificationCode: required('Source classification code'),
}).superRefine((value, context) => {
  const expected = generateDocumentCode({
    projectCode: value.projectCode,
    documentTypeCode: value.documentTypeCode,
    disciplineCode: value.disciplineCode,
    number: value.number,
    locationCode: value.locationCode,
    volumeSystemCode: value.volumeSystemCode,
    classificationCode: value.classificationCode,
    originatorCode: value.originatorCode,
  });
  if (value.documentCode !== expected) context.addIssue({ code: 'custom', path: ['documentCode'], message: 'Document code does not match its normalized code fields.' });
});

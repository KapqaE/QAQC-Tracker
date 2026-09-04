import { z } from 'zod';

import { procoreReference } from '@/lib/procore/reference';
import {
  WIR_FILE_TYPE_CODE,
  WIR_NUMBER_PATTERN,
  WIR_REVISION_PATTERN,
} from '@/lib/wir/naming';
import { inspectionResults, inspectionStatuses } from '@/types/qaqc';

const required = (label: string) => z.string().trim().min(1, `${label} is required.`);
const optional = z.string().trim().transform((value) => value || null);
const date = (label: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${label} is required.`);
const optionalDate = z.string().refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), 'Enter a valid date.').transform((value) => value || null);
const codes = (items: { code: string }[]) => items.map((item) => item.code) as [string, ...string[]];

export const wirInspectionSchema = z.object({
  project_id: z.uuid('Select a project.'),
  project_code: required('Project code').regex(/^[A-Z0-9]+$/, 'Project code must contain only letters and numbers.'),
  wir_number: required('WIR number').transform((value) => value.toUpperCase()).refine((value) => WIR_NUMBER_PATTERN.test(value), 'Use the format WIR.0001.'),
  file_type_code: z.literal(WIR_FILE_TYPE_CODE),
  discipline_code: z.enum(codes(procoreReference.eas6bDisciplines)),
  level_code: z.enum(codes(procoreReference.eas6bLevels)),
  plan_area_code: z.union([z.enum(codes(procoreReference.eas6bPlanAreas)), z.literal('')]).transform((value) => value || null),
  volume_code: z.enum(codes(procoreReference.eas6bVolumes)),
  classification_code: z.enum(codes(procoreReference.eas6bClassifications)),
  originator_code: z.enum(codes(procoreReference.eas6bOriginators)),
  revision: required('Revision')
    .transform((value) => value.toUpperCase())
    .refine((value) => WIR_REVISION_PATTERN.test(value), 'Use the format R00.'),
  inspection_item: required('Inspection request item'),
  file_title: required('File title'),
  source_filename: optional,
  pile_location_numbers: optional,
  inspection_type: required('Inspection type'),
  consultant: optional,
  contractor: optional,
  inspector: required('Inspector'),
  reviewer_name: optional,
  responsible_company: required('Responsible company'),
  location_grid: optional,
  planned_inspection_date: date('Planned inspection date'),
  actual_inspection_date: optionalDate,
  inspection_time_window: optional,
  method_statement: optional,
  itp_reference: optional,
  itp_revision: optional,
  itp_item: optional,
  itp_control_point: optional,
  estimated_volume: optional,
  drawing_reference: optional,
  engineer_inspection_result: optional,
  status: z.enum(inspectionStatuses),
  result: z.union([z.enum(inspectionResults), z.literal('')]).transform((value) => value || null),
  comments: optional,
});

export type WirInspectionFormValues = z.infer<typeof wirInspectionSchema>;

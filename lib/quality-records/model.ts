import { generateDocumentCode } from '@/lib/procore/naming';

export const reviewStatuses = [
  'Draft',
  'Submitted',
  'In Review',
  'A - Proceed',
  'B - Proceed, Comments',
  'C - Rejected',
  'Closed',
  'Superseded',
] as const;

export const issueStatuses = [
  'Open',
  'In Progress',
  'Under Review',
  'Verified',
  'Closed',
  'Disputed',
  'Superseded',
] as const;

export const rrrStatuses = [
  'Draft',
  'Submitted',
  'Under Review',
  'Verified',
  'Not Verified',
  'CxA Accepted',
  'Accepted with Conditions',
  'Rejected',
  'Released for Commissioning',
  'Released for Energization',
  'Not Released',
  'Superseded',
  'Resubmitted',
] as const;

export const qualityActionStatuses = ['Open', 'In Progress', 'Verified', 'Closed'] as const;
export const RRR_DOCUMENT_CODE = 'IL051-RP-G-RRR' as const;
export const RRR_TEMPLATE_CODE = 'SBI-EQIL5-KLT-FR-RRR' as const;

export function suggestNextRecordNumber(
  prefix: 'MIR' | 'NCR' | 'SOR',
  numbers: Iterable<string | null | undefined>,
) {
  const pattern = new RegExp(`^${prefix}\\.(\\d{4})$`, 'i');
  let highest = 0;
  for (const value of numbers) {
    const match = value?.trim().match(pattern);
    if (match) highest = Math.max(highest, Number.parseInt(match[1], 10));
  }
  return `${prefix}.${String(highest + 1).padStart(4, '0')}`;
}

export function suggestNextRrrNumber(numbers: Iterable<string | null | undefined>) {
  let highest = 0;
  for (const value of numbers) {
    const match = value?.trim().match(/^RRR\.(\d{6})$/i);
    if (match) highest = Math.max(highest, Number.parseInt(match[1], 10));
  }
  return `RRR.${String(highest + 1).padStart(6, '0')}`;
}

export function generateQualityDocumentCode(parts: {
  projectCode: string;
  recordType: 'MIR' | 'NCR' | 'SOR';
  recordNumber: string;
  disciplineCode: string;
  levelCode: string;
  planAreaCode?: string | null;
  volumeCode: string;
  classificationCode: string;
  originatorCode: string;
}) {
  return generateDocumentCode({
    projectCode: parts.projectCode,
    documentTypeCode: 'IP',
    disciplineCode: parts.disciplineCode,
    number: parts.recordNumber,
    locationCode: `${parts.levelCode}${parts.planAreaCode ?? ''}`,
    volumeSystemCode: parts.volumeCode,
    classificationCode: parts.classificationCode,
    originatorCode: parts.originatorCode,
  });
}

export function normalizeQualityStatus(status: string) {
  if (['A - Proceed', 'B - Proceed, Comments', 'Approved', 'Passed', 'Closed', 'Verified', 'CxA Accepted', 'Released for Commissioning', 'Released for Energization'].includes(status)) return 'approved';
  if (['C - Rejected', 'Rejected', 'Failed', 'Not Verified', 'Not Released'].includes(status)) return 'rejected';
  if (['Draft', 'Open', 'In Progress', 'Corrective Action', 'Disputed'].includes(status)) return 'open';
  return 'review';
}

export const rrrReadinessControls = [
  'RR-1 Construction — Room Readiness / L2A Red Tag',
  'RR-1 Construction — Pre-Energization Works / L2B',
  'RR-2 Pre-Commissioning — MCE',
  'RR-3 Pre-Commissioning — Services',
  'RR-4 Life Safety & LOTO',
] as const;

import { generateDocumentCode } from '@/lib/procore/naming';

export const WIR_FILE_TYPE_CODE = 'IP' as const;
export const WIR_NUMBER_PATTERN = /^WIR\.(\d{4})$/;
export const WIR_REVISION_PATTERN = /^[A-Z]\d{2}$/;

export type WirDocumentCodeParts = {
  projectCode: string;
  wirNumber: string;
  disciplineCode: string;
  levelCode: string;
  planAreaCode?: string | null;
  volumeCode: string;
  classificationCode: string;
  originatorCode: string;
};

export function combineLevelPlanArea(
  levelCode: string,
  planAreaCode?: string | null,
) {
  return `${levelCode.trim().toUpperCase()}${planAreaCode?.trim().toUpperCase() ?? ''}`;
}

export function generateWirDocumentCode(parts: WirDocumentCodeParts) {
  return generateDocumentCode({
    projectCode: parts.projectCode,
    documentTypeCode: WIR_FILE_TYPE_CODE,
    disciplineCode: parts.disciplineCode,
    number: parts.wirNumber,
    locationCode: combineLevelPlanArea(parts.levelCode, parts.planAreaCode),
    volumeSystemCode: parts.volumeCode,
    classificationCode: parts.classificationCode,
    originatorCode: parts.originatorCode,
  });
}

export function generateProcoreWirFilename(
  documentCode: string,
  revision: string,
  inspectionItem: string,
) {
  const cleanItem = inspectionItem
    .trim()
    .replace(/^WIR\s+/i, '')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s{2,}/g, ' ');
  if (!documentCode || !WIR_REVISION_PATTERN.test(revision) || !cleanItem)
    return '';
  return `${documentCode}-${revision}-WIR ${cleanItem}.pdf`;
}

export function suggestNextWirNumber(
  numbers: Iterable<string | null | undefined>,
) {
  let highest = 0;
  for (const value of numbers) {
    const match = value?.trim().toUpperCase().match(WIR_NUMBER_PATTERN);
    if (match) highest = Math.max(highest, Number.parseInt(match[1], 10));
  }
  if (highest >= 9999) return null;
  return `WIR.${String(highest + 1).padStart(4, '0')}`;
}

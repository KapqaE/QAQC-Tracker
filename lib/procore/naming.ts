import { procoreReference } from '@/lib/procore/reference';
import type {
  BuiltDocumentSegment,
  DocumentCodeParts,
  Eas6bCoreSegmentKey,
  LevelAreaSegmentAnalysis,
  NumberSegmentAnalysis,
  ParsedDocumentCode,
  ProcoreNumberingRule,
} from '@/types/procore';

const codeSegment = /^[A-Za-z0-9.]+$/;
const officialFloorLevels = new Set(['B2', 'B1', '00', '01', '02', '03', '04', '05', '06', 'XX']);

export function splitCodeLabel(value: string) {
  const raw = value.trim();
  const match = raw.match(/^(.+?)\s+(?:-|–)\s+(.+)$/u);
  return match ? { code: match[1].trim(), label: match[2].trim(), raw } : { code: raw, label: raw, raw };
}

export function analyzeNumberSegment(typeCode: string, value: string): NumberSegmentAnalysis {
  const normalizedType = typeCode.trim().toUpperCase();
  const normalizedValue = value.trim().toUpperCase();

  if (normalizedType === 'DR') {
    const drawing = normalizedValue.match(/^(\d)(\d{2})(\d*)$/);
    return drawing
      ? {
          value: normalizedValue,
          kind: 'drawing-sheet',
          sourceFields: ['Sheet Type Designator', 'Sheet Sub-Type Designator', 'Optional Digits'],
          components: { sheetType: drawing[1], sheetSubType: drawing[2], optionalDigits: drawing[3] || null },
          officialStatus: 'matches',
          note: 'The digits are combined inside Segment 4; the final digits are optional.',
        }
      : {
          value: normalizedValue,
          kind: 'literal',
          sourceFields: ['Number'],
          components: { raw: normalizedValue },
          officialStatus: 'legacy-deviation',
          note: 'A drawing number must contain one sheet-type digit, two sheet-sub-type digits, and optional trailing digits.',
        };
  }

  if (normalizedType === 'SP' || normalizedType === 'TS') {
    const masterFormat = normalizedValue.match(/^(\d{2})(\d{2})(\d{2})$/);
    if (masterFormat) {
      return {
        value: normalizedValue,
        kind: 'csi-masterformat',
        sourceFields: ['CSI division', 'CSI section group', 'CSI section detail'],
        components: { division: masterFormat[1], sectionGroup: masterFormat[2], sectionDetail: masterFormat[3] },
        officialStatus: 'matches',
        note: 'EAS-6-B combines the CSI/MasterFormat components into one six-digit segment.',
      };
    }
    return {
      value: normalizedValue,
      kind: 'project-sequence',
      sourceFields: ['Number'],
      components: { sequence: normalizedValue },
      officialStatus: 'legacy-deviation',
      note: 'EAS-6-B requires CSI/MasterFormat for technical submittals; the Procore export uses a project sequence.',
    };
  }

  const prefixed = normalizedValue.match(/^([A-Z]+)\.(\d+)$/);
  if (prefixed) {
    return {
      value: normalizedValue,
      kind: 'project-prefixed-sequence',
      sourceFields: ['Project document prefix', 'Sequence'],
      components: { prefix: prefixed[1], sequence: prefixed[2] },
      officialStatus: 'project-extension',
      note: 'The prefix and sequence stay inside one top-level segment. EAS-6-B does not prescribe this project numbering extension.',
    };
  }

  if (/^\d+$/.test(normalizedValue)) {
    return {
      value: normalizedValue,
      kind: 'project-sequence',
      sourceFields: ['Project sequence'],
      components: { sequence: normalizedValue },
      officialStatus: 'project-extension',
      note: 'EAS-6-B defines the file type but does not prescribe a dedicated number grammar for this document type.',
    };
  }

  return {
    value: normalizedValue,
    kind: 'literal',
    sourceFields: ['Number'],
    components: { raw: normalizedValue },
    officialStatus: 'legacy-deviation',
    note: 'The number is preserved, but its internal structure is not described by EAS-6-B or the observed project rules.',
  };
}

export function analyzeLevelAreaSegment(value: string): LevelAreaSegmentAnalysis {
  const normalizedValue = value.trim().toUpperCase();
  const match = normalizedValue.match(/^([A-Z0-9]{2})([A-Z])?$/);
  const floorLevel = match?.[1] ?? null;
  const planArea = match?.[2] ?? null;
  const matchesOfficialGrammar = Boolean(floorLevel && officialFloorLevels.has(floorLevel));
  return {
    value: normalizedValue,
    floorLevel,
    planArea,
    officialStatus: matchesOfficialGrammar ? 'matches' : 'legacy-deviation',
    note: matchesOfficialGrammar
      ? `Segment 5 combines floor level ${floorLevel}${planArea ? ` with optional plan area ${planArea}` : ''}.`
      : 'The value is preserved from Procore but cannot be split into an official floor-level code plus optional plan-area letter.',
  };
}

export function buildDocumentCodeSegments(parts: DocumentCodeParts): BuiltDocumentSegment[] {
  const values: Record<Eas6bCoreSegmentKey, string> = {
    project: parts.projectCode,
    file_type: parts.documentTypeCode,
    discipline: parts.disciplineCode,
    number: analyzeNumberSegment(parts.documentTypeCode, parts.number).value,
    level_area: analyzeLevelAreaSegment(parts.locationCode).value,
    volume: parts.volumeSystemCode,
    classification: parts.classificationCode,
    originator: parts.originatorCode,
  };

  return procoreReference.eas6b.coreSegments.map((rule) => {
    const key = rule.key as Eas6bCoreSegmentKey;
    const value = values[key].trim().toUpperCase();
    return { position: rule.position, key, name: rule.name, value, sourceFields: rule.sourceFields, mandatory: true };
  });
}

export function parseDocumentCode(name: string): ParsedDocumentCode | null {
  const segments = name.trim().split(procoreReference.eas6b.separator);
  if (segments.length < procoreReference.eas6b.coreSegmentCount || segments.slice(0, 8).some((segment) => !segment || !codeSegment.test(segment))) return null;
  const [projectCode, documentTypeCode, disciplineCode, number, locationCode, volumeSystemCode, classificationCode, originatorCode] = segments;
  return {
    documentCode: segments.slice(0, procoreReference.eas6b.coreSegmentCount).join(procoreReference.eas6b.separator),
    projectCode,
    documentTypeCode,
    disciplineCode,
    number,
    locationCode,
    volumeSystemCode,
    classificationCode,
    originatorCode,
    suffix: segments.slice(procoreReference.eas6b.coreSegmentCount).join(procoreReference.eas6b.separator) || null,
    numberAnalysis: analyzeNumberSegment(documentTypeCode, number),
    levelAreaAnalysis: analyzeLevelAreaSegment(locationCode),
  };
}

export function generateDocumentCode(parts: DocumentCodeParts) {
  return buildDocumentCodeSegments(parts).map((segment) => segment.value).join(procoreReference.eas6b.separator);
}

export function documentCodeComplianceNotes(parts: DocumentCodeParts) {
  const notes: string[] = [];
  const number = analyzeNumberSegment(parts.documentTypeCode, parts.number);
  const levelArea = analyzeLevelAreaSegment(parts.locationCode);
  if (number.officialStatus !== 'matches') notes.push(number.note);
  if (levelArea.officialStatus !== 'matches') notes.push(levelArea.note);
  if (parts.classificationCode === 'XXX') notes.push('Classification XXX is a Procore legacy value; EAS-6-B defines XXXX for Not Applicable.');
  if (parts.documentTypeCode === 'PR') notes.push('EAS-6-B marks PR for deletion. The imported legacy value remains supported.');
  if (parts.documentTypeCode === 'SC') notes.push('EAS-6-B marks SC for replacement by DR. The imported legacy value remains supported.');
  return notes;
}

export function matchingNumberRules(typeCode: string, value?: string): ProcoreNumberingRule[] {
  const rules = procoreReference.numberingRules.filter((rule) => rule.typeCode === typeCode);
  if (!value) return rules;
  return rules.filter((rule) => {
    if (rule.kind === 'numeric') return new RegExp(`^\\d{${rule.width}}$`).test(value);
    if (rule.kind === 'prefixed') return new RegExp(`^${rule.prefix}\\.\\d{${rule.width}}$`).test(value);
    return rule.examples.includes(value);
  });
}

export function validateDocumentNumber(typeCode: string, value: string) {
  const rules = matchingNumberRules(typeCode);
  if (!rules.length) return 'No numbering rule was detected for this document type.';
  return matchingNumberRules(typeCode, value).length ? null : `Use an observed ${typeCode} format: ${rules.map((rule) => rule.examples[0]).filter(Boolean).join(' or ')}.`;
}

export function suggestNextPrefixedNumber(numbers: string[], typeCode: string, prefix = 'WIR') {
  const existing = numbers
    .map((value) => value.match(new RegExp(`^${prefix}\\.(\\d+)$`)))
    .filter((match): match is RegExpMatchArray => Boolean(match));
  const observedWidths = [...new Set(existing.map((match) => match[1].length))];
  const rule = procoreReference.numberingRules.find((item) =>
    item.typeCode === typeCode && item.kind === 'prefixed' && item.prefix === prefix && (!observedWidths.length || observedWidths.includes(item.width)),
  );
  if (!rule) return null;
  const matching = existing.filter((match) => match[1].length === rule.width);
  const highest = matching.reduce((max, match) => Math.max(max, Number.parseInt(match[1], 10)), 0);
  return `${prefix}.${String(highest + 1).padStart(rule.width, '0')}`;
}

export function projectNamingCode(projectCode: string) {
  const project = procoreReference.projects.find((item) => item.code === projectCode || item.sourceProjectCode === projectCode || item.aliases.includes(projectCode));
  return project?.code ?? null;
}

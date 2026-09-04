import { procoreReference } from '@/lib/procore/reference';
import {
  combineLevelPlanArea,
  generateProcoreWirFilename,
  generateWirDocumentCode,
  suggestNextWirNumber,
  WIR_NUMBER_PATTERN,
} from '@/lib/wir/naming';
import {
  mergeWirPdfExtraction,
  parseWirFilename,
  parseWirPdfText,
} from '@/lib/wir/pdf-extraction-parser';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(
  suggestNextWirNumber([]) === 'WIR.0001',
  'An empty project must suggest WIR.0001.',
);
assert(
  suggestNextWirNumber(['WIR.0001', 'WIR.0002', 'WIR.0010']) === 'WIR.0011',
  'The next WIR number must follow the highest four-digit sequence.',
);
assert(WIR_NUMBER_PATTERN.test('WIR.0001'), 'WIR.0001 must pass validation.');
assert(
  !WIR_NUMBER_PATTERN.test('WIR.001'),
  'Three-digit WIR sequences must fail validation.',
);
assert(
  combineLevelPlanArea('00', 'C') === '00C',
  'Level and Plan Area must occupy one segment.',
);
assert(
  combineLevelPlanArea('XX', '') === 'XX',
  'Blank Plan Area must not add a separator or placeholder.',
);

const fullCode = generateWirDocumentCode({
  projectCode: 'IL051',
  wirNumber: 'WIR.0008',
  disciplineCode: 'S',
  levelCode: 'XX',
  planAreaCode: null,
  volumeCode: 'XX',
  classificationCode: 'XXXX',
  originatorCode: 'SRB',
});
assert(
  fullCode === 'IL051-IP-S-WIR.0008-XX-XX-XXXX-SRB',
  'The real Procore WIR example must be reproduced exactly.',
);

const realProcoreFilenames = [
  'IL051-IP-S-WIR.0007-XX-XX-XXXX-SRB-R00-WIR Bored Piling Works (107-111-115-119-124-127).pdf',
  'IL051-IP-S-WIR.0009-XX-XX-XXXX-SRB-R00-WIR Bored Piling Works (4-7-10-13-30).pdf',
  'IL051-IP-S-WIR.0010-XX-XX-XXXX-SRB-R00-WIR Bored Piling Works (109-113-117-121-125-133).pdf',
  'IL051-IP-S-WIR.0011-XX-XX-XXXX-SRB-R00-WIR Bored Piling Works (129-131-134-137-140-143-146).pdf',
  'IL051-IP-S-WIR.0013-XX-XX-XXXX-SRB-R00-WIR Bored Piling Works (1-3-6-9-27-46).pdf',
  'IL051-IP-S-WIR.0015-XX-XX-XXXX-SRB-R00-WIR Bored Piling Works (2-5-8-26-28).pdf',
] as const;

for (const filename of realProcoreFilenames) {
  const parsed = parseWirFilename(filename);
  const expectedWir = filename.match(/WIR\.\d{4}/)?.[0];
  const expectedPiles = filename.match(/\(([^)]+)\)/)?.[1];
  assert(
    parsed.wir_number === expectedWir,
    `${filename} must preserve its WIR sequence.`,
  );
  assert(
    parsed.full_document_code === filename.split('-R00-')[0],
    `${filename} must stop the EAS-6-B code at SRB.`,
  );
  assert(parsed.revision === 'R00', `${filename} must extract revision R00.`);
  assert(
    parsed.inspection_item === `Bored Piling Works (${expectedPiles})`,
    `${filename} must preserve every pile number in the inspection item.`,
  );
  assert(
    parsed.pile_location_numbers === expectedPiles,
    `${filename} must extract its pile/location number list.`,
  );
  assert(
    generateProcoreWirFilename(
      parsed.full_document_code ?? '',
      parsed.revision ?? '',
      parsed.inspection_item ?? '',
    ) === filename,
    `${filename} must round-trip through the filename generator.`,
  );
}
assert(
  procoreReference.eas6bFileTypes.some((item) => item.code === 'IP'),
  'The official file-type table must include IP.',
);
assert(
  procoreReference.eas6bDisciplines.some((item) => item.code === 'S'),
  'The official discipline table must include Structural.',
);
assert(
  procoreReference.eas6bLevels.some((item) => item.code === 'XX'),
  'The official level table must include XX.',
);
assert(
  procoreReference.eas6bVolumes.some((item) => item.code === 'XX'),
  'The official volume table must include XX.',
);
assert(
  procoreReference.eas6bClassifications.some((item) => item.code === 'XXXX'),
  'The official classification table must include XXXX.',
);
assert(
  procoreReference.eas6bOriginators.some((item) => item.code === 'SRB'),
  'The official originator table must include SRB.',
);

const pdfFields = parseWirPdfText(`
  Record No: SBI-EQIL5-KLT-FR-WIR-000002
  Project: EQUINIX IL051 Data Center
  To: ARUP    From: SERBAN
  Inspection Request Item: Bored Piling Works (32-35-39-43)
  Inspection Date / Time Window: 03.08.2026 / 12:00-15:00
  Location: Grid Type 1 (32-35-39-43)
  Method Statement Ref. / Rev.: IL051-MS-C-007-Z-ZZ-FNDN-SRB-0-Bored Piling Works
  ITP Ref. / Rev. / Item: IL051-MS-C-007-Z-ZZ-FNDN-SRB/REV01/ITEM 4.2
  ITP Control Point: H
  Estimated Volume: 4080 (Type 1)
  Drawing Ref. / Rev.: IL051-DR-S-584-ZZZ-ZZ-ZZZZ-SRB / P01
  ON-SITE INSPECTION RESULT: ¥'A - ACCEPTED
  Engineer Name / Ad Soyad: ERAY SARIOGLU
`);
assert(
  pdfFields.wir_number === 'WIR.0002',
  'A six-digit record suffix must normalize to WIR.0002.',
);
assert(
  pdfFields.project_code === 'IL051',
  'The project code must be extracted from the PDF text.',
);
assert(
  pdfFields.discipline_code === 'C',
  'Bored piling must be suggested as Civil.',
);
assert(
  pdfFields.originator_code === 'SRB',
  'SERBAN must map to the official SRB originator code.',
);
assert(
  pdfFields.planned_inspection_date === '2026-08-03',
  'The WIR date must normalize to an ISO form date.',
);
assert(
  pdfFields.result === 'Accepted' && pdfFields.status === 'Passed',
  'A marked accepted result must pre-fill the structured result and status.',
);
assert(
  pdfFields.inspection_item === 'Bored Piling Works (32-35-39-43)',
  'The Inspection Request Item must be the primary description with pile numbers.',
);
assert(
  pdfFields.consultant === 'ARUP' && pdfFields.contractor === 'SERBAN',
  'To and From must map to consultant and contractor.',
);
assert(
  pdfFields.inspection_time_window === '12:00-15:00',
  'The inspection time window must be extracted separately from the date.',
);
assert(
  pdfFields.location_grid?.includes('32-35-39-43'),
  'The location/grid value must preserve pile numbers.',
);

const filenameFields = parseWirFilename(realProcoreFilenames[0]);
const mergedConflict = mergeWirPdfExtraction(
  filenameFields,
  parseWirPdfText(`
    IL051-IP-S-WIR.0007-XX-XX-XXXX-SRB
    Inspection Request Item: Bored Piling Works
    Inspection Date: 03.08.2026 / 12:00-15:00
  `),
);
assert(
  mergedConflict.inspection_item ===
    'Bored Piling Works (107-111-115-119-124-127)',
  'A less-specific PDF description must not remove filename pile numbers.',
);
assert(
  mergedConflict.conflicts?.some(
    (conflict) =>
      conflict.field === 'inspection_item' &&
      conflict.selectedSource === 'filename',
  ),
  'Filename/PDF disagreements must be reported instead of silently overwritten.',
);

console.log(
  JSON.stringify(
    {
      emptyProjectSuggestion: 'WIR.0001',
      sequentialSuggestion: 'WIR.0011',
      fullCode,
      filenamePatterns: realProcoreFilenames.map(parseWirFilename),
      pdfExtraction: pdfFields,
      officialCodeTables: {
        fileTypes: procoreReference.eas6bFileTypes.length,
        disciplines: procoreReference.eas6bDisciplines.length,
        levels: procoreReference.eas6bLevels.length,
        planAreas: procoreReference.eas6bPlanAreas.length,
        volumes: procoreReference.eas6bVolumes.length,
        classifications: procoreReference.eas6bClassifications.length,
        originators: procoreReference.eas6bOriginators.length,
      },
    },
    null,
    2,
  ),
);

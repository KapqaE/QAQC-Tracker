import { procoreReference } from '@/lib/procore/reference';

export type WirPdfExtractionConflict = {
  field: string;
  filenameValue: string;
  pdfValue: string;
  selectedSource: 'filename' | 'pdf';
};

export type WirPdfExtractedFields = {
  project_code?: string;
  wir_number?: string;
  full_document_code?: string;
  discipline_code?: string;
  level_code?: string;
  plan_area_code?: string;
  volume_code?: string;
  classification_code?: string;
  originator_code?: string;
  revision?: string;
  inspection_item?: string;
  description?: string;
  file_title?: string;
  source_filename?: string;
  pile_location_numbers?: string;
  inspection_type?: string;
  consultant?: string;
  contractor?: string;
  inspector?: string;
  reviewer_name?: string;
  responsible_company?: string;
  location_grid?: string;
  planned_inspection_date?: string;
  actual_inspection_date?: string;
  inspection_time_window?: string;
  method_statement?: string;
  itp_reference?: string;
  itp_revision?: string;
  itp_item?: string;
  itp_control_point?: string;
  estimated_volume?: string;
  drawing_reference?: string;
  engineer_inspection_result?: string;
  status?: string;
  result?: string;
  comments?: string;
  conflicts?: WirPdfExtractionConflict[];
};

const OFFICIAL_WIR_CODE_SOURCE =
  '(IL0?5(?:1)?)-IP-([A-Z]{1,3})-(WIR[.\\s_-]?\\d{1,6})-([A-Z0-9]{2,3})-([A-Z0-9]{2})-([A-Z0-9]{2,4})-([A-Z0-9]{2,4})';
const OFFICIAL_WIR_CODE = new RegExp(`\\b${OFFICIAL_WIR_CODE_SOURCE}\\b`, 'i');
const PROCORE_WIR_FILENAME = new RegExp(
  '^(?<documentCode>(?<projectCode>IL0?5(?:1)?)-IP-(?<disciplineCode>[A-Z]{1,3})-(?<wirNumber>WIR[.\\s_-]?\\d{1,6})-(?<locationCode>[A-Z0-9]{2,3})-(?<volumeCode>[A-Z0-9]{2})-(?<classificationCode>[A-Z0-9]{2,4})-(?<originatorCode>[A-Z0-9]{2,4}))-(?<revision>[A-Z]\\d{2})-(?<fileTitle>WIR\\s+.+)\\.pdf$',
  'i',
);
const DATE_PATTERN = /\b([0-3]?\d)[.,/-]([01]?\d)[.,/-](20\d{2})\b/g;
const TIME_WINDOW_PATTERN =
  /\b([0-2]?\d[:.]\d{2}\s*(?:-|–|—|to)\s*[0-2]?\d[:.]\d{2})\b/i;
const PILE_NUMBERS_PATTERN = /\((\d+(?:\s*-\s*\d+)+)\)/;

function officialCode(
  items: { code: string }[],
  value: string | undefined,
  fallback?: string,
) {
  const normalized = value?.toUpperCase();
  return normalized && items.some((item) => item.code === normalized)
    ? normalized
    : fallback;
}

function normalizeWirNumber(value: string | undefined) {
  const digits = value?.match(/\d{1,6}/)?.[0];
  if (!digits) return undefined;
  const sequence = Number.parseInt(digits, 10);
  return sequence >= 1 && sequence <= 9999
    ? `WIR.${String(sequence).padStart(4, '0')}`
    : undefined;
}

function isoDate(day: string, month: string, year: string) {
  const candidate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  const date = new Date(`${candidate}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== candidate
    ? undefined
    : candidate;
}

function cleanLine(value: string | undefined) {
  return value
    ?.replace(/^[\s:|_-]+|[\s:|_-]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function findDescription(text: string) {
  const candidates = [
    /(?:Inspection Request Item|Kontrol Talep Edilen Is Kalemi)\s*[:|]?\s*([^\n]{4,180})/i,
    /(?:\(U\)\s*)?Title\s*[:|]?\s*(?:WIR\s+(?:of\s+)?)?([^\n]{4,180})/i,
    /\b(Bored Piling[^\n]{0,150})/i,
    /\b((?:Piling|Concrete|Rebar|Structural Steel|Earthworks?|Excavation|Waterproofing|MEP|Electrical|Mechanical|Fire Protection)[^\n]{0,150})/i,
  ];
  for (const pattern of candidates) {
    const value = cleanLine(text.match(pattern)?.[1]);
    if (value && !/request form/i.test(value)) return value;
  }
  return undefined;
}

function inferDiscipline(text: string) {
  const rules: [RegExp, string][] = [
    [/\b(bored pil|piling|earthwork|excavat|civil|concrete)\b/i, 'C'],
    [/\b(structural|rebar|reinforc|steelwork)\b/i, 'S'],
    [/\b(electrical|cable|switchgear|lighting)\b/i, 'E'],
    [/\b(mechanical|duct|pipework|plumbing|hvac)\b/i, 'M'],
    [/\b(architectural|ceiling|partition|finishes)\b/i, 'A'],
    [/\b(fire alarm)\b/i, 'FA'],
    [/\b(fire protection|sprinkler)\b/i, 'F'],
    [/\b(instrumentation|controls?)\b/i, 'IC'],
  ];
  return rules.find(([pattern]) => pattern.test(text))?.[1];
}

function extractLocation(text: string) {
  return cleanLine(
    text.match(
      /(?:Location|Konum)[^\n]{0,50}((?:Grid|Aks)[^\n]{3,150})/i,
    )?.[1] ?? text.match(/\b((?:Grid|Aks)\s*[:.]?\s*[^\n]{3,150})/i)?.[1],
  );
}

function extractLabeledLine(text: string, label: RegExp) {
  return cleanLine(text.match(label)?.[1]);
}

function extractReference(text: string, label: string) {
  const pattern = new RegExp(
    `${label}[\\s\\S]{0,100}?((?:I|1|L)?L0?51-[A-Z0-9][A-Z0-9./_-]{7,}(?:-[A-Za-z][^\\n|]{0,60})?)`,
    'i',
  );
  return cleanLine(text.match(pattern)?.[1]);
}

function splitLocationSegment(locationSegment: string | undefined) {
  const value = locationSegment?.toUpperCase();
  if (!value) return {};
  if (value.length === 3)
    return { level_code: value.slice(0, 2), plan_area_code: value.slice(2) };
  return { level_code: value };
}

function compactPileNumbers(value: string | undefined) {
  return value?.replace(/\s+/g, '');
}

function reliablePersonName(value: string | undefined) {
  const cleaned = cleanLine(value);
  if (
    !cleaned ||
    /(?:YYYY|SSDD|SIGNATURE|DATE|TARIH|GGA|NAME|SOYAD)/i.test(cleaned)
  )
    return undefined;
  const words = cleaned.match(/[A-ZÀ-ÖØ-Ý][A-ZÀ-ÖØ-Ý'.-]{1,}/gi) ?? [];
  return words.length >= 2 ? cleaned : undefined;
}

function cleanReference(value: string | undefined) {
  const cleaned = cleanLine(value);
  if (!cleaned) return undefined;
  const codeStart = cleaned.search(/(?:IL|1L|LL)[0O]51-/i);
  const reference = codeStart >= 0 ? cleaned.slice(codeStart) : cleaned;
  return reference
    .replace(/^(?:1L|LL)O51-/i, 'IL051-')
    .replace(/^IL051-/i, 'IL051-')
    .trim();
}

function normalizeProjectCode(value: string | undefined) {
  const normalized = value?.toUpperCase();
  return normalized === 'L051' || normalized === 'IL05' ? 'IL051' : normalized;
}

export function parseWirFilename(fileName: string): WirPdfExtractedFields {
  const sourceFilename =
    fileName.split(/[\\/]/).at(-1)?.trim() ?? fileName.trim();
  const match = sourceFilename.match(PROCORE_WIR_FILENAME);
  if (!match?.groups) return { source_filename: sourceFilename };

  const location = splitLocationSegment(match.groups.locationCode);
  const fileTitle = cleanLine(match.groups.fileTitle);
  const inspectionItem = cleanLine(fileTitle?.replace(/^WIR\s+/i, ''));
  const documentCode = match.groups.documentCode.toUpperCase();

  return {
    project_code: normalizeProjectCode(match.groups.projectCode),
    wir_number: normalizeWirNumber(match.groups.wirNumber),
    full_document_code: documentCode,
    discipline_code: officialCode(
      procoreReference.eas6bDisciplines,
      match.groups.disciplineCode,
    ),
    level_code: officialCode(
      procoreReference.eas6bLevels,
      location.level_code,
      'XX',
    ),
    plan_area_code: officialCode(
      procoreReference.eas6bPlanAreas,
      location.plan_area_code,
    ),
    volume_code: officialCode(
      procoreReference.eas6bVolumes,
      match.groups.volumeCode,
      'XX',
    ),
    classification_code: officialCode(
      procoreReference.eas6bClassifications,
      match.groups.classificationCode,
      'XXXX',
    ),
    originator_code: officialCode(
      procoreReference.eas6bOriginators,
      match.groups.originatorCode,
    ),
    revision: match.groups.revision.toUpperCase(),
    inspection_item: inspectionItem,
    description: inspectionItem,
    file_title: fileTitle,
    source_filename: sourceFilename,
    pile_location_numbers: compactPileNumbers(
      inspectionItem?.match(PILE_NUMBERS_PATTERN)?.[1],
    ),
    location_grid: inspectionItem?.match(PILE_NUMBERS_PATTERN)?.[1]
      ? `Pile / Grid (${compactPileNumbers(inspectionItem.match(PILE_NUMBERS_PATTERN)?.[1])})`
      : undefined,
    inspection_type: 'Work Inspection Request',
  };
}

export function parseWirPdfText(rawText: string): WirPdfExtractedFields {
  const text = rawText
    .replace(/\r/g, '\n')
    .replace(/[\t\f\v]+/g, ' ')
    .replace(/ {2,}/g, ' ');
  const officialMatch = text.match(OFFICIAL_WIR_CODE);
  const wirMatch =
    officialMatch?.[3] ??
    text.match(/WIR[.\s_-]?(\d{1,6})\b/i)?.[0] ??
    text.match(
      /\b(?:record|kayit)\s*(?:no|number)?[\s\S]{0,100}?WIR[.\s_-]?(\d{1,6})\b/i,
    )?.[0];
  const rawProjectMatch =
    officialMatch?.[1] ??
    text.match(/\bIL0?5(?:1)?\b/i)?.[0] ??
    text.match(/\bL051\b/i)?.[0];
  const dates = Array.from(text.matchAll(DATE_PATTERN))
    .map((match) => isoDate(match[1], match[2], match[3]))
    .filter((value): value is string => Boolean(value));
  const inspectionItem = findDescription(text);
  const locationGrid = extractLocation(text);
  const locationSegment = officialMatch?.[4]?.toUpperCase();
  const directResult =
    /(?:☑|☒|✓|✔|√|¥|\[\s*[xX]\s*\])['’]?\s*A[.\s-]*ACCEPTED\b/i.test(text)
      ? 'Accepted'
      : /(?:☑|☒|✓|✔|√|¥|\[\s*[xX]\s*\])['’]?\s*B[.\s-]*ACCEPTED WITH COMMENTS\b/i.test(
            text,
          )
        ? 'Conditional'
        : /(?:☑|☒|✓|✔|√|¥|\[\s*[xX]\s*\])['’]?\s*C[.\s-]*(?:REJECTED|REJETED)\b/i.test(
              text,
            )
          ? 'Rejected'
          : undefined;
  const reviewerName = reliablePersonName(
    extractLabeledLine(
      text,
      /(?:Engineer|M[uü]hendis)[\s\S]{0,300}?Name\s*(?:\/\s*Ad Soyad)?\s*[:|]?\s*([A-Z][A-Z .'-]{3,70})/i,
    ),
  );
  const methodStatement =
    cleanReference(
      extractLabeledLine(
        text,
        /Method Statement Ref\.?\s*\/\s*Rev\.?[^\n]{0,30}?[:|]?\s*([^\n|]{5,180})/i,
      ),
    ) ?? cleanReference(extractReference(text, 'Method Statement'));
  const itpReference =
    extractLabeledLine(
      text,
      /ITP Ref\.?\s*\/\s*Rev\.?\s*\/\s*Item[^\n]{0,30}?[:|]?\s*([^\n|]{5,180})/i,
    ) ?? extractReference(text, 'ITP Ref');
  const itpParts = itpReference?.match(
    /^(.*?)(?:[\s/]+(R(?:EV)?[.\s_-]?\d+))?(?:[\s/]+ITEM[.\s_-]?([A-Z0-9.-]+))?$/i,
  );
  const estimatedVolume = cleanLine(
    text.match(
      /Estimated Volume[\s\S]{0,60}?([0-9OØ]{2,6}\s*(?:\([^\n)]{1,40}\))?)/i,
    )?.[1],
  );
  const drawingReference =
    cleanReference(
      extractLabeledLine(
        text,
        /Drawing Ref\.?\s*\/\s*Rev\.?[^\n]{0,30}?[:|]?\s*([^\n|]{5,180})/i,
      ),
    ) ?? cleanReference(extractReference(text, 'Drawing Ref'));
  const itpControlPoint = cleanLine(
    text.match(/ITP Control Point[^\n]{0,100}?\b([HWSR])\b/i)?.[1],
  );
  const timeWindow = text.match(TIME_WINDOW_PATTERN)?.[1]?.replace(/\./g, ':');

  const fields: WirPdfExtractedFields = {
    project_code: normalizeProjectCode(rawProjectMatch),
    wir_number: normalizeWirNumber(wirMatch),
    full_document_code: officialMatch?.[0].toUpperCase(),
    discipline_code: officialCode(
      procoreReference.eas6bDisciplines,
      officialMatch?.[2] ?? inferDiscipline(`${inspectionItem ?? ''}\n${text}`),
    ),
    level_code: officialCode(
      procoreReference.eas6bLevels,
      locationSegment?.slice(0, 2),
      'XX',
    ),
    plan_area_code:
      locationSegment?.length === 3
        ? officialCode(
            procoreReference.eas6bPlanAreas,
            locationSegment.slice(2),
          )
        : undefined,
    volume_code: officialCode(
      procoreReference.eas6bVolumes,
      officialMatch?.[5],
      'XX',
    ),
    classification_code: officialCode(
      procoreReference.eas6bClassifications,
      officialMatch?.[6],
      'XXXX',
    ),
    originator_code: officialCode(
      procoreReference.eas6bOriginators,
      officialMatch?.[7],
      /\bSERBAN\b/i.test(text) ? 'SRB' : undefined,
    ),
    inspection_item: inspectionItem,
    description: inspectionItem,
    file_title: inspectionItem ? `WIR ${inspectionItem}` : undefined,
    pile_location_numbers: compactPileNumbers(
      inspectionItem?.match(PILE_NUMBERS_PATTERN)?.[1] ??
        locationGrid?.match(PILE_NUMBERS_PATTERN)?.[1],
    ),
    inspection_type: 'Work Inspection Request',
    consultant: /\bARUP\b/i.test(text) ? 'ARUP' : undefined,
    contractor: /\bSERBAN\b/i.test(text) ? 'SERBAN' : undefined,
    inspector: reviewerName,
    reviewer_name: reviewerName,
    responsible_company: /\bSERBAN\b/i.test(text) ? 'SERBAN' : undefined,
    location_grid: locationGrid,
    planned_inspection_date: dates[0],
    actual_inspection_date:
      directResult && dates.length > 1 ? dates.at(-1) : undefined,
    inspection_time_window: timeWindow,
    method_statement: methodStatement,
    itp_reference: cleanLine(itpParts?.[1]) ?? itpReference,
    itp_revision: cleanLine(itpParts?.[2]),
    itp_item: cleanLine(itpParts?.[3]),
    itp_control_point: itpControlPoint,
    estimated_volume: estimatedVolume,
    drawing_reference: drawingReference,
    engineer_inspection_result: directResult,
    status:
      directResult === 'Accepted'
        ? 'Passed'
        : directResult === 'Rejected'
          ? 'Failed'
          : directResult === 'Conditional'
            ? 'Closed'
            : undefined,
    result: directResult,
    comments: locationGrid ? `PDF extraction - ${locationGrid}` : undefined,
  };

  return compactFields(fields);
}

function preferInspectionItem(
  filenameValue: string | undefined,
  pdfValue: string | undefined,
) {
  if (!filenameValue) return { value: pdfValue, source: 'pdf' as const };
  if (!pdfValue) return { value: filenameValue, source: 'filename' as const };
  const filenamePiles = filenameValue.match(PILE_NUMBERS_PATTERN)?.[1];
  const pdfPiles = pdfValue.match(PILE_NUMBERS_PATTERN)?.[1];
  if (filenamePiles && !pdfPiles)
    return { value: filenameValue, source: 'filename' as const };
  return { value: pdfValue, source: 'pdf' as const };
}

export function mergeWirPdfExtraction(
  filenameFields: WirPdfExtractedFields,
  pdfFields: WirPdfExtractedFields,
): WirPdfExtractedFields {
  const conflicts: WirPdfExtractionConflict[] = [];
  const merged: WirPdfExtractedFields = { ...filenameFields };
  const inspectionChoice = preferInspectionItem(
    filenameFields.inspection_item,
    pdfFields.inspection_item,
  );

  for (const [field, pdfValue] of Object.entries(pdfFields)) {
    if (pdfValue === undefined || field === 'conflicts') continue;
    const filenameValue = filenameFields[field as keyof WirPdfExtractedFields];
    const selectedSource =
      field === 'inspection_item' ||
      field === 'description' ||
      field === 'pile_location_numbers'
        ? inspectionChoice.source
        : field === 'file_title'
          ? 'filename'
          : 'pdf';
    if (
      typeof filenameValue === 'string' &&
      typeof pdfValue === 'string' &&
      filenameValue !== pdfValue
    ) {
      conflicts.push({
        field,
        filenameValue,
        pdfValue,
        selectedSource,
      });
    }
    if (field === 'inspection_item' || field === 'description') {
      merged[field] = inspectionChoice.value;
    } else if (field === 'file_title' && filenameFields.file_title) {
      merged.file_title = filenameFields.file_title;
    } else if (
      field === 'pile_location_numbers' &&
      inspectionChoice.source === 'filename' &&
      filenameFields.pile_location_numbers
    ) {
      merged.pile_location_numbers = filenameFields.pile_location_numbers;
    } else {
      (merged as Record<string, unknown>)[field] = pdfValue;
    }
  }

  const inspectionItem = merged.inspection_item ?? merged.description;
  merged.inspection_item = inspectionItem;
  merged.description = inspectionItem;
  if (inspectionItem) {
    merged.file_title =
      filenameFields.file_title ??
      pdfFields.file_title ??
      `WIR ${inspectionItem}`;
    merged.pile_location_numbers ??= compactPileNumbers(
      inspectionItem.match(PILE_NUMBERS_PATTERN)?.[1],
    );
  }
  if (conflicts.length) merged.conflicts = conflicts;
  return compactFields(merged);
}

function compactFields(fields: WirPdfExtractedFields) {
  return Object.fromEntries(
    Object.entries(fields).filter(
      ([, value]) => value !== undefined && value !== '',
    ),
  ) as WirPdfExtractedFields;
}

export function hasMeaningfulWirPdfExtraction(fields: WirPdfExtractedFields) {
  return Boolean(
    fields.wir_number ||
    fields.inspection_item ||
    fields.description ||
    fields.planned_inspection_date,
  );
}

export type ProcoreMasterCode = {
  code: string;
  label: string;
  raw: string;
  count: number;
};

export type Eas6bMasterCode = {
  code: string;
  label: string;
  raw: string;
  notes: string | null;
};

export type ProcoreProjectCode = ProcoreMasterCode & {
  sourceProjectCode: string;
  aliases: string[];
};

export type ProcoreNumberingRule = {
  typeCode: string;
  kind: 'numeric' | 'prefixed' | 'literal';
  prefix: string | null;
  width: number;
  count: number;
  examples: string[];
};

export type ProcoreNamingRules = {
  source: string;
  detectedStructure: string[];
  separator: string;
  projectPrefixes: { code: string; count: number }[];
  typeLocationSlots: Record<string, Record<string, number>>;
  note: string;
};

export type Eas6bCoreSegmentKey =
  | 'project'
  | 'file_type'
  | 'discipline'
  | 'number'
  | 'level_area'
  | 'volume'
  | 'classification'
  | 'originator';

export type Eas6bSuffixSegmentKey = 'title' | 'project_phase' | 'issue_stage' | 'revision';

export type Eas6bSegmentRule = {
  position: number;
  key: Eas6bCoreSegmentKey | Eas6bSuffixSegmentKey;
  name: string;
  sourceFields: string[];
  mandatory: boolean;
  optionalFields: string[];
  appliesTo: string[];
  composition?: string;
};

export type Eas6bDocumentTypeRule = {
  pattern: string;
  typeCodes: string[];
  segment4Rule: string;
  segment5Rule: string;
  authority: string;
};

export type Eas6bNamingConvention = {
  source: string;
  sourceSheet: string;
  separator: '-';
  coreSegmentCount: 8;
  fullElectronicFilenameSegmentCount: 12;
  printedDrawingPattern: string;
  coreSegments: Eas6bSegmentRule[];
  electronicFilenameSuffixSegments: Eas6bSegmentRule[];
  documentTypeRules: Eas6bDocumentTypeRule[];
};

export type ProcorePatternComparison = {
  sourceRows: number;
  structuredRows: number;
  unstructuredRows: number;
  coreOnlyRows: number;
  rowsWithSuffix: number;
  officialLocationGrammarRows: number;
  nonConformingLocationRows: number;
  officialClassificationRows: number;
  legacyClassificationRows: number;
  drawingRows: number;
  drawingRowsMatchingListedSheetFamilies: number;
  drawingRowsOutsideListedSheetFamilies: number;
  patterns: {
    pattern: string;
    count: number;
    typeCodes: string[];
    numberShape: string;
    example: string;
    comparison: string;
  }[];
};

export type NumberSegmentAnalysis = {
  value: string;
  kind: 'drawing-sheet' | 'csi-masterformat' | 'project-prefixed-sequence' | 'project-sequence' | 'literal';
  sourceFields: string[];
  components: Record<string, string | null>;
  officialStatus: 'matches' | 'project-extension' | 'legacy-deviation';
  note: string;
};

export type LevelAreaSegmentAnalysis = {
  value: string;
  floorLevel: string | null;
  planArea: string | null;
  officialStatus: 'matches' | 'legacy-deviation';
  note: string;
};

export type BuiltDocumentSegment = {
  position: number;
  key: Eas6bCoreSegmentKey;
  name: string;
  value: string;
  sourceFields: string[];
  mandatory: true;
};

export type ProcoreCsvRow = {
  Name: string;
  Description: string;
  Type: string;
  Revision: string;
  Version: string;
  Status: string;
  'Document Stage': string;
  'Assigned Workflow': string;
  'Workflow Status': string;
  'Current Workflow Step': string;
  Originator: string;
  'Volume / System': string;
  Location: string;
  Discipline: string;
  Number: string;
  Classification: string;
  'Project Stage': string;
  File: string;
  'Date Uploaded': string;
  'Date Updated': string;
  Project: string;
};

export type ParsedDocumentCode = {
  documentCode: string;
  projectCode: string;
  documentTypeCode: string;
  disciplineCode: string;
  number: string;
  locationCode: string;
  volumeSystemCode: string;
  classificationCode: string;
  originatorCode: string;
  suffix: string | null;
  numberAnalysis: NumberSegmentAnalysis;
  levelAreaAnalysis: LevelAreaSegmentAnalysis;
};

export type ProcoreImportRecord = ParsedDocumentCode & {
  description: string;
  revision: string;
  version: string;
  status: string;
  projectStage: string;
  workflowStatus: string | null;
  currentWorkflowStep: string | null;
  assignedWorkflow: string | null;
  fileName: string;
  dateUploaded: string;
  dateUpdated: string;
  procoreName: string;
  procoreProject: string;
  documentTypeLabel: string;
  disciplineLabel: string;
  sourceLocationCode: string;
  sourceClassificationCode: string;
};

export type ProcoreImportPreviewRow = {
  rowNumber: number;
  rawName: string;
  record: ProcoreImportRecord | null;
  errors: string[];
  duplicate: boolean;
};

export type ProcoreCsvAnalysis = {
  headers: string[];
  missingColumns: string[];
  rows: ProcoreImportPreviewRow[];
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
};

export type DocumentCodeParts = {
  projectCode: string;
  documentTypeCode: string;
  disciplineCode: string;
  number: string;
  locationCode: string;
  volumeSystemCode: string;
  classificationCode: string;
  originatorCode: string;
};

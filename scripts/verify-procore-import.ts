import fs from 'node:fs/promises';

import { analyzeProcoreCsv } from '@/lib/procore/csv';
import { analyzeLevelAreaSegment, analyzeNumberSegment, buildDocumentCodeSegments, generateDocumentCode, parseDocumentCode, suggestNextPrefixedNumber } from '@/lib/procore/naming';
import { procoreReference } from '@/lib/procore/reference';

const sourcePath = process.argv[2];
if (!sourcePath) throw new Error('Usage: tsx scripts/verify-procore-import.ts <procore.csv>');

const csvText = await fs.readFile(sourcePath, 'utf8');
const analysis = analyzeProcoreCsv(csvText);
const expectedCodes = [
  'IL051-IP-S-WIR.0008-XX-XX-XXXX-SRB',
  'IL051-TS-E-001-XXX-XX-XXXX-SRB',
  'IL051-PL-H-013-XX-XX-XXXX-SRB',
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(analysis.total === 205, `Expected 205 rows, received ${analysis.total}.`);
assert(analysis.valid === 204, `Expected 204 valid structured records, received ${analysis.valid}.`);
assert(analysis.invalid === 1, `Expected one invalid free-text Name record, received ${analysis.invalid}.`);
assert(analysis.duplicates === 0, `Expected no source duplicates, received ${analysis.duplicates}.`);
assert(analysis.missingColumns.length === 0, `Missing columns: ${analysis.missingColumns.join(', ')}`);

const records = analysis.rows.flatMap((row) => row.record ? [row.record] : []);
for (const expected of expectedCodes) assert(records.some((record) => record.documentCode === expected), `Expected code was not reproduced: ${expected}`);

for (const expected of expectedCodes) {
  const record = records.find((item) => item.documentCode === expected);
  assert(record, `Expected record missing: ${expected}`);
  const generated = generateDocumentCode({ projectCode: record.projectCode, documentTypeCode: record.documentTypeCode, disciplineCode: record.disciplineCode, number: record.number, locationCode: record.locationCode, volumeSystemCode: record.volumeSystemCode, classificationCode: record.classificationCode, originatorCode: record.originatorCode });
  assert(generated === expected, `Naming engine generated ${generated} instead of ${expected}.`);
}

const drawingParts = { projectCode: 'IL051', documentTypeCode: 'DR', disciplineCode: 'A', number: '120', locationCode: '00C', volumeSystemCode: 'ZZ', classificationCode: 'PLAN', originatorCode: 'ARP' };
const drawingSegments = buildDocumentCodeSegments(drawingParts);
assert(drawingSegments.length === 8, 'The official core must contain eight top-level segments.');
assert(generateDocumentCode(drawingParts) === 'IL051-DR-A-120-00C-ZZ-PLAN-ARP', 'Official drawing example was not generated exactly.');
const drawingNumber = analyzeNumberSegment('DR', '120');
assert(drawingNumber.components.sheetType === '1' && drawingNumber.components.sheetSubType === '20' && drawingNumber.components.optionalDigits === null, 'Drawing Segment 4 was not split into sheet type and sub-type.');
const drawingLocation = analyzeLevelAreaSegment('00C');
assert(drawingLocation.floorLevel === '00' && drawingLocation.planArea === 'C', 'Drawing Segment 5 was not split into floor level and plan area.');
const wir = parseDocumentCode('IL051-IP-S-WIR.0008-XX-XX-XXXX-SRB');
assert(wir?.numberAnalysis.components.prefix === 'WIR' && wir.numberAnalysis.components.sequence === '0008', 'WIR prefix and sequence must remain inside Segment 4.');
assert(analyzeNumberSegment('TS', '001').officialStatus === 'legacy-deviation', 'Three-digit Procore TS numbering must be identified as a deviation from the official CSI/MasterFormat rule.');
assert(analyzeNumberSegment('TS', '265000').officialStatus === 'matches', 'Six-digit CSI/MasterFormat technical-submittal numbering should match the official rule.');
assert(analyzeLevelAreaSegment('Z').officialStatus === 'legacy-deviation', 'One-character legacy location must be identified as non-conforming.');
assert(procoreReference.eas6b.fullElectronicFilenameSegmentCount === 12, 'The official full electronic filename must contain twelve top-level segments.');
assert(procoreReference.patternComparison.patterns.reduce((total, pattern) => total + pattern.count, 0) === 204, 'Every structured Procore pattern must be represented in the comparison dataset.');

assert(suggestNextPrefixedNumber(['WIR.0008', 'WIR.0009', 'WIR.0010'], 'IP') === 'WIR.0011', 'Four-digit WIR next-number suggestion failed.');
const importedIpWirNumbers = records.filter((record) => record.documentTypeCode === 'IP' && record.disciplineCode === 'S' && record.number.startsWith('WIR.')).map((record) => record.number);
assert(suggestNextPrefixedNumber(importedIpWirNumbers, 'IP') === 'WIR.0014', 'Source-based WIR next-number suggestion failed.');

const duplicateAnalysis = analyzeProcoreCsv(csvText, [expectedCodes[0]]);
assert(duplicateAnalysis.duplicates === 1, 'Existing-code duplicate detection failed.');
assert(duplicateAnalysis.valid === 203, 'Duplicate record was not excluded from the importable count.');

console.log(JSON.stringify({ rows: analysis.total, valid: analysis.valid, invalid: analysis.invalid, duplicates: analysis.duplicates, reproducedExamples: expectedCodes, officialDrawingExample: generateDocumentCode(drawingParts), coreSegments: drawingSegments.length, fullElectronicFilenameSegments: procoreReference.eas6b.fullElectronicFilenameSegmentCount, comparedStructuredPatterns: 204, suggestedWir: 'WIR.0014', duplicateSafety: 'passed' }, null, 2));

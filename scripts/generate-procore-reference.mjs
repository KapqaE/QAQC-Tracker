import fs from 'node:fs/promises';
import path from 'node:path';

import Papa from 'papaparse';

const sourcePath = process.argv[2];
const outputDirectory = process.argv[3] ?? path.join(process.cwd(), 'data', 'procore');

if (!sourcePath) {
  throw new Error('Usage: node scripts/generate-procore-reference.mjs <procore.csv> [output-directory]');
}

const requiredColumns = [
  'Name', 'Description', 'Type', 'Revision', 'Version', 'Status', 'Originator',
  'Volume / System', 'Location', 'Discipline', 'Number', 'Classification',
  'Project Stage', 'File', 'Date Uploaded', 'Date Updated', 'Project',
];

const text = await fs.readFile(sourcePath, 'utf8');
const parsed = Papa.parse(text, { header: true, skipEmptyLines: 'greedy' });

if (parsed.errors.length) {
  throw new Error(`CSV parsing failed: ${parsed.errors[0].message}`);
}

const rows = parsed.data;
const missingColumns = requiredColumns.filter((column) => !parsed.meta.fields?.includes(column));
if (missingColumns.length) {
  throw new Error(`CSV is missing required columns: ${missingColumns.join(', ')}`);
}

function splitCodeLabel(rawValue) {
  const raw = String(rawValue ?? '').trim();
  const match = raw.match(/^(.+?)\s+(?:-|–)\s+(.+)$/u);
  return match ? { code: match[1].trim(), label: match[2].trim(), raw } : { code: raw, label: raw, raw };
}

function valuesFor(column) {
  const values = new Map();
  for (const row of rows) {
    const raw = String(row[column] ?? '').trim();
    if (!raw) continue;
    const current = values.get(raw) ?? 0;
    values.set(raw, current + 1);
  }
  return [...values.entries()]
    .map(([raw, count]) => ({ ...splitCodeLabel(raw), count }))
    .sort((left, right) => left.code.localeCompare(right.code));
}

function parseCoreName(row) {
  const segments = String(row.Name ?? '').trim().split('-');
  if (segments.length < 8) return null;
  return {
    documentCode: segments.slice(0, 8).join('-'),
    projectCode: segments[0],
    documentTypeCode: segments[1],
    disciplineCode: segments[2],
    number: segments[3],
    locationSlotCode: segments[4],
    volumeSystemCode: segments[5],
    classificationCode: segments[6],
    originatorCode: segments[7],
    suffix: segments.slice(8).join('-') || null,
  };
}

function numberPattern(value) {
  const prefixed = value.match(/^([A-Z]+)\.(\d+)$/);
  if (prefixed) return { kind: 'prefixed', prefix: prefixed[1], width: prefixed[2].length };
  if (/^\d+$/.test(value)) return { kind: 'numeric', prefix: null, width: value.length };
  return { kind: 'literal', prefix: null, width: value.length };
}

const parsedNames = rows.map((row) => ({ row, core: parseCoreName(row) }));
const validNames = parsedNames.filter(({ core }) => core);
const projectPrefixCounts = new Map();
for (const { core } of validNames) {
  projectPrefixCounts.set(core.projectCode, (projectPrefixCounts.get(core.projectCode) ?? 0) + 1);
}

const projectPrefixes = [...projectPrefixCounts.entries()]
  .map(([code, count]) => ({ code, count }))
  .sort((left, right) => right.count - left.count || left.code.localeCompare(right.code));

const projects = valuesFor('Project').map((project) => {
  const namingCode = projectPrefixes[0]?.code ?? project.code;
  return {
    code: namingCode,
    label: project.label,
    raw: project.raw,
    sourceProjectCode: project.code,
    aliases: projectPrefixes.filter((item) => item.code !== namingCode).map((item) => item.code),
    count: project.count,
  };
});

const locationLabels = new Map(valuesFor('Location').map((item) => [item.code, item.label]));
const locationSlotCounts = new Map();
for (const { core } of validNames) {
  locationSlotCounts.set(core.locationSlotCode, (locationSlotCounts.get(core.locationSlotCode) ?? 0) + 1);
}
const namingLocationSlots = [...locationSlotCounts.entries()]
  .map(([code, count]) => ({
    code,
    label: locationLabels.get(code) ?? 'Observed naming slot (no label in the Procore Location field)',
    raw: code,
    count,
  }))
  .sort((left, right) => left.code.localeCompare(right.code));

const classificationLabels = new Map(valuesFor('Classification').map((item) => [item.code, item.label]));
const classificationSlotCounts = new Map();
for (const { core } of validNames) {
  classificationSlotCounts.set(core.classificationCode, (classificationSlotCounts.get(core.classificationCode) ?? 0) + 1);
}
const namingClassificationSlots = [...classificationSlotCounts.entries()]
  .map(([code, count]) => ({
    code,
    label: classificationLabels.get(code) ?? 'Observed legacy naming slot (no matching Classification field label)',
    raw: code,
    count,
  }))
  .sort((left, right) => left.code.localeCompare(right.code));

const numberingRuleMap = new Map();
for (const row of rows) {
  const typeCode = splitCodeLabel(row.Type).code;
  const pattern = numberPattern(String(row.Number ?? '').trim());
  const key = `${typeCode}|${pattern.kind}|${pattern.prefix ?? ''}|${pattern.width}`;
  const current = numberingRuleMap.get(key) ?? { typeCode, ...pattern, count: 0, examples: [] };
  current.count += 1;
  if (current.examples.length < 5 && !current.examples.includes(row.Number)) current.examples.push(row.Number);
  numberingRuleMap.set(key, current);
}
const numberingRules = [...numberingRuleMap.values()].sort((left, right) =>
  left.typeCode.localeCompare(right.typeCode) || left.kind.localeCompare(right.kind) || (left.prefix ?? '').localeCompare(right.prefix ?? '') || left.width - right.width,
);

const typeLocationSlots = {};
for (const { row, core } of validNames) {
  const typeCode = splitCodeLabel(row.Type).code;
  const slots = typeLocationSlots[typeCode] ?? {};
  slots[core.locationSlotCode] = (slots[core.locationSlotCode] ?? 0) + 1;
  typeLocationSlots[typeCode] = slots;
}

const coreMismatches = validNames.filter(({ row, core }) =>
  core.documentTypeCode !== splitCodeLabel(row.Type).code ||
  core.disciplineCode !== splitCodeLabel(row.Discipline).code ||
  core.number !== String(row.Number).trim() ||
  core.volumeSystemCode !== splitCodeLabel(row['Volume / System']).code ||
  core.originatorCode !== splitCodeLabel(row.Originator).code,
);

const duplicateCodes = [...validNames.reduce((map, { core }) => {
  map.set(core.documentCode, (map.get(core.documentCode) ?? 0) + 1);
  return map;
}, new Map()).entries()].filter(([, count]) => count > 1).map(([code, count]) => ({ code, count }));

const files = {
  'projects.json': projects,
  'document-types.json': valuesFor('Type'),
  'disciplines.json': valuesFor('Discipline'),
  'originators.json': valuesFor('Originator'),
  'volumes-systems.json': valuesFor('Volume / System'),
  'locations.json': valuesFor('Location'),
  'naming-location-slots.json': namingLocationSlots,
  'classifications.json': valuesFor('Classification'),
  'naming-classification-slots.json': namingClassificationSlots,
  'statuses.json': valuesFor('Status'),
  'revision-patterns.json': valuesFor('Revision'),
  'project-stages.json': valuesFor('Project Stage'),
  'workflow-statuses.json': valuesFor('Workflow Status'),
  'current-workflow-steps.json': valuesFor('Current Workflow Step'),
  'assigned-workflows.json': valuesFor('Assigned Workflow'),
  'numbering-rules.json': numberingRules,
  'naming-rules.json': {
    source: path.basename(sourcePath),
    detectedStructure: ['project', 'type', 'discipline', 'number', 'location_slot', 'volume_system', 'classification', 'originator'],
    separator: '-',
    projectPrefixes,
    typeLocationSlots,
    note: 'Imported Name values remain authoritative. The generated code uses the first eight hyphen-delimited segments; suffixes are preserved separately.',
  },
  'source-summary.json': {
    source: path.basename(sourcePath),
    rowCount: rows.length,
    validStructuredNames: validNames.length,
    invalidStructuredNames: rows.length - validNames.length,
    coreMismatchCount: coreMismatches.length,
    namingObservations: {
      namesWithSuffix: validNames.filter(({ core }) => core.suffix).length,
      locationSlotDiffersFromLocationField: validNames.filter(({ row, core }) => core.locationSlotCode !== splitCodeLabel(row.Location).code).length,
      classificationSlotDiffersFromClassificationField: validNames.filter(({ row, core }) => core.classificationCode !== splitCodeLabel(row.Classification).code).length,
      projectPrefixes,
    },
    duplicateDocumentCodes: duplicateCodes,
    requiredColumns,
    missingRequiredValues: Object.fromEntries(requiredColumns.map((column) => [column, rows.filter((row) => !String(row[column] ?? '').trim()).length])),
  },
};

await fs.mkdir(outputDirectory, { recursive: true });
await Promise.all(Object.entries(files).map(([name, value]) =>
  fs.writeFile(path.join(outputDirectory, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8'),
));

console.log(JSON.stringify({ outputDirectory, generated: Object.keys(files), rowCount: rows.length }, null, 2));

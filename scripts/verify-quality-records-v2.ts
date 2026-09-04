import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  generateQualityDocumentCode,
  normalizeQualityStatus,
  RRR_DOCUMENT_CODE,
  RRR_TEMPLATE_CODE,
  rrrReadinessControls,
  suggestNextRecordNumber,
  suggestNextRrrNumber,
} from '@/lib/quality-records/model';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(suggestNextRecordNumber('MIR', []) === 'MIR.0001', 'The first MIR must be MIR.0001.');
assert(suggestNextRecordNumber('NCR', ['NCR.0002', 'legacy-17', null]) === 'NCR.0003', 'NCR numbering must ignore legacy formats without rejecting them.');
assert(suggestNextRecordNumber('SOR', ['SOR.0099']) === 'SOR.0100', 'SOR numbering must preserve four digits.');
assert(suggestNextRrrNumber([]) === 'RRR.000001', 'The first RRR must use a six-digit sequence.');
assert(suggestNextRrrNumber(['RRR.000001', 'RRR.000019', 'RRR.12']) === 'RRR.000020', 'RRR numbering must follow the highest valid six-digit record.');

const mirCode = generateQualityDocumentCode({ projectCode: 'IL051', recordType: 'MIR', recordNumber: 'MIR.0001', disciplineCode: 'C', levelCode: 'XX', planAreaCode: null, volumeCode: 'XX', classificationCode: 'XXXX', originatorCode: 'SRB' });
assert(mirCode === 'IL051-IP-C-MIR.0001-XX-XX-XXXX-SRB', 'MIR document code must use the eight official EAS-6-B segments.');
assert(RRR_DOCUMENT_CODE === 'IL051-RP-G-RRR', 'RRR must retain its fixed controlled document code.');
assert(RRR_TEMPLATE_CODE === 'SBI-EQIL5-KLT-FR-RRR', 'RRR must retain its SERBAN template code separately.');
assert(rrrReadinessControls.length === 5 && rrrReadinessControls.at(-1)?.startsWith('RR-4 Life Safety'), 'The readiness model must include the RR-4 life-safety/LOTO hard gate.');
assert(normalizeQualityStatus('Released for Energization') === 'approved', 'Released RRR records must map to the approved dashboard group.');
assert(normalizeQualityStatus('Not Verified') === 'rejected', 'Not Verified must remain distinguishable on the dashboard.');

const migration = readFileSync(resolve('database/006_quality_records_v2.sql'), 'utf8');
const actions = readFileSync(resolve('app/actions/quality-records.ts'), 'utf8');
const extraction = readFileSync(resolve('lib/wir/pdf-extraction.client.ts'), 'utf8');

for (const table of ['mir_records','sor_records','rrr_records','quality_record_actions','rrr_readiness_controls','rrr_commissioning_tags','rrr_open_items','rrr_evidence','rrr_attendance','rrr_signatories','rrr_submission_revisions','rrr_linked_attachments','record_links']) {
  assert(migration.includes(`alter table public.${table} enable row level security`), `${table} must have RLS enabled.`);
}
assert(migration.includes("execute format('revoke all on public.%I from anon'"), 'Anonymous table access must be revoked for every V2 table.');
assert(migration.includes("rr4.percent_complete < 100") || actions.includes('rr4.percent_complete < 100'), 'RR-4 must block release below 100%.');
assert(actions.includes("['P1','P2']") && actions.includes("neq('status', 'Closed')"), 'Open P1/P2 items must block RRR release.');
assert(actions.includes("engineer_decision !== 'Verified'") && actions.includes("'Accepted with Conditions'"), 'Energization must require Engineer and CxA gates.');

const forbiddenPersistence = [/\.storage\s*\.from\s*\(/, /insert\s*\([^)]*(?:base64|blob|pdf_content)/i];
for (const pattern of forbiddenPersistence) assert(!pattern.test(extraction), 'WIR extraction must not persist source files or encoded content.');
assert(extraction.includes('arrayBuffer()'), 'WIR extraction must read the selected file locally.');
assert(extraction.includes('tesseract.js'), 'The browser-side OCR fallback must remain available.');

console.log(JSON.stringify({
  numbering: { mir: 'MIR.0001', ncr: 'NCR.0003', sor: 'SOR.0100', rrr: 'RRR.000020' },
  mirCode,
  rrrDocumentCode: RRR_DOCUMENT_CODE,
  readinessControls: rrrReadinessControls.length,
  rlsTablesChecked: 13,
  browserOnlyWirExtraction: true,
}, null, 2));

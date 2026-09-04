import type { QualityRecordRow } from '@/components/quality-records/quality-record-manager';

export function toQualityRecordRow(record: Record<string, unknown>): QualityRecordRow {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value === null || ['string', 'number', 'boolean'].includes(typeof value)),
  ) as QualityRecordRow;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

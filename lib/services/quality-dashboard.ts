import type { SupabaseClient } from '@supabase/supabase-js';

import { normalizeQualityStatus } from '@/lib/quality-records/model';
import type { Database } from '@/types/database';

export type QualityDashboardRecord = { id: string; number: string; type: 'WIR' | 'MIR' | 'NCR' | 'SOR' | 'RRR'; description: string; discipline: string; status: string; updated_at: string };

export async function getQualityDashboard(client: SupabaseClient<Database>) {
  const [wirResult, mirResult, ncrResult, sorResult, rrrResult, actionResult, readinessResult, openItemResult] = await Promise.all([
    client.from('inspections').select('*').order('updated_at', { ascending: false }), client.from('mir_records').select('*').order('updated_at', { ascending: false }),
    client.from('ncrs').select('*').order('updated_at', { ascending: false }), client.from('sor_records').select('*').order('updated_at', { ascending: false }),
    client.from('rrr_records').select('*').order('updated_at', { ascending: false }), client.from('quality_record_actions').select('*').order('due_date'),
    client.from('rrr_readiness_controls').select('*'), client.from('rrr_open_items').select('*'),
  ]);
  const wirs = wirResult.data ?? []; const mirs = mirResult.data ?? []; const ncrs = ncrResult.data ?? []; const sors = sorResult.data ?? []; const rrrs = rrrResult.data ?? []; const actions = actionResult.data ?? [];
  const records: QualityDashboardRecord[] = [
    ...wirs.map((r) => ({ id: r.id, number: r.wir_number || r.inspection_number, type: 'WIR' as const, description: r.inspection_item || r.description, discipline: r.discipline, status: r.status, updated_at: r.updated_at })),
    ...mirs.map((r) => ({ id: r.id, number: r.mir_number, type: 'MIR' as const, description: r.material_title, discipline: r.discipline, status: r.status, updated_at: r.updated_at })),
    ...ncrs.map((r) => ({ id: r.id, number: r.ncr_number, type: 'NCR' as const, description: r.title, discipline: r.discipline, status: r.status, updated_at: r.updated_at })),
    ...sors.map((r) => ({ id: r.id, number: r.sor_number, type: 'SOR' as const, description: r.title, discipline: r.discipline, status: r.status, updated_at: r.updated_at })),
    ...rrrs.map((r) => ({ id: r.id, number: r.record_number, type: 'RRR' as const, description: r.title, discipline: r.discipline, status: r.status, updated_at: r.updated_at })),
  ].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const now = new Date().toISOString().slice(0, 10); const activeActions = actions.filter((r) => !['Verified','Closed'].includes(r.status));
  const rr4Rows = (readinessResult.data ?? []).filter((r) => r.control_level.startsWith('RR-4')); const blockedIds = new Set(rr4Rows.filter((r) => r.percent_complete < 100 || r.open_actions_count > 0).map((r) => r.rrr_id));
  for (const item of openItemResult.data ?? []) if (item.status !== 'Closed' && ['P1','P2'].includes(item.priority)) blockedIds.add(item.rrr_id);
  const metrics = { total: records.length, wir: wirs.length, mir: mirs.length, ncr: ncrs.length, sor: sors.length, rrr: rrrs.length,
    inReview: records.filter((r) => normalizeQualityStatus(r.status) === 'review').length, approved: records.filter((r) => normalizeQualityStatus(r.status) === 'approved').length,
    rejected: records.filter((r) => normalizeQualityStatus(r.status) === 'rejected').length, openActions: activeActions.length, overdueActions: activeActions.filter((r) => r.due_date < now).length,
    roomsReady: rrrs.filter((r) => ['Released for Commissioning','Released for Energization'].includes(r.status) && !blockedIds.has(r.id)).length,
    roomsNotReady: rrrs.filter((r) => !['Released for Commissioning','Released for Energization'].includes(r.status) || blockedIds.has(r.id)).length, rr4Incomplete: blockedIds.size };
  const error = [wirResult.error, mirResult.error, ncrResult.error, sorResult.error, rrrResult.error, actionResult.error, readinessResult.error, openItemResult.error].find(Boolean);
  return { metrics, recentRecords: records.slice(0, 8), actions: activeActions.slice(0, 8), rrrs, blockedIds, error: error ? 'Some V2 dashboard data is unavailable. Apply database/006_quality_records_v2.sql in Supabase.' : null };
}

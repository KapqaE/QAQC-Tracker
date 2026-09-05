import { readAll } from '@/lib/services/read-all';
import { rrrGateIssues, rrrReleaseIssues } from '@/lib/quality-records/rrr-gate';
import type { SupabaseClient } from '@supabase/supabase-js';

import { normalizeQualityStatus } from '@/lib/quality-records/model';
import type { Database } from '@/types/database';

export type QualityDashboardRecord = { id: string; number: string; type: 'WIR' | 'MIR' | 'NCR' | 'SOR' | 'RRR'; description: string; discipline: string; status: string; updated_at: string };

export async function getQualityDashboard(client: SupabaseClient<Database>, projectId?: string) {
  const [wirResult, mirResult, ncrResult, sorResult, rrrResult, actionResult, readinessResult, openItemResult, tagResult] = await Promise.all([
    readAll(client.from('inspections').select('*').eq('project_id', projectId ?? '00000000-0000-0000-0000-000000000000').order('updated_at', { ascending: false }).order('id')), readAll(client.from('mir_records').select('*').eq('project_id', projectId ?? '00000000-0000-0000-0000-000000000000').order('updated_at', { ascending: false }).order('id')),
    readAll(client.from('ncrs').select('*').eq('project_id', projectId ?? '00000000-0000-0000-0000-000000000000').order('updated_at', { ascending: false }).order('id')), readAll(client.from('sor_records').select('*').eq('project_id', projectId ?? '00000000-0000-0000-0000-000000000000').order('updated_at', { ascending: false }).order('id')),
    readAll(client.from('rrr_records').select('*').eq('project_id', projectId ?? '00000000-0000-0000-0000-000000000000').order('updated_at', { ascending: false }).order('id')), readAll(client.from('quality_record_actions').select('*').eq('project_id', projectId ?? '00000000-0000-0000-0000-000000000000').order('due_date').order('id')),
    readAll(client.from('rrr_readiness_controls').select('*').order('id')), readAll(client.from('rrr_open_items').select('*').order('id')), readAll(client.from('rrr_commissioning_tags').select('*').order('id')),
  ]);
  const wirs = wirResult.data ?? []; const mirs = mirResult.data ?? []; const ncrs = ncrResult.data ?? []; const sors = sorResult.data ?? []; const rrrs = rrrResult.data ?? []; const actions = actionResult.data ?? [];
  const records: QualityDashboardRecord[] = [
    ...wirs.map((r) => ({ id: r.id, number: r.wir_number || r.inspection_number, type: 'WIR' as const, description: r.inspection_item || r.description, discipline: r.discipline, status: r.engineer_inspection_result || (r.result && r.result !== 'N/A' && r.result !== 'Pending' ? r.result : r.status), updated_at: r.updated_at })),
    ...mirs.map((r) => ({ id: r.id, number: r.mir_number, type: 'MIR' as const, description: r.material_title, discipline: r.discipline, status: r.status, updated_at: r.updated_at })),
    ...ncrs.map((r) => ({ id: r.id, number: r.ncr_number, type: 'NCR' as const, description: r.title, discipline: r.discipline, status: r.status, updated_at: r.updated_at })),
    ...sors.map((r) => ({ id: r.id, number: r.sor_number, type: 'SOR' as const, description: r.title, discipline: r.discipline, status: r.status, updated_at: r.updated_at })),
    ...rrrs.map((r) => ({ id: r.id, number: r.record_number, type: 'RRR' as const, description: r.title, discipline: r.discipline, status: r.status, updated_at: r.updated_at })),
  ].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const now = new Date().toISOString().slice(0, 10); const activeActions = actions.filter((r) => !['Verified','Closed'].includes(r.status));
  const blockedIds = new Set(rrrs.filter((r) => rrrGateIssues(r,
    (readinessResult.data ?? []).filter((row) => row.rrr_id === r.id),
    (openItemResult.data ?? []).filter((row) => row.rrr_id === r.id)).length > 0).map((r) => r.id));
  const tagsAllowRelease = (r: (typeof rrrs)[number]) => {
    if (r.status !== 'Released for Energization') return true;
    const tags = (tagResult.data ?? []).filter((t) => t.rrr_id === r.id && t.tag_type === 'L2B YELLOW TAG');
    return tags.length > 0 && tags.every((t) => t.cxa_signoff_date && t.reference?.trim());
  };
  const releasedIds = new Set(rrrs.filter((r) => ['Released for Commissioning','Released for Energization'].includes(r.status)
    && tagsAllowRelease(r) && rrrReleaseIssues(r, (readinessResult.data ?? []).filter((row) => row.rrr_id === r.id), (openItemResult.data ?? []).filter((row) => row.rrr_id === r.id)).length === 0).map((r) => r.id));
  const rr4Incomplete = rrrs.filter((r) => {
    const controls = (readinessResult.data ?? []).filter((row) => row.rrr_id === r.id && row.control_level.startsWith('RR-4'));
    return !controls.length || controls.some((row) => row.percent_complete < 100 || row.open_actions_count > 0);
  }).length;
  const metrics = { total: records.length, wir: wirs.length, mir: mirs.length, ncr: ncrs.length, sor: sors.length, rrr: rrrs.length,
    inReview: records.filter((r) => normalizeQualityStatus(r.status) === 'review').length, approved: records.filter((r) => normalizeQualityStatus(r.status) === 'approved').length,
    rejected: records.filter((r) => normalizeQualityStatus(r.status) === 'rejected').length, openActions: activeActions.length, overdueActions: activeActions.filter((r) => r.due_date < now).length,
    roomsReady: releasedIds.size,
    roomsNotReady: rrrs.length - releasedIds.size, rr4Incomplete };
  const error = [wirResult.error, mirResult.error, ncrResult.error, sorResult.error, rrrResult.error, actionResult.error, readinessResult.error, openItemResult.error, tagResult.error].find(Boolean);
  return { metrics, recentRecords: records.slice(0, 8), actions: activeActions.slice(0, 8), rrrs, blockedIds, error: error ? 'Some quality data could not be loaded. Check your connection, access, and database migrations.' : null };
}

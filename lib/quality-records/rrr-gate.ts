import type { Tables } from '@/types/database';

export const declarationFields = ['room_complete', 'no_open_p1_p2_items', 'declaration_complete',
  'room_secured_under_control', 'doors_installed_locked', 'access_retained_by_authorized_person',
  'permit_sleeve_fitted', 'loto_applied', 'live_warning_notices_fitted',
  'life_safety_provisions_in_place', 'cleanliness_dust_control_maintained'] as const;

export function rrrGateIssues(record: Partial<Tables<'rrr_records'>>,
  readiness: Pick<Tables<'rrr_readiness_controls'>, 'control_level' | 'percent_complete' | 'open_actions_count'>[],
  openItems: Pick<Tables<'rrr_open_items'>, 'status' | 'priority'>[]) {
  const issues: string[] = [];
  const rr4 = readiness.filter((r) => r.control_level.startsWith('RR-4'));
  if (!rr4.length || rr4.some((r) => r.percent_complete < 100 || r.open_actions_count > 0)) issues.push('RR-4 must be 100% complete with zero open actions.');
  if (openItems.some((r) => r.status !== 'Closed' && ['P1', 'P2'].includes(r.priority))) issues.push('Close every P1/P2 blocker.');
  if (declarationFields.some((key) => record[key] !== true)) issues.push('Complete the readiness and contractor declarations.');
  return issues;
}

export function rrrReleaseIssues(record: Partial<Tables<'rrr_records'>>,
  readiness: Parameters<typeof rrrGateIssues>[1], openItems: Parameters<typeof rrrGateIssues>[2]) {
  const released = ['Released for Commissioning', 'Released for Energization'].includes(record.status ?? '')
    || ['Room Released for Commissioning', 'Released for Energization — L2B Tags Signed Off'].includes(record.employer_release ?? '');
  if (!released) return [];
  const issues = rrrGateIssues(record, readiness, openItems);
  if (record.engineer_decision !== 'Verified') issues.push('Engineer verification is required.');
  if (!['Accepted', 'Accepted with Conditions'].includes(record.cxa_decision ?? '')) issues.push('CxA acceptance is required.');
  const expected = record.status === 'Released for Energization' ? 'Released for Energization — L2B Tags Signed Off' : 'Room Released for Commissioning';
  if (!['Released for Commissioning', 'Released for Energization'].includes(record.status ?? '') || record.employer_release !== expected) issues.push('Workflow status and Employer release must agree.');
  return issues;
}

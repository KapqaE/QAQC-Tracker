import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Tables } from '@/types/database';
import type { ActivityItem, DashboardMetrics, DeadlineItem } from '@/types/qaqc';

export type DashboardData = {
  metrics: DashboardMetrics;
  inspections: Tables<'inspections'>[];
  ncrs: Tables<'ncrs'>[];
  punchItems: Tables<'punch_items'>[];
  documents: Tables<'documents'>[];
  projects: Tables<'projects'>[];
  recentActivity: ActivityItem[];
  upcomingDeadlines: DeadlineItem[];
  error: string | null;
};

function dateAtMidnight(value: string) {
  return new Date(`${value}T00:00:00`);
}

function relativeDate(value: string, today: Date) {
  const days = Math.ceil((dateAtMidnight(value).getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(dateAtMidnight(value));
}

function relativeTime(value: string) {
  const elapsed = Date.now() - new Date(value).getTime();
  const hours = Math.floor(elapsed / 3_600_000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export async function getDashboardData(client: SupabaseClient<Database>): Promise<DashboardData> {
  const [inspectionResult, ncrResult, punchResult, documentResult, projectResult] = await Promise.all([
    client.from('inspections').select('*').order('updated_at', { ascending: false }),
    client.from('ncrs').select('*').order('updated_at', { ascending: false }),
    client.from('punch_items').select('*').order('updated_at', { ascending: false }),
    client.from('documents').select('*').order('updated_at', { ascending: false }),
    client.from('projects').select('*').order('updated_at', { ascending: false }),
  ]);

  const inspections = inspectionResult.data ?? [];
  const ncrs = ncrResult.data ?? [];
  const punchItems = punchResult.data ?? [];
  const documents = documentResult.data ?? [];
  const projects = projectResult.data ?? [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const openNcrs = ncrs.filter((item) => item.status !== 'Closed');
  const closedNcrs = ncrs.filter((item) => item.status === 'Closed');
  const openPunchItems = punchItems.filter((item) => item.status !== 'Closed');
  const closedPunchItems = punchItems.filter((item) => item.status === 'Closed');
  const totalQualityItems = ncrs.length + punchItems.length;

  const metrics: DashboardMetrics = {
    totalInspections: inspections.length,
    pendingInspections: inspections.filter((item) => ['Planned', 'Requested', 'In Progress'].includes(item.status)).length,
    passedInspections: inspections.filter((item) => ['Passed', 'Closed'].includes(item.status)).length,
    openNcrs: openNcrs.length,
    closedNcrs: closedNcrs.length,
    overdueNcrs: openNcrs.filter((item) => dateAtMidnight(item.due_date) < today).length,
    openPunchItems: openPunchItems.length,
    overduePunchItems: openPunchItems.filter((item) => dateAtMidnight(item.due_date) < today).length,
    totalDocuments: documents.length,
    completionPercentage: totalQualityItems === 0 ? 0 : Math.round(((closedNcrs.length + closedPunchItems.length) / totalQualityItems) * 100),
  };

  const recentActivity = [
    ...projects.map((item) => ({ id: item.id, title: 'Project updated', description: `${item.project_code} · ${item.name}`, time: relativeTime(item.updated_at), kind: 'project' as const, timestamp: item.updated_at })),
    ...inspections.map((item) => ({ id: item.id, title: ['Passed', 'Closed'].includes(item.status) ? 'Inspection completed' : 'Inspection updated', description: `${item.inspection_number} · ${item.area}`, time: relativeTime(item.updated_at), kind: 'inspection' as const, timestamp: item.updated_at })),
    ...ncrs.map((item) => ({ id: item.id, title: item.status === 'Closed' ? 'NCR closed' : 'NCR updated', description: `${item.ncr_number} · ${item.title}`, time: relativeTime(item.updated_at), kind: 'ncr' as const, timestamp: item.updated_at })),
    ...punchItems.map((item) => ({ id: item.id, title: item.status === 'Closed' ? 'Punch item closed' : 'Punch item updated', description: `${item.punch_number} · ${item.area}`, time: relativeTime(item.updated_at), kind: 'punch' as const, timestamp: item.updated_at })),
    ...documents.map((item) => ({ id: item.id, title: 'Document updated', description: `${item.document_number} · Rev ${item.revision}`, time: relativeTime(item.updated_at), kind: 'document' as const, timestamp: item.updated_at })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5).map(({ timestamp: _timestamp, ...item }) => item);

  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 7);
  const upcomingDeadlines: (DeadlineItem & { sortDate: string })[] = [
    ...openNcrs.filter((item) => dateAtMidnight(item.due_date) <= horizon).map((item) => ({ id: item.id, reference: item.ncr_number, title: item.title, date: shortDate(item.due_date), relative: relativeDate(item.due_date, today), kind: 'NCR' as const, urgency: dateAtMidnight(item.due_date) < today ? 'overdue' as const : dateAtMidnight(item.due_date).getTime() === today.getTime() ? 'today' as const : 'soon' as const, sortDate: item.due_date })),
    ...openPunchItems.filter((item) => dateAtMidnight(item.due_date) <= horizon).map((item) => ({ id: item.id, reference: item.punch_number, title: item.description, date: shortDate(item.due_date), relative: relativeDate(item.due_date, today), kind: 'Punch' as const, urgency: dateAtMidnight(item.due_date) < today ? 'overdue' as const : dateAtMidnight(item.due_date).getTime() === today.getTime() ? 'today' as const : 'soon' as const, sortDate: item.due_date })),
    ...inspections.filter((item) => ['Planned', 'Requested', 'In Progress'].includes(item.status) && dateAtMidnight(item.planned_inspection_date) <= horizon).map((item) => ({ id: item.id, reference: item.inspection_number, title: item.description, date: shortDate(item.planned_inspection_date), relative: relativeDate(item.planned_inspection_date, today), kind: 'Inspection' as const, urgency: dateAtMidnight(item.planned_inspection_date) < today ? 'overdue' as const : dateAtMidnight(item.planned_inspection_date).getTime() === today.getTime() ? 'today' as const : 'soon' as const, sortDate: item.planned_inspection_date })),
  ].sort((a, b) => a.sortDate.localeCompare(b.sortDate)).slice(0, 5);

  const errors = [inspectionResult.error, ncrResult.error, punchResult.error, documentResult.error, projectResult.error].filter(Boolean);

  return {
    metrics,
    inspections,
    ncrs,
    punchItems,
    documents,
    projects,
    recentActivity,
    upcomingDeadlines: upcomingDeadlines.map(({ sortDate: _sortDate, ...item }) => item),
    error: errors.length ? 'Some dashboard data could not be loaded. Confirm the database migration and RLS policies are installed.' : null,
  };
}

import type { Tables } from '@/types/database';

export const disciplines = ['Electrical', 'Mechanical', 'Civil', 'Architectural', 'Fire Alarm', 'BMS', 'Security', 'Commissioning'] as const;
export const projectStatuses = ['Planning', 'Active', 'On Hold', 'Completed'] as const;
export const inspectionStatuses = ['Planned', 'Requested', 'In Progress', 'Passed', 'Failed', 'Closed'] as const;
export const inspectionResults = ['Accepted', 'Rejected', 'Conditional'] as const;
export const ncrStatuses = ['Open', 'Under Review', 'Corrective Action', 'Ready for Inspection', 'Closed'] as const;
export const punchStatuses = ['Open', 'In Progress', 'Ready for Verification', 'Closed'] as const;
export const documentStatuses = ['Draft', 'Submitted', 'Under Review', 'Approved', 'Approved with Comments', 'Rejected', 'Superseded'] as const;
export const priorities = ['Low', 'Medium', 'High', 'Critical'] as const;

export type Discipline = (typeof disciplines)[number];
export type InspectionStatus = (typeof inspectionStatuses)[number];
export type NcrStatus = (typeof ncrStatuses)[number];
export type PunchStatus = (typeof punchStatuses)[number];
export type DocumentStatus = (typeof documentStatuses)[number];
export type Severity = (typeof priorities)[number];

export type Profile = Tables<'profiles'>;
export type Project = Tables<'projects'>;
export type Inspection = Tables<'inspections'>;
export type Ncr = Tables<'ncrs'>;
export type PunchItem = Tables<'punch_items'>;
export type ProjectDocument = Tables<'documents'>;
export type Notification = Tables<'notifications'>;

export interface ActivityItem { id: string; title: string; description: string; time: string; kind: 'inspection' | 'ncr' | 'document' | 'punch' | 'project'; }
export interface DeadlineItem { id: string; reference: string; title: string; date: string; relative: string; kind: 'NCR' | 'Inspection' | 'Punch'; urgency: 'overdue' | 'today' | 'soon'; }
export interface DashboardMetrics { totalInspections: number; pendingInspections: number; passedInspections: number; openNcrs: number; closedNcrs: number; overdueNcrs: number; openPunchItems: number; overduePunchItems: number; totalDocuments: number; completionPercentage: number; }

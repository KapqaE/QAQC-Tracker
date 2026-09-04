import { createPunchItemAction, deletePunchItemAction, updatePunchItemAction } from '@/app/actions/records';
import { CrudManager, type CrudColumn, type CrudField, type CrudRow } from '@/components/crud/crud-manager';
import { listProjects } from '@/lib/services/projects';
import { listPunchItems } from '@/lib/services/punch-items';
import { createClient } from '@/lib/supabase/server';
import { disciplines, priorities, punchStatuses } from '@/types/qaqc';

export const dynamic = 'force-dynamic';

const columns: CrudColumn[] = [
  { key: 'punch_number', label: 'Punch item', style: 'mono' },
  { key: 'description', label: 'Description', style: 'primary' },
  { key: 'project_name', label: 'Project', style: 'muted' },
  { key: 'priority', label: 'Priority', style: 'muted' },
  { key: 'due_date', label: 'Due date', style: 'date' },
  { key: 'status', label: 'Status', style: 'status' },
];

export default async function PunchListPage() {
  const client = await createClient();
  const [punchResult, projectResult] = await Promise.all([listPunchItems(client), listProjects(client)]);
  const names = new Map(projectResult.data.map((project) => [project.id, project.name]));
  const projectOptions = projectResult.data.map((project) => ({ label: `${project.project_code} · ${project.name}`, value: project.id }));
  const fields: CrudField[] = [
    { name: 'punch_number', label: 'Punch number', required: true, placeholder: 'PL-EL-0190' },
    { name: 'project_id', label: 'Project', type: 'select', required: true, options: projectOptions },
    { name: 'area', label: 'Area', required: true },
    { name: 'discipline', label: 'Discipline', type: 'select', required: true, options: disciplines.map((value) => ({ label: value, value })) },
    { name: 'responsible_company', label: 'Responsible company', required: true },
    { name: 'assigned_person', label: 'Assigned person', required: true },
    { name: 'priority', label: 'Priority', type: 'select', required: true, defaultValue: 'Medium', options: priorities.map((value) => ({ label: value, value })) },
    { name: 'status', label: 'Status', type: 'select', required: true, defaultValue: 'Open', options: punchStatuses.map((value) => ({ label: value, value })) },
    { name: 'due_date', label: 'Due date', type: 'date', required: true },
    { name: 'description', label: 'Description', type: 'textarea', required: true, span: 2 },
  ];
  const today = new Date().toISOString().slice(0, 10);
  const rows: CrudRow[] = punchResult.data.map((item) => ({ ...item, project_name: names.get(item.project_id) ?? 'Unknown project', overdue: item.status !== 'Closed' && item.due_date < today }));
  return <CrudManager title="Punch List" description="Assign, prioritize, verify, and close field completion items before handover." noun="punch item" rows={rows} columns={columns} fields={fields} createAction={createPunchItemAction} updateAction={updatePunchItemAction} deleteAction={deletePunchItemAction} loadError={punchResult.error ?? projectResult.error} enableDiscipline enableProject />;
}

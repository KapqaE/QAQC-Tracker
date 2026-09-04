import { createProjectAction, deleteProjectAction, updateProjectAction } from '@/app/actions/records';
import { CrudManager, type CrudColumn, type CrudField, type CrudRow } from '@/components/crud/crud-manager';
import { listProjects } from '@/lib/services/projects';
import { createClient } from '@/lib/supabase/server';
import { projectStatuses } from '@/types/qaqc';

export const dynamic = 'force-dynamic';

const columns: CrudColumn[] = [
  { key: 'project_code', label: 'Project code', style: 'mono' },
  { key: 'name', label: 'Project', style: 'primary' },
  { key: 'client', label: 'Client', style: 'muted' },
  { key: 'location', label: 'Location', style: 'muted' },
  { key: 'status', label: 'Status', style: 'status' },
];

const fields: CrudField[] = [
  { name: 'name', label: 'Project name', required: true, placeholder: 'IST Data Center Expansion' },
  { name: 'project_code', label: 'Project code', required: true, placeholder: 'IST-DCX-01' },
  { name: 'client', label: 'Client', required: true, placeholder: 'Example Client' },
  { name: 'location', label: 'Location', required: true, placeholder: 'Istanbul, Türkiye' },
  { name: 'status', label: 'Status', type: 'select', required: true, defaultValue: 'Planning', options: projectStatuses.map((value) => ({ label: value, value })) },
  { name: 'start_date', label: 'Start date', type: 'date' },
  { name: 'target_completion_date', label: 'Target completion date', type: 'date' },
  { name: 'description', label: 'Description', type: 'textarea', span: 2, placeholder: 'Project scope and quality objectives' },
];

export default async function ProjectsPage() {
  const client = await createClient();
  const result = await listProjects(client);
  const rows: CrudRow[] = result.data.map((item) => ({ ...item }));
  return <CrudManager title="Projects" description="Manage construction projects, client context, delivery dates, and lifecycle status." noun="project" rows={rows} columns={columns} fields={fields} createAction={createProjectAction} updateAction={updateProjectAction} deleteAction={deleteProjectAction} loadError={result.error} />;
}

import { createProjectAction, deleteProjectAction, updateProjectAction } from '@/app/actions/records';
import { CrudManager, type CrudColumn, type CrudField, type CrudRow } from '@/components/crud/crud-manager';
import { listProjects } from '@/lib/services/projects';
import { createClient } from '@/lib/supabase/server';
import { projectStatuses } from '@/types/qaqc';

export const dynamic = 'force-dynamic';

const columns: CrudColumn[] = [
  { key: 'project_code', label: 'Project code', style: 'mono' },
  { key: 'name', label: 'Project', style: 'primary' },
  { key: 'client', label: 'Client / employer', style: 'muted' },
  { key: 'consultant', label: 'Engineer / consultant', style: 'muted' },
  { key: 'location', label: 'Location', style: 'muted' },
  { key: 'status', label: 'Status', style: 'status' },
];

const fields: CrudField[] = [
  { name: 'name', label: 'Project name', required: true, placeholder: 'IL05.1 Istanbul Data Center' },
  { name: 'project_code', label: 'Project code', required: true, placeholder: 'IL051' },
  { name: 'client', label: 'Client / employer', required: true, placeholder: 'EQUINIX' },
  { name: 'contractor', label: 'Contractor', placeholder: 'SERBAN CONSTRUCTION CO.' },
  { name: 'consultant', label: 'Engineer / consultant', placeholder: 'ARUP' },
  { name: 'location', label: 'Location', required: true, placeholder: 'Istanbul' },
  { name: 'status', label: 'Status', type: 'select', required: true, defaultValue: 'Active', options: projectStatuses.map((value) => ({ label: value, value })) },
  { name: 'start_date', label: 'Start date', type: 'date' },
  { name: 'target_completion_date', label: 'Target completion date', type: 'date' },
  { name: 'description', label: 'Description', type: 'textarea', span: 2, placeholder: 'Project scope and quality objectives' },
];

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ create?: string | string[] }> }) {
  const query = await searchParams;
  const client = await createClient();
  const result = await listProjects(client);
  const rows: CrudRow[] = result.data.map((item) => ({ ...item }));
  return <CrudManager key={query.create === '1' ? 'create' : 'list'} title="Projects" description="Create and manage project context used by every QA/QC record module." noun="project" rows={rows} columns={columns} fields={fields} createAction={createProjectAction} updateAction={updateProjectAction} deleteAction={deleteProjectAction} loadError={result.error} initialCreate={query.create === '1'} />;
}

import { createInspectionAction, deleteInspectionAction, updateInspectionAction } from '@/app/actions/records';
import { WirInspectionManager } from '@/components/inspections/wir-inspection-manager';
import { listDocuments } from '@/lib/services/documents';
import { listInspections } from '@/lib/services/inspections';
import { getProjectContext } from '@/lib/project-context';
import { ProjectRequired } from '@/components/shared/project-required';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export default async function WirPage() { const client = await createClient(); const context = await getProjectContext(); if (!context.activeProject) return <ProjectRequired message={context.error ?? undefined} />; const active = context.activeProject; const [inspections, projects, documents] = await Promise.all([listInspections(client, active.id), Promise.resolve({ data: [active], error: context.error }), listDocuments(client)]);
  return <WirInspectionManager key={active.id} inspections={inspections.data} projects={projects.data} documents={documents.data} loadError={inspections.error ?? projects.error ?? documents.error} createAction={createInspectionAction} updateAction={updateInspectionAction} deleteAction={deleteInspectionAction} />; }

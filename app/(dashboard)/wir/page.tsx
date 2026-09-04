import { createInspectionAction, deleteInspectionAction, updateInspectionAction } from '@/app/actions/records';
import { WirInspectionManager } from '@/components/inspections/wir-inspection-manager';
import { listDocuments } from '@/lib/services/documents';
import { listInspections } from '@/lib/services/inspections';
import { listProjects } from '@/lib/services/projects';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export default async function WirPage() { const client = await createClient(); const [inspections, projects, documents] = await Promise.all([listInspections(client), listProjects(client), listDocuments(client)]);
  return <WirInspectionManager inspections={inspections.data} projects={projects.data} documents={documents.data} loadError={inspections.error ?? projects.error ?? documents.error} createAction={createInspectionAction} updateAction={updateInspectionAction} deleteAction={deleteInspectionAction} />; }

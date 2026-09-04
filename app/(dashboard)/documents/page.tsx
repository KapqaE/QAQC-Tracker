import { createDocumentAction, deleteDocumentAction, updateDocumentAction } from '@/app/actions/records';
import { DocumentRegister } from '@/components/documents/document-register';
import { listDocuments } from '@/lib/services/documents';
import { listProjects } from '@/lib/services/projects';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function DocumentsPage() {
  const client = await createClient();
  const [documentResult, projectResult] = await Promise.all([listDocuments(client), listProjects(client)]);
  return <DocumentRegister documents={documentResult.data} projects={projectResult.data} loadError={documentResult.error ?? projectResult.error} createAction={createDocumentAction} updateAction={updateDocumentAction} deleteAction={deleteDocumentAction} />;
}

import { ProcoreCsvImport } from '@/components/documents/procore-csv-import';
import { listDocuments } from '@/lib/services/documents';
import { listProjects } from '@/lib/services/projects';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function ProcoreImportPage() {
  const client = await createClient();
  const [documentResult, projectResult] = await Promise.all([listDocuments(client), listProjects(client)]);
  const existingCodes = documentResult.data.map((document) => document.document_code || document.document_number);
  return <ProcoreCsvImport projects={projectResult.data} existingCodes={existingCodes} loadError={documentResult.error ?? projectResult.error} />;
}

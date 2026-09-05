'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { recordProject } from '@/lib/services/record-links';
import { serviceError } from '@/lib/services/shared';

const kind = z.enum(['WIR','MIR','NCR','SOR','RRR']);
export async function addRecordLink(formData: FormData) {
  const parsed = z.object({ source_record_type: kind, source_record_id: z.uuid(), target_record_type: kind,
    target_record_id: z.union([z.uuid(),z.literal('')]).transform((v) => v || null),
    external_reference: z.string().trim().transform((v) => v || null), relationship_type: z.string().trim().min(1),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, message: 'Choose the record type, a valid local UUID or external reference, and relationship.' };
  const value = parsed.data;
  if (!value.target_record_id && !value.external_reference) return { success: false, message: 'Provide a local record UUID or an external Procore reference.' };
  if (value.target_record_id === value.source_record_id && value.target_record_type === value.source_record_type) return { success: false, message: 'A record cannot link to itself.' };
  const user = await requireUser(); const client = await createClient();
  const projectId = await recordProject(client,value.source_record_type,value.source_record_id);
  if (!projectId || (value.target_record_id && await recordProject(client,value.target_record_type,value.target_record_id) !== projectId)) return { success: false, message: 'Both local records must be accessible and belong to the same project.' };
  const { error } = await client.from('record_links').insert({ ...value, project_id: projectId, created_by: user.id });
  if (error) return { success: false, message: serviceError(error,'The record link could not be saved.') };
  revalidatePath(`/${value.source_record_type.toLowerCase()}/${value.source_record_id}`);
  return { success: true, message: 'Record reference linked.' };
}

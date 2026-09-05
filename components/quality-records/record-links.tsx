import Link from 'next/link';
import { addRecordLink } from '@/app/actions/record-links';
import { ActionForm } from '@/components/quality-records/action-form';
import { createClient } from '@/lib/supabase/server';
import type { RecordKind } from '@/lib/services/record-links';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export async function RecordLinks({ type, id }: { type: RecordKind; id: string }) {
  const client = await createClient();
  const { data, error } = await client.from('record_links').select('*').eq('source_record_type',type).eq('source_record_id',id).order('created_at');
  return <section className="rounded-xl border bg-card p-4"><h2 className="text-base font-semibold">Related quality records</h2>{error ? <p className="my-3 text-sm text-red-700">Record links could not be loaded.</p> : data?.length ? <ul className="my-3 space-y-2 text-sm">{data.map((r) => <li key={r.id}>{r.relationship_type} · {r.target_record_type} · {r.target_record_id ? <Link href={`/${r.target_record_type.toLowerCase()}/${r.target_record_id}`} className="text-primary underline">{r.external_reference || r.target_record_id}</Link> : r.external_reference}</li>)}</ul> : <p className="my-3 text-sm text-muted-foreground">No related records linked. External Procore references are supported.</p>}<details><summary className="cursor-pointer text-sm font-medium text-primary">Link a record</summary><ActionForm action={addRecordLink} className="mt-3 grid gap-3 sm:grid-cols-2"><input type="hidden" name="source_record_type" value={type} /><input type="hidden" name="source_record_id" value={id} /><label className="grid gap-1 text-sm">Record type<select name="target_record_type" className="h-9 rounded-lg border bg-background px-2">{['WIR','MIR','NCR','SOR','RRR'].map((v)=><option key={v}>{v}</option>)}</select></label><label htmlFor="target_record_id" className="grid gap-1 text-sm">Local record UUID (optional)<Input id="target_record_id" name="target_record_id" /></label><label htmlFor="external_reference" className="grid gap-1 text-sm">External Procore reference (optional)<Input id="external_reference" name="external_reference" /></label><label htmlFor="relationship_type" className="grid gap-1 text-sm">Relationship<Input id="relationship_type" name="relationship_type" required placeholder="Evidence, related issue, or inspection" /></label><Button type="submit">Save link</Button></ActionForm></details></section>;
}

import type { CrudActionResult } from '@/app/actions/records';
import { ActionForm } from '@/components/quality-records/action-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Child records retain their IDs when corrected, so evidence and blockers do not duplicate.
export function ChildEditor({ row, action, fields }: { row: Record<string, string | number | boolean | null>; action: (data: FormData) => Promise<CrudActionResult>; fields: string[] }) {
  return <details className="border-t p-4"><summary className="cursor-pointer text-sm font-medium text-primary">Edit {String(row.item_number ?? row.reference ?? row.attendee_role ?? row.role ?? row.tag_type ?? 'entry')}</summary><ActionForm action={action} className="mt-3 grid gap-3 sm:grid-cols-2"><input type="hidden" name="id" value={String(row.id)} /><input type="hidden" name="rrr_id" value={String(row.rrr_id)} />{fields.map((key) => <label key={key} className="grid gap-1 text-sm">{key.replaceAll('_', ' ')}{typeof row[key] === 'boolean' ? <input type="checkbox" name={key} defaultChecked={Boolean(row[key])} /> : <Input name={key} defaultValue={String(row[key] ?? '')} type={key.endsWith('_date') ? 'date' : 'text'} />}</label>)}<Button type="submit">Save changes</Button></ActionForm></details>;
}

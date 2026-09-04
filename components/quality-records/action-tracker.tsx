'use client';

import { useState, useTransition } from 'react';
import { LoaderCircle, Plus, Save } from 'lucide-react';

import type { CrudActionResult } from '@/app/actions/records';
import { updateQualityAction } from '@/app/actions/quality-records';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import type { Tables } from '@/types/database';

type Action = (formData: FormData) => Promise<CrudActionResult>;

export function ActionTracker({
  rows,
  projectId,
  parentType,
  parentId,
  addAction,
}: {
  rows: Tables<'quality_record_actions'>[];
  projectId: string;
  parentType: 'NCR' | 'SOR' | 'RRR';
  parentId: string;
  addAction: Action;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<CrudActionResult | null>(null);

  function submit(formData: FormData) {
    formData.set('project_id', projectId);
    formData.set('parent_record_type', parentType);
    formData.set('parent_record_id', parentId);
    startTransition(async () => {
      const result = await addAction(formData);
      setFeedback(result);
      if (result.success) setOpen(false);
    });
  }

  function update(formData: FormData) {
    formData.set('parent_record_type', parentType);
    formData.set('parent_record_id', parentId);
    startTransition(async () => {
      setFeedback(await updateQualityAction(formData));
    });
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="flex-row items-center justify-between border-b bg-slate-800 px-4 py-3">
        <div>
          <CardTitle className="text-xs uppercase tracking-[0.11em] text-white">Action tracker</CardTitle>
          <p className="mt-1 text-xs text-slate-300">Relational actions with responsibility, due date and verification.</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}><Plus />Add action</Button>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Action</TableHead><TableHead>Responsible</TableHead><TableHead>Due</TableHead><TableHead>Status / verification</TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-md whitespace-normal font-medium">{row.action_description}</TableCell>
                    <TableCell>{row.responsible_person}</TableCell>
                    <TableCell className="font-mono text-xs">{row.due_date}</TableCell>
                    <TableCell className="min-w-[420px]">
                      <form action={update} className="grid grid-cols-[135px_1fr_130px_auto] gap-2">
                        <input type="hidden" name="id" value={row.id} />
                        <select name="status" defaultValue={row.status} aria-label={`Status for ${row.action_description}`} className="h-9 rounded-lg border bg-background px-2 text-sm">
                          {['Open','In Progress','Verified','Closed'].map((value) => <option key={value}>{value}</option>)}
                        </select>
                        <Input name="verification_note" defaultValue={row.verification_note ?? ''} aria-label={`Verification note for ${row.action_description}`} placeholder="Verification note" />
                        <Input name="completion_date" type="date" defaultValue={row.completion_date ?? ''} aria-label={`Completion date for ${row.action_description}`} />
                        <Button type="submit" size="sm" variant="outline" disabled={pending}><Save />Save</Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : <p className="p-6 text-sm text-muted-foreground">No actions recorded.</p>}
        {feedback ? <p className={`border-t px-4 py-2 text-xs ${feedback.success ? 'text-emerald-700' : 'text-red-700'}`}>{feedback.message}</p> : null}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add action</DialogTitle><DialogDescription>The action remains linked to this {parentType} record.</DialogDescription></DialogHeader>
          <form action={submit} className="space-y-4">
            <div><label htmlFor="quality-action-description" className="mb-1 block text-xs font-medium">Action</label><Textarea id="quality-action-description" name="action_description" required /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label htmlFor="quality-action-responsible" className="mb-1 block text-xs font-medium">Responsible person</label><Input id="quality-action-responsible" name="responsible_person" required /></div>
              <div><label htmlFor="quality-action-due" className="mb-1 block text-xs font-medium">Due date</label><Input id="quality-action-due" name="due_date" type="date" required /></div>
            </div>
            {feedback && !feedback.success ? <p className="text-xs text-red-700">{feedback.message}</p> : null}
            <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : <Plus />}Add action</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

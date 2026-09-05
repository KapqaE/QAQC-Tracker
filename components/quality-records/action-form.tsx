'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { CrudActionResult } from '@/app/actions/records';

export function ActionForm({ action, children, className }: { action: (data: FormData) => Promise<CrudActionResult>; children: ReactNode; className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<CrudActionResult | null>(null);
  function save(data: FormData) {
    setFeedback(null);
    startTransition(async () => {
      try { const result = await action(data); setFeedback(result); if (result.success) router.refresh(); }
      catch { setFeedback({ success: false, message: 'Save failed. Check your connection and try again.' }); }
    });
  }
  return <form action={save} aria-busy={pending}><fieldset disabled={pending} className={className}>{children}</fieldset>{pending ? <output className="p-2 text-sm">Saving…</output> : null}{feedback ? <output className={`p-2 text-sm ${feedback.success ? 'text-emerald-700' : 'text-red-700'}`}>{feedback.message}</output> : null}</form>;
}

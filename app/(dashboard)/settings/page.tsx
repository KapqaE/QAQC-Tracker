import { LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';

import { ensureProfile, requireUser } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await requireUser();
  const profile = await ensureProfile(user);
  return <div className="mx-auto flex w-full max-w-4xl flex-col gap-5"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Workspace account</p><h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-[30px]">Settings</h1><p className="mt-1.5 text-sm text-muted-foreground">Review your authenticated profile and application security posture.</p></div><div className="grid gap-4 md:grid-cols-2"><Card><CardHeader><CardTitle className="flex items-center gap-2"><UserRound className="size-4 text-primary" />Profile</CardTitle></CardHeader><CardContent className="space-y-4"><Info label="Full name" value={profile.full_name || 'Not set'} /><Info label="Email" value={profile.email} /><Info label="Job title" value={profile.job_title || 'QA/QC Engineer'} /><Info label="Company" value={profile.company || 'Not set'} /></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" />Security</CardTitle></CardHeader><CardContent className="space-y-3 text-xs leading-5 text-muted-foreground"><p className="flex gap-2"><LockKeyhole className="mt-0.5 size-4 shrink-0 text-emerald-600" />Authentication is verified server-side through Supabase Auth.</p><p className="flex gap-2"><LockKeyhole className="mt-0.5 size-4 shrink-0 text-emerald-600" />Application tables enforce PostgreSQL row-level security.</p><p className="flex gap-2"><LockKeyhole className="mt-0.5 size-4 shrink-0 text-emerald-600" />The browser uses only the public anon key and authenticated user token.</p></CardContent></Card></div></div>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>; }

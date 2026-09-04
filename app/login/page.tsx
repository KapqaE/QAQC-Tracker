import { CheckCircle2, Database, ShieldCheck } from 'lucide-react';

import { LoginForm } from '@/app/login/login-form';
import { hasSupabaseEnv, SUPABASE_SETUP_MESSAGE } from '@/lib/supabase/env';

export default function LoginPage() {
  const configured = hasSupabaseEnv();

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,0.9fr)_minmax(480px,1.1fr)]">
      <section className="relative hidden overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-20 industrial-grid" />
        <div className="relative flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"><ShieldCheck className="size-5" /></span><div><div className="font-semibold">QAQC Tracker</div><div className="text-[10px] uppercase tracking-[0.16em] text-sidebar-foreground/45">Quality command</div></div></div>
        <div className="relative max-w-lg"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-300">Built for field certainty</p><h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight">One quality record from inspection to closeout.</h1><p className="mt-5 max-w-md text-sm leading-7 text-sidebar-foreground/60">Control inspections, non-conformances, punch items, documents, and deadlines across complex construction projects.</p><div className="mt-8 grid gap-3 text-xs text-sidebar-foreground/75 sm:grid-cols-2">{['RLS-protected records', 'Live project metrics', 'Structured closeout', 'Accountable actions'].map((item) => <div key={item} className="flex items-center gap-2"><CheckCircle2 className="size-4 text-teal-300" />{item}</div>)}</div></div>
        <p className="relative text-[10px] uppercase tracking-wider text-sidebar-foreground/35">Construction quality · Data centers · Commissioning</p>
      </section>

      <section className="flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-[430px] rounded-2xl border bg-card p-6 shadow-[0_22px_60px_rgb(15_23_42/8%)] sm:p-8">
          <div className="mb-7 flex items-center gap-3 lg:hidden"><span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground"><ShieldCheck className="size-[18px]" /></span><span className="font-semibold">QAQC Tracker</span></div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Secure project workspace</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Welcome to quality control</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Use your company account or create a new QA/QC profile.</p>
          {configured ? <div className="mt-7"><LoginForm /></div> : <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900"><div className="flex items-center gap-2 text-sm font-semibold"><Database className="size-4" />Supabase setup required</div><p className="mt-2 text-xs leading-5">{SUPABASE_SETUP_MESSAGE}</p><p className="mt-3 font-mono text-[10px] text-amber-800">See README.md → Supabase Setup</p></div>}
        </div>
      </section>
    </main>
  );
}

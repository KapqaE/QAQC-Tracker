import { Database, ExternalLink, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function SetupRequired({ databaseReady = false }: { databaseReady?: boolean }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-5 industrial-grid">
      <Card className="w-full max-w-2xl shadow-[0_24px_70px_rgb(15_23_42/10%)]">
        <CardContent className="p-6 sm:p-8">
          <div className="grid size-12 place-items-center rounded-xl bg-amber-100 text-amber-700">{databaseReady ? <ShieldAlert className="size-6" /> : <Database className="size-6" />}</div>
          <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">QAQC Tracker setup</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{databaseReady ? 'Apply the database migration' : 'Connect your Supabase project'}</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{databaseReady ? 'The Supabase connection is available, but the QAQC schema or profile table could not be read. Run the initial migration from the SQL Editor.' : 'The application is ready, but project credentials have not been added to this environment. No mock data is shown in place of the database.'}</p>
          <ol className="mt-6 space-y-3 rounded-xl border bg-muted/35 p-4 text-xs leading-5 text-foreground/80">
            <li><span className="mr-2 font-mono text-primary">01</span>Create `.env.local` from `.env.example` and add the project URL and anon key.</li>
            <li><span className="mr-2 font-mono text-primary">02</span>Run `database/001_initial_schema.sql` in the Supabase SQL Editor.</li>
            <li><span className="mr-2 font-mono text-primary">03</span>Configure the Auth URLs and confirmation email template described in `README.md`.</li>
            <li><span className="mr-2 font-mono text-primary">04</span>Create an account, then optionally run `database/002_seed.sql`.</li>
          </ol>
          <div className="mt-6 flex flex-wrap gap-2"><Button nativeButton={false} render={<Link href="/login" />}>Open sign in</Button><Button nativeButton={false} variant="outline" render={<a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer"><span className="sr-only">Open Supabase dashboard</span></a>}>Supabase dashboard <ExternalLink data-icon="inline-end" /></Button></div>
        </CardContent>
      </Card>
    </main>
  );
}

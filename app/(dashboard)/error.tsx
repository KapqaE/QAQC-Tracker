'use client';

import { AlertTriangle, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="grid min-h-[60vh] place-items-center"><Card className="max-w-lg"><CardContent className="p-8 text-center"><span className="mx-auto grid size-12 place-items-center rounded-full bg-red-50 text-red-600"><AlertTriangle className="size-5" /></span><h2 className="mt-5 text-lg font-semibold">Quality data could not be loaded</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Check the Supabase connection, migration, and RLS policies, then try again.</p><Button className="mt-5" onClick={reset}><RotateCcw />Try again</Button></CardContent></Card></div>;
}

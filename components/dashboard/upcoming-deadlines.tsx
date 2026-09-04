import { ArrowUpRight, CalendarClock } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DeadlineItem } from '@/types/qaqc';

export function UpcomingDeadlines({ deadlines }: { deadlines: DeadlineItem[] }) {
  return (
    <Card>
      <CardHeader className="border-b border-border/80 pb-4"><div className="flex items-center justify-between"><CardTitle>Upcoming deadlines</CardTitle><CalendarClock className="size-4 text-muted-foreground" /></div><p className="mt-1 text-xs text-muted-foreground">Items needing attention this week</p></CardHeader>
      <CardContent className="px-0 py-0">
        {deadlines.length ? <><div className="divide-y">
          {deadlines.map((item) => <div key={item.id} className="flex gap-3 px-4 py-3.5">
            <div className={`flex size-10 shrink-0 flex-col items-center justify-center rounded-lg border text-center ${item.urgency === 'overdue' ? 'border-red-200 bg-red-50 text-red-700' : 'bg-muted/60 text-foreground'}`}><span className="text-[9px] uppercase leading-none">{item.date.split(' ')[1]}</span><span className="mt-0.5 text-sm font-semibold leading-none">{item.date.split(' ')[0]}</span></div>
            <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="font-mono text-[10px] font-medium text-primary">{item.reference}</span><span className={`whitespace-nowrap text-[10px] ${item.urgency === 'overdue' ? 'font-semibold text-red-600' : 'text-muted-foreground'}`}>{item.relative}</span></div><p className="mt-1 truncate text-xs font-medium">{item.title}</p><p className="mt-1 text-[10px] text-muted-foreground">{item.kind}</p></div>
          </div>)}
        </div>
        <div className="border-t px-4 py-2"><Button nativeButton={false} variant="ghost" size="sm" className="w-full text-xs text-primary" render={<Link href="/ncrs" />}>Review deadline records <ArrowUpRight data-icon="inline-end" /></Button></div>
        </> : <div className="px-4 py-10 text-center"><p className="text-xs font-medium">No upcoming deadlines</p><p className="mt-1 text-[11px] text-muted-foreground">Due items within seven days appear here.</p></div>}
      </CardContent>
    </Card>
  );
}

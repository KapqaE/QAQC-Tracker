import { Building2, ClipboardCheck, FileStack, FileWarning, ListChecks } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ActivityItem } from '@/types/qaqc';

const icons = { inspection: ClipboardCheck, ncr: FileWarning, document: FileStack, punch: ListChecks, project: Building2 };
const tones = { inspection: 'bg-emerald-50 text-emerald-700', ncr: 'bg-red-50 text-red-700', document: 'bg-blue-50 text-blue-700', punch: 'bg-amber-50 text-amber-700', project: 'bg-teal-50 text-teal-700' };

export function RecentActivity({ items }: { items: ActivityItem[] }) {
  return (
    <Card>
      <CardHeader className="border-b border-border/80 pb-4"><CardTitle>Recent activity</CardTitle><p className="mt-1 text-xs text-muted-foreground">Latest updates across the project</p></CardHeader>
      <CardContent className="px-4 py-1">
        {items.length ? <div className="relative divide-y before:absolute before:bottom-8 before:left-[15px] before:top-8 before:w-px before:bg-border">
          {items.map((item) => { const Icon = icons[item.kind]; return <div key={item.id} className="relative flex gap-3 py-3.5"><span className={`z-10 grid size-8 shrink-0 place-items-center rounded-full border-2 border-card ${tones[item.kind]}`}><Icon className="size-3.5" /></span><div className="min-w-0 pt-0.5"><p className="text-xs font-medium">{item.title}</p><p className="mt-1 truncate text-[11px] text-muted-foreground">{item.description}</p><p className="mt-1.5 text-[10px] text-muted-foreground/75">{item.time}</p></div></div>; })}
        </div> : <div className="py-10 text-center"><p className="text-xs font-medium">No recent activity</p><p className="mt-1 text-[11px] text-muted-foreground">Updates appear after records are created.</p></div>}
      </CardContent>
    </Card>
  );
}

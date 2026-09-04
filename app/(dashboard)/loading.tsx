import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return <div className="mx-auto w-full max-w-[1600px] space-y-6"><div className="space-y-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-96 max-w-full" /></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 10 }, (_, index) => <Skeleton key={index} className="h-32 rounded-xl" />)}</div><div className="grid gap-4 xl:grid-cols-2"><Skeleton className="h-80 rounded-xl" /><Skeleton className="h-80 rounded-xl" /></div></div>;
}

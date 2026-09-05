import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ProjectRequired({ message = 'Create a project to start recording and reviewing quality records.' }: { message?: string }) {
  return <section className="rounded-xl border bg-card p-6"><h2 className="text-lg font-semibold">Choose a project to begin</h2><p className="my-3 text-sm text-muted-foreground">{message}</p><Button nativeButton={false} render={<Link href="/projects?create=1" />}><Building2 />Create Project</Button><Link href="/projects" className="ml-4 text-sm text-primary underline">Manage projects</Link></section>;
}

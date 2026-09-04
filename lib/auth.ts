import type { User } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/types/qaqc';

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}

export async function requireUser() {
  const { user } = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

export async function ensureProfile(user: User): Promise<Profile> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      full_name: String(user.user_metadata.full_name ?? ''),
      email: user.email ?? '',
      job_title: String(user.user_metadata.job_title ?? 'QA/QC Engineer'),
    })
    .select('*')
    .single();

  if (error) throw new Error('Unable to create your QAQC profile. Confirm the database schema has been applied.');
  return data;
}

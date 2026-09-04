import type { SupabaseClient } from '@supabase/supabase-js';

import { serviceError } from '@/lib/services/shared';
import type { Database, Tables } from '@/types/database';

export async function getProfile(client: SupabaseClient<Database>, userId: string): Promise<{ data: Tables<'profiles'> | null; error: string | null }> {
  const { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
  return { data, error: error ? serviceError(error, 'Your profile could not be loaded.') : null };
}

export async function getUnreadNotificationCount(client: SupabaseClient<Database>, userId: string) {
  const { count, error } = await client.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_read', false);
  return { data: count ?? 0, error: error ? serviceError(error, 'Notifications could not be loaded.') : null };
}

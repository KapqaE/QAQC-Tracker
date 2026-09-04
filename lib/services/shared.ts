import type { PostgrestError } from '@supabase/supabase-js';

export type ServiceResult<T> = { data: T; error: string | null };

export function serviceError(error: PostgrestError | null, fallback: string) {
  if (!error) return fallback;
  if (error.code === '23505') return 'A record with this reference number or code already exists.';
  if (error.code === '23503') return 'This record is linked to other quality data and cannot be changed that way.';
  return fallback;
}

import type { PostgrestError } from '@supabase/supabase-js';

export type ServiceResult<T> = { data: T; error: string | null };

export function serviceError(error: PostgrestError | null, fallback: string) {
  if (!error) return fallback;
  if (error.code === '23505') return 'A record with this reference number or code already exists.';
  if (error.code === '23503') return 'This record is linked to other quality data and cannot be changed that way.';
  if (error.code === '23514') return 'Validation failed. Check the record links, required decisions, and readiness gate before saving.';
  if (['PGRST204', '42703', '42P01'].includes(error.code)) return 'The database schema is incomplete. Apply the pending migrations listed in database/README.md.';
  return fallback;
}

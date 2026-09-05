'use server';

import { safeReturnPath } from '@/lib/auth-redirect';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

export type AuthActionResult = { success: boolean; message: string };

const credentialsSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

const signupSchema = credentialsSchema.extend({
  full_name: z.string().trim().min(2, 'Full name is required.').max(100),
});


function authMessage(message: string) {
  if (message.toLowerCase().includes('invalid login credentials')) return 'Email or password is incorrect.';
  if (message.toLowerCase().includes('email not confirmed')) return 'Confirm your email address before signing in.';
  if (message.toLowerCase().includes('already registered')) return 'An account already exists for this email.';
  if (message.toLowerCase().includes('rate limit')) return 'Too many attempts. Please wait a moment and try again.';
  return 'Authentication could not be completed. Please try again.';
}

export async function loginAction(formData: FormData): Promise<AuthActionResult> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? 'Check the form fields.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { success: false, message: authMessage(error.message) };

  redirect(safeReturnPath(formData.get('next')));
}

export async function signupAction(formData: FormData): Promise<AuthActionResult> {
  const parsed = signupSchema.safeParse({
    full_name: formData.get('full_name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? 'Check the form fields.' };

  const headerStore = await headers();
  const origin = headerStore.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name, job_title: 'QA/QC Engineer' },
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });

  if (error) return { success: false, message: authMessage(error.message) };
  if (data.session) redirect(safeReturnPath(formData.get('next')));

  return { success: true, message: 'Account created. Check your email to confirm your address, then sign in.' };
}

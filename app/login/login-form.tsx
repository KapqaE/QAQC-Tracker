'use client';

import { useState, useTransition } from 'react';
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

import { loginAction, signupAction, type AuthActionResult } from '@/app/login/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function LoginForm() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [result, setResult] = useState<AuthActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const confirmationError = searchParams.get('error') === 'confirmation'
    ? { success: false, message: 'The confirmation link is invalid or has expired. Request a new confirmation email or create the account again.' }
    : null;
  const visibleResult = result ?? confirmationError;

  function handleSubmit(formData: FormData) {
    setResult(null);
    formData.set('next', searchParams.get('next') ?? '/');
    startTransition(async () => {
      const actionResult = mode === 'login' ? await loginAction(formData) : await signupAction(formData);
      setResult(actionResult);
    });
  }

  return (
    <div>
      <div className="grid grid-cols-2 rounded-lg bg-muted p-1">
        <button type="button" onClick={() => { setMode('login'); setResult(null); }} className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${mode === 'login' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>Sign in</button>
        <button type="button" onClick={() => { setMode('signup'); setResult(null); }} className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${mode === 'signup' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>Create account</button>
      </div>

      <form action={handleSubmit} className="mt-6 space-y-4">
        {mode === 'signup' ? <div><label htmlFor="full_name" className="mb-1.5 block text-xs font-medium">Full name <span className="text-red-500">*</span></label><div className="relative"><UserRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="full_name" name="full_name" autoComplete="name" required minLength={2} className="h-10 pl-9" placeholder="Ugur Kurt" /></div></div> : null}
        <div><label htmlFor="email" className="mb-1.5 block text-xs font-medium">Email <span className="text-red-500">*</span></label><div className="relative"><Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="email" name="email" type="email" autoComplete="email" required className="h-10 pl-9" placeholder="you@company.com" /></div></div>
        <div><label htmlFor="password" className="mb-1.5 block text-xs font-medium">Password <span className="text-red-500">*</span></label><div className="relative"><LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={8} className="h-10 px-9" placeholder="Minimum 8 characters" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div>

        {visibleResult ? <output className={`block rounded-lg border px-3 py-2.5 text-xs leading-5 ${visibleResult.success ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>{visibleResult.message}</output> : null}

        <Button type="submit" size="lg" className="w-full" disabled={isPending}>
          {isPending ? <LoaderCircle className="animate-spin" /> : null}
          {isPending ? 'Please wait...' : mode === 'login' ? 'Sign in to workspace' : 'Create QA/QC account'}
        </Button>
      </form>
    </div>
  );
}

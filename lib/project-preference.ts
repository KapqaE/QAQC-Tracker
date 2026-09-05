import { cookies } from 'next/headers';

export async function rememberProject(userId: string, projectId: string) {
  const store = await cookies();
  store.set(`qaqc-project-${userId}`, projectId, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365,
    secure: process.env.NODE_ENV === 'production',
  });
}

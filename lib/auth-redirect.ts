export function safeReturnPath(value: unknown) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || value.split('').some((c) => c.charCodeAt(0) < 32)) return '/';
  try {
    const origin = 'https://qaqc.invalid';
    const target = new URL(value, origin);
    return target.origin === origin ? `${target.pathname}${target.search}${target.hash}` : '/';
  } catch { return '/'; }
}

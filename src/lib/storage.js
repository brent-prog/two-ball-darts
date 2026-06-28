const OWNER_KEY = 'two-ball-darts-owner-key';

export function getOwnerKey() {
  if (typeof window === 'undefined') return 'server';
  const existing = window.localStorage.getItem(OWNER_KEY);
  if (existing) return existing;
  const next = crypto.randomUUID();
  window.localStorage.setItem(OWNER_KEY, next);
  return next;
}

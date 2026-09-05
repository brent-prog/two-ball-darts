const OWNER_KEY = 'two-ball-darts-owner-key';

export function getOwnerKey() {
  if (typeof window === 'undefined') return 'server';
  const existing = window.localStorage.getItem(OWNER_KEY);
  if (existing) return existing;
  const next = crypto.randomUUID();
  window.localStorage.setItem(OWNER_KEY, next);
  return next;
}

export function setOwnerKey(ownerKey) {
  if (typeof window === 'undefined' || !ownerKey) return;
  window.localStorage.setItem(OWNER_KEY, ownerKey);
}

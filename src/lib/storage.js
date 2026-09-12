const OWNER_KEY = 'two-ball-darts-owner-key';

function createOwnerKey() {
  const cryptoApi = globalThis.crypto;

  if (cryptoApi?.randomUUID) {
    try {
      return cryptoApi.randomUUID();
    } catch {}
  }

  if (cryptoApi?.getRandomValues) {
    try {
      const bytes = new Uint8Array(16);
      cryptoApi.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0'));
      return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
    } catch {}
  }

  return `tbd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function getOwnerKey() {
  if (typeof window === 'undefined') return 'server';

  try {
    const existing = window.localStorage.getItem(OWNER_KEY);
    if (existing) return existing;
  } catch {}

  const next = createOwnerKey();

  try {
    window.localStorage.setItem(OWNER_KEY, next);
  } catch {}

  return next;
}

export function setOwnerKey(ownerKey) {
  if (typeof window === 'undefined' || !ownerKey) return;

  try {
    window.localStorage.setItem(OWNER_KEY, ownerKey);
  } catch {}
}

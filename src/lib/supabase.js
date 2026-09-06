import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vgvjlykedwahxknkyhra.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_nKJ1AQ0YRzogBz4HbKvXPA_GBTRsNyt';
const ownerKeyStorageKey = 'two-ball-darts-owner-key';

const ownerAwareFetch = (input, init = {}) => {
  const headers = new Headers(init.headers || {});
  if (typeof window !== 'undefined') {
    const ownerKey = window.localStorage.getItem(ownerKeyStorageKey);
    if (ownerKey) headers.set('x-tbd-owner-key', ownerKey);
  }
  return fetch(input, { ...init, headers });
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: { fetch: ownerAwareFetch }
});

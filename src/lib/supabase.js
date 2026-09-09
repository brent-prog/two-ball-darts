import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vgvjlykedwahxknkyhra.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_nKJ1AQ0YRzogBz4HbKvXPA_GBTRsNyt';
const ownerKeyStorageKey = 'two-ball-darts-owner-key';

const ownerAwareFetch = async (input, init = {}) => {
  const originalUrl = typeof input === 'string' ? input : input.url;
  const method = (init.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  new Headers(init.headers || {}).forEach((value, key) => headers.set(key, value));

  if (typeof window !== 'undefined') {
    const ownerKey = window.localStorage.getItem(ownerKeyStorageKey);
    if (ownerKey) headers.set('x-tbd-owner-key', ownerKey);
  }

  const url = new URL(originalUrl);
  const isNewGameInsert = method === 'POST' && url.pathname.endsWith('/rest/v1/games');
  const isPlayerInsert = method === 'POST' && url.pathname.endsWith('/rest/v1/players');

  if (isNewGameInsert) {
    const rawBody = init.body ?? (input instanceof Request ? await input.clone().text() : null);
    const parsedBody = rawBody ? JSON.parse(rawBody) : {};
    const row = Array.isArray(parsedBody) ? parsedBody[0] ?? {} : parsedBody;
    const browserOwnerKey = typeof window !== 'undefined'
      ? window.localStorage.getItem(ownerKeyStorageKey)
      : row.owner_key;

    const rpcUrl = new URL(`${supabaseUrl}/rest/v1/rpc/create_two_ball_game`);
    rpcUrl.search = url.search;

    const rpcBody = JSON.stringify({
      browser_owner_key: browserOwnerKey || row.owner_key,
      game_title: row.title || 'Two Ball Darts Round',
      game_course_name: row.course_name || 'Official 18',
      game_status: row.status || 'complete'
    });

    headers.set('content-type', 'application/json');
    return fetch(rpcUrl.toString(), { ...init, method: 'POST', headers, body: rpcBody });
  }

  if (isPlayerInsert) {
    const rawBody = init.body ?? (input instanceof Request ? await input.clone().text() : null);
    const parsedBody = rawBody ? JSON.parse(rawBody) : {};
    const row = Array.isArray(parsedBody) ? parsedBody[0] ?? {} : parsedBody;
    const isSavedGuest = row?.is_profile === true && !row?.profile_id && Boolean(row?.display_name) && Boolean(row?.owner_key);

    if (isSavedGuest) {
      const browserOwnerKey = typeof window !== 'undefined'
        ? window.localStorage.getItem(ownerKeyStorageKey)
        : row.owner_key;
      const rpcUrl = new URL(`${supabaseUrl}/rest/v1/rpc/save_two_ball_guest`);
      rpcUrl.search = url.search;
      const rpcBody = JSON.stringify({
        browser_owner_key: browserOwnerKey || row.owner_key,
        guest_display_name: row.display_name
      });
      headers.set('content-type', 'application/json');
      return fetch(rpcUrl.toString(), { ...init, method: 'POST', headers, body: rpcBody });
    }
  }

  return fetch(input, { ...init, headers });
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: { fetch: ownerAwareFetch }
});

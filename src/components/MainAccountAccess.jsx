'use client';

import { useEffect, useState } from 'react';
import AccountProfileModal from '@/components/AccountProfileModal';
import { supabase } from '@/lib/supabase';
import { getOwnerKey, setOwnerKey } from '@/lib/storage';

async function syncAccountOwnerKey() {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user ?? null;
  if (!user) return;

  const browserOwnerKey = getOwnerKey();
  const { data: cloudOwnerKey, error } = await supabase.rpc('sync_my_owner_key', { browser_owner_key: browserOwnerKey });
  if (error || !cloudOwnerKey) return;

  setOwnerKey(cloudOwnerKey);
  window.dispatchEvent(new CustomEvent('tbd-owner-key-changed', { detail: { ownerKey: cloudOwnerKey } }));
}

const NEW_ACCOUNT_WINDOW_MS = 24 * 60 * 60 * 1000;

async function notifyNewAccountIfNeeded() {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;
    const user = session?.user;
    const accessToken = session?.access_token;
    if (!user || !accessToken) return;

    const createdAt = Date.parse(user.created_at || '');
    if (!Number.isFinite(createdAt)) return;
    const age = Date.now() - createdAt;
    if (age < -5 * 60 * 1000 || age > NEW_ACCOUNT_WINDOW_MS) return;

    const storageKey = `tbd-new-user-notified-${user.id}`;
    if (window.localStorage.getItem(storageKey) === '1') return;

    const response = await fetch('/api/email/new-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({})
    });

    if (response.ok) window.localStorage.setItem(storageKey, '1');
    else console.error('Unable to send new-user notification.', response.status);
  } catch (notificationError) {
    console.error('Unable to send new-user notification.', notificationError);
  }
}

async function profileNeedsSetup() {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user ?? null;
  if (!user) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('username,display_name')
    .eq('user_id', user.id)
    .maybeSingle();

  return !profile?.username || !profile?.display_name?.trim();
}

function rotateGuestOwnerKey() {
  if (typeof window === 'undefined') return;
  const nextOwnerKey = crypto.randomUUID();
  setOwnerKey(nextOwnerKey);
  window.dispatchEvent(new CustomEvent('tbd-owner-key-changed', { detail: { ownerKey: nextOwnerKey } }));
}

export default function MainAccountAccess() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function syncAndPrompt() {
      await notifyNewAccountIfNeeded();
      await syncAccountOwnerKey();
      if (cancelled) return;
      if (await profileNeedsSetup()) setOpen(true);
    }

    syncAndPrompt();

    const { data: authListener } = supabase.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') {
        rotateGuestOwnerKey();
        return;
      }
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        window.setTimeout(() => syncAndPrompt(), 0);
        return;
      }
      window.setTimeout(() => syncAccountOwnerKey(), 0);
    });

    const handler = event => {
      const trigger = event.target?.closest?.('[data-tbd-account]');
      if (!trigger) return;
      event.preventDefault();
      setOpen(true);
    };
    document.addEventListener('click', handler);
    return () => {
      cancelled = true;
      document.removeEventListener('click', handler);
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  return <AccountProfileModal open={open} onClose={() => setOpen(false)} />;
}

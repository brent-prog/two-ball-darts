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

function rotateGuestOwnerKey() {
  if (typeof window === 'undefined') return;
  const nextOwnerKey = crypto.randomUUID();
  setOwnerKey(nextOwnerKey);
  window.dispatchEvent(new CustomEvent('tbd-owner-key-changed', { detail: { ownerKey: nextOwnerKey } }));
}

export default function MainAccountAccess() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    syncAccountOwnerKey();

    const { data: authListener } = supabase.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') {
        rotateGuestOwnerKey();
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
      document.removeEventListener('click', handler);
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  return <AccountProfileModal open={open} onClose={() => setOpen(false)} />;
}

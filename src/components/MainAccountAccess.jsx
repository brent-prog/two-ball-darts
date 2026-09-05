'use client';

import { useEffect, useState } from 'react';
import AccountProfileModal from '@/components/AccountProfileModal';
import { supabase } from '@/lib/supabase';
import { getOwnerKey, setOwnerKey } from '@/lib/storage';

async function syncAccountOwnerKey() {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user ?? null;
  if (!user) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id,owner_key')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile?.id) return;

  if (profile.owner_key) {
    setOwnerKey(profile.owner_key);
    window.dispatchEvent(new CustomEvent('tbd-owner-key-changed', { detail: { ownerKey: profile.owner_key } }));
    return;
  }

  const browserOwnerKey = getOwnerKey();
  const { data: claimedProfile } = await supabase
    .from('profiles')
    .update({ owner_key: browserOwnerKey, updated_at: new Date().toISOString() })
    .eq('id', profile.id)
    .is('owner_key', null)
    .select('owner_key')
    .maybeSingle();

  const cloudOwnerKey = claimedProfile?.owner_key ?? browserOwnerKey;
  setOwnerKey(cloudOwnerKey);
  window.dispatchEvent(new CustomEvent('tbd-owner-key-changed', { detail: { ownerKey: cloudOwnerKey } }));
}

export default function MainAccountAccess() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    syncAccountOwnerKey();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
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

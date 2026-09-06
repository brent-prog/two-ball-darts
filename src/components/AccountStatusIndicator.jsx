'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AccountStatusIndicator() {
  const [label, setLabel] = useState('Not signed in');

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user ?? null;
      if (!user) {
        if (!cancelled) setLabel('Not signed in');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name,username')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;
      const name = profile?.display_name?.trim() || profile?.username?.trim() || user.email || 'Account';
      setLabel(`Signed in: ${name}`);
    }

    refresh();
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(refresh, 0);
    });

    return () => {
      cancelled = true;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  return <button
    type="button"
    className="button secondary"
    data-tbd-account="true"
    style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      zIndex: 180,
      padding: '8px 12px',
      fontSize: '.78rem',
      lineHeight: 1.1,
      boxShadow: '0 8px 24px rgba(0,0,0,.28)'
    }}
  >{label}</button>;
}

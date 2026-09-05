'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export default function AccountRoundIdentityEnhancer() {
  const accountRef = useRef(null);
  const attemptedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let observer = null;
    let timer = null;

    async function loadAccountPlayer() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user ?? null;
      if (!user || cancelled) {
        accountRef.current = null;
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id,display_name,username')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile?.id || !profile.display_name || !profile.username || cancelled) {
        accountRef.current = null;
        return;
      }

      const { data: player } = await supabase
        .from('players')
        .select('id,display_name')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      accountRef.current = player?.id ? { id: player.id, displayName: player.display_name || profile.display_name } : null;
      attemptedRef.current = false;
      scheduleCheck();
    }

    function accountAlreadyInRound() {
      const account = accountRef.current;
      if (!account) return false;
      return [...document.querySelectorAll('input[title="Saved player profile"]')]
        .some(input => input.value === account.displayName);
    }

    function roundLooksFresh() {
      const statuses = [...document.querySelectorAll('.tbd-live-score-list .tbd-hole-status')];
      if (!statuses.length) return false;
      return statuses.every(node => node.textContent?.trim() === 'No score yet');
    }

    function tryUseAccountPlayer() {
      if (!accountRef.current || attemptedRef.current || accountAlreadyInRound() || !roundLooksFresh()) return;
      const chooseButton = document.querySelector('.tbd-live-score-list button.tbd-player-name-input[aria-label^="Choose "]');
      if (!chooseButton) return;
      attemptedRef.current = true;
      chooseButton.click();
    }

    function scheduleCheck() {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(tryUseAccountPlayer, 80);
    }

    loadAccountPlayer();
    observer = new MutationObserver(scheduleCheck);
    observer.observe(document.body, { childList: true, subtree: true });

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => loadAccountPlayer(), 0);
    });

    const accountChanged = () => {
      attemptedRef.current = false;
      window.setTimeout(() => loadAccountPlayer(), 0);
    };
    window.addEventListener('tbd-account-player-changed', accountChanged);

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      observer?.disconnect();
      authListener?.subscription?.unsubscribe();
      window.removeEventListener('tbd-account-player-changed', accountChanged);
    };
  }, []);

  return null;
}

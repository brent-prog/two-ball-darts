'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const BADGE_ATTR = 'data-tbd-friend-request-badge';
const CALLOUT_ATTR = 'data-tbd-friend-request-callout';

export default function FriendRequestNotificationEnhancer() {
  const countRef = useRef(0);
  const timerRef = useRef(null);

  function renderNotification() {
    const count = countRef.current;
    const playersButton = document.querySelector('[data-tbd-player-profiles]');

    if (playersButton) {
      playersButton.style.position = 'relative';
      let badge = playersButton.querySelector(`[${BADGE_ATTR}]`);
      if (count > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.setAttribute(BADGE_ATTR, 'true');
          badge.setAttribute('aria-label', `${count} pending friend request${count === 1 ? '' : 's'}`);
          Object.assign(badge.style, {
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            minWidth: '24px',
            height: '24px',
            padding: '0 7px',
            borderRadius: '999px',
            display: 'grid',
            placeItems: 'center',
            background: '#d94a3d',
            color: '#fff',
            border: '2px solid #fff4d6',
            fontSize: '12px',
            fontWeight: '900',
            lineHeight: '1',
            zIndex: '2'
          });
          playersButton.appendChild(badge);
        }
        badge.textContent = count > 9 ? '9+' : String(count);
        badge.setAttribute('aria-label', `${count} pending friend request${count === 1 ? '' : 's'}`);
      } else {
        badge?.remove();
      }
    }

    const playersHeading = [...document.querySelectorAll('h2')].find(node => node.textContent?.trim() === 'Players');
    const card = playersHeading?.closest('.card');
    let callout = card?.querySelector(`[${CALLOUT_ATTR}]`);

    if (!card || count < 1) {
      callout?.remove();
      return;
    }

    if (!callout) {
      callout = document.createElement('div');
      callout.setAttribute(CALLOUT_ATTR, 'true');
      Object.assign(callout.style, {
        margin: '0 0 18px',
        padding: '12px 14px',
        border: '1px solid rgba(208,169,72,.6)',
        borderRadius: '14px',
        background: 'rgba(208,169,72,.12)',
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) auto',
        gap: '10px',
        alignItems: 'center'
      });

      const message = document.createElement('div');
      message.dataset.tbdFriendRequestMessage = 'true';
      callout.appendChild(message);

      const review = document.createElement('button');
      review.type = 'button';
      review.className = 'button primary';
      review.textContent = 'Review';
      review.addEventListener('click', () => {
        const manageFriends = [...card.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Manage Friends');
        manageFriends?.click();
      });
      callout.appendChild(review);

      const headingBlock = playersHeading.closest('.section-heading');
      headingBlock?.insertAdjacentElement('afterend', callout);
    }

    const message = callout.querySelector('[data-tbd-friend-request-message]');
    if (message) {
      message.innerHTML = `<strong style="display:block;color:#fff4d6">You have ${count} friend request${count === 1 ? '' : 's'}.</strong><span style="font-size:.86rem;opacity:.75">Review and accept or decline ${count === 1 ? 'it' : 'them'}.</span>`;
    }
  }

  async function loadCount() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user ?? null;
    if (!user) {
      countRef.current = 0;
      renderNotification();
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile?.id) {
      countRef.current = 0;
      renderNotification();
      return;
    }

    const { count, error } = await supabase
      .from('friendships')
      .select('id', { count: 'exact', head: true })
      .eq('addressee_profile_id', profile.id)
      .eq('status', 'pending');

    if (!error) countRef.current = count ?? 0;
    renderNotification();
  }

  function scheduleLoad(delay = 0) {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(loadCount, delay);
  }

  useEffect(() => {
    scheduleLoad();

    const observer = new MutationObserver(() => renderNotification());
    observer.observe(document.body, { childList: true, subtree: true });

    const { data: authListener } = supabase.auth.onAuthStateChange(() => scheduleLoad(50));
    const refreshOnFocus = () => scheduleLoad();
    const refreshOnVisibility = () => {
      if (document.visibilityState === 'visible') scheduleLoad();
    };
    const refreshAfterFriendAction = event => {
      const button = event.target?.closest?.('button');
      const label = button?.textContent?.trim();
      if (label === 'Accept' || label === 'Decline' || label === 'Remove') scheduleLoad(500);
    };

    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnVisibility);
    document.addEventListener('click', refreshAfterFriendAction);
    const poll = window.setInterval(loadCount, 30000);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      window.clearInterval(poll);
      observer.disconnect();
      authListener?.subscription?.unsubscribe();
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnVisibility);
      document.removeEventListener('click', refreshAfterFriendAction);
      document.querySelector(`[${BADGE_ATTR}]`)?.remove();
      document.querySelector(`[${CALLOUT_ATTR}]`)?.remove();
    };
  }, []);

  return null;
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

const configs = {
  round: {
    eyebrow: 'Playing as a guest',
    title: 'Want your round saved to you?',
    body: 'You are not signed in. You can still play normally, but signing in keeps your players, rounds and stats with your account across devices.',
    continueLabel: 'Play as Guest'
  },
  players: {
    eyebrow: 'Local players',
    title: 'You are not signed in',
    body: 'You can use local saved guests on this device. Sign in to sync players across devices and use Friends.',
    continueLabel: 'Continue Locally'
  },
  saved: {
    eyebrow: 'Saved rounds',
    title: 'You are not signed in',
    body: 'Without an account, Saved Rounds only shows rounds tied to this browser. Sign in to see your account history across devices.',
    continueLabel: 'Show This Device'
  },
  friends: {
    eyebrow: 'TwoBall Friends',
    title: 'Sign in to use Friends',
    body: 'Friends are linked to your TwoBall account so they can follow you across devices.',
    continueLabel: null
  }
};

function actionFor(target) {
  if (target?.closest?.('[data-tbd-friends]')) return 'friends';
  if (target?.closest?.('[data-tbd-player-profiles]')) return 'players';
  const button = target?.closest?.('button');
  const text = button?.textContent?.trim();
  if (text === 'Start New Round') return 'round';
  if (text === 'Saved Rounds') return 'saved';
  return null;
}

export default function SignedOutActionGuard() {
  const [prompt, setPrompt] = useState(null);
  const bypass = useRef(new WeakSet());

  useEffect(() => {
    const handler = async event => {
      const action = actionFor(event.target);
      if (!action) return;

      const target = event.target?.closest?.('button,[data-tbd-friends],[data-tbd-player-profiles]');
      if (!target) return;
      if (bypass.current.has(target)) {
        bypass.current.delete(target);
        return;
      }

      const { data } = await supabase.auth.getUser();
      if (data?.user) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      setPrompt({ action, target });
    };

    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, []);

  function signIn() {
    setPrompt(null);
    window.setTimeout(() => document.querySelector('[data-tbd-account]')?.click(), 0);
  }

  function continueWithoutAccount() {
    const target = prompt?.target;
    setPrompt(null);
    if (!target) return;
    bypass.current.add(target);
    window.setTimeout(() => target.click(), 0);
  }

  if (!prompt) return null;
  const config = configs[prompt.action];

  return <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.82)', padding: '18px', display: 'grid', placeItems: 'center' }}>
    <div className="card" style={{ width: 'min(520px,96vw)', margin: 0, borderColor: '#d0a948' }}>
      <p className="eyebrow">{config.eyebrow}</p>
      <h2 style={{ fontSize: 'clamp(2rem,7vw,3.2rem)', marginBottom: '12px' }}>{config.title}</h2>
      <p style={{ margin: '0 0 18px', lineHeight: 1.5 }}>{config.body}</p>
      <div style={{ display: 'grid', gap: '10px' }}>
        <button className="button primary" type="button" onClick={signIn}>Sign In / Create Account</button>
        {config.continueLabel && <button className="button secondary" type="button" onClick={continueWithoutAccount}>{config.continueLabel}</button>}
        <button className="button ghost" type="button" onClick={() => setPrompt(null)}>Cancel</button>
      </div>
    </div>
  </div>;
}

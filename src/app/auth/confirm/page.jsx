'use client';

import { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ConfirmEmailActionPage() {
  const [status, setStatus] = useState('');
  const [working, setWorking] = useState(false);

  const authRequest = useMemo(() => {
    if (typeof window === 'undefined') return { tokenHash: '', invite: '' };
    const params = new URLSearchParams(window.location.search);
    return {
      tokenHash: params.get('token_hash') || '',
      redirectTo: params.get('redirect_to') || ''
    };
  }, []);

  async function continueToTwoBall() {
    if (!authRequest.tokenHash || working) return;

    setWorking(true);
    setStatus('Signing you in...');

    const { error } = await supabase.auth.verifyOtp({
      token_hash: authRequest.tokenHash,
      type: 'email'
    });

    if (error) {
      setWorking(false);
      setStatus(error.message || 'This sign-in link is no longer valid. Request a fresh email from TwoBall.');
      return;
    }

    let destination = '/';
    if (authRequest.redirectTo) {
      try {
        const target = new URL(authRequest.redirectTo, window.location.origin);
        if (target.origin === window.location.origin) {
          destination = `${target.pathname}${target.search}`;
        }
      } catch {
        destination = '/';
      }
    }

    window.location.replace(destination);
  }

  const valid = /^[A-Za-z0-9_-]+$/.test(authRequest.tokenHash);

  return <main style={{ minHeight: '100vh', background: '#02140f', color: '#fff4d6', display: 'grid', placeItems: 'center', padding: '24px' }}>
    <section className="card" style={{ width: 'min(520px, 96vw)', margin: 0, borderColor: '#d0a948', textAlign: 'center' }}>
      <p className="eyebrow">TwoBall account</p>
      <h1 style={{ marginTop: 0 }}>Almost There.</h1>
      {valid ? <>
        <p style={{ lineHeight: 1.55, opacity: .84 }}>
          Continue to confirm your email and sign in to TwoBall.
        </p>
        <button className="button primary" type="button" onClick={continueToTwoBall} disabled={working}>
          {working ? 'Signing In…' : 'Continue to TwoBall'}
        </button>
      </> : <>
        <p style={{ lineHeight: 1.55, opacity: .84 }}>
          This sign-in link is invalid or incomplete. Request a fresh sign-in email from TwoBall.
        </p>
        <a className="button primary" href="/">Back to TwoBall</a>
      </>}
      {status && <p className="status-line" style={{ marginBottom: 0 }}>{status}</p>}
    </section>
  </main>;
}

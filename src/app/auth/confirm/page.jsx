'use client';

import { useMemo, useState } from 'react';

export default function ConfirmEmailActionPage() {
  const [opening, setOpening] = useState(false);

  const confirmationUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    return params.get('confirmation_url') || '';
  }, []);

  function continueToTwoBall() {
    if (!confirmationUrl || opening) return;
    setOpening(true);
    window.location.assign(confirmationUrl);
  }

  const valid = /^https:\/\/[^/]+\.supabase\.co\/auth\/v1\/verify\?/i.test(confirmationUrl);

  return <main style={{ minHeight: '100vh', background: '#02140f', color: '#fff4d6', display: 'grid', placeItems: 'center', padding: '24px' }}>
    <section className="card" style={{ width: 'min(520px, 96vw)', margin: 0, borderColor: '#d0a948', textAlign: 'center' }}>
      <p className="eyebrow">TwoBall account</p>
      <h1 style={{ marginTop: 0 }}>Almost There.</h1>
      {valid ? <>
        <p style={{ lineHeight: 1.55, opacity: .84 }}>
          Continue to confirm your email and sign in to TwoBall.
        </p>
        <button className="button primary" type="button" onClick={continueToTwoBall} disabled={opening}>
          {opening ? 'Signing In…' : 'Continue to TwoBall'}
        </button>
      </> : <>
        <p style={{ lineHeight: 1.55, opacity: .84 }}>
          This sign-in link is invalid or incomplete. Request a fresh sign-in email from TwoBall.
        </p>
        <a className="button primary" href="/">Back to TwoBall</a>
      </>}
    </section>
  </main>;
}

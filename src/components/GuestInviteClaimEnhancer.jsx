'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function GuestInviteClaimEnhancer() {
  const [invite, setInvite] = useState(null);
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [claimed, setClaimed] = useState(false);

  async function loadInvite(inviteToken) {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_guest_invite', { invite_token: inviteToken });
    setLoading(false);
    if (error || !data?.length) {
      setInvite(null);
      setStatus(error?.message || 'This TwoBall invite is invalid.');
      return;
    }
    setInvite(data[0]);
    if (data[0].invite_status !== 'pending') setStatus('This invite has already been used or is no longer available.');
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('invite') || sessionStorage.getItem('tbd-pending-guest-invite') || '';
    if (!inviteToken) return;
    setToken(inviteToken);
    sessionStorage.setItem('tbd-pending-guest-invite', inviteToken);
    loadInvite(inviteToken);

    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => authListener?.subscription?.unsubscribe();
  }, []);

  async function sendMagicLink(event) {
    event.preventDefault();
    const address = email.trim();
    if (!address || !token) return;
    setLoading(true);
    setStatus('Sending sign-in link...');
    const redirect = `${window.location.origin}/?invite=${encodeURIComponent(token)}`;
    const { error } = await supabase.auth.signInWithOtp({ email: address, options: { emailRedirectTo: redirect } });
    setLoading(false);
    setStatus(error ? error.message : 'Check your email for your TwoBall sign-in link.');
  }

  async function claimInvite() {
    if (!token || !user) return;
    setLoading(true);
    setStatus('Claiming your TwoBall stats...');
    const { data, error } = await supabase.rpc('claim_guest_invite', { invite_token: token });
    setLoading(false);
    if (error || !data?.length) {
      setStatus(error?.message || 'Could not claim this guest profile.');
      return;
    }
    sessionStorage.removeItem('tbd-pending-guest-invite');
    const cleanUrl = `${window.location.origin}${window.location.pathname}`;
    window.history.replaceState({}, '', cleanUrl);
    window.dispatchEvent(new CustomEvent('tbd-account-player-changed', { detail: { playerId: data[0].player_id } }));
    setClaimed(true);
    setStatus('Done. Your saved TwoBall rounds and stats are now connected to your account.');
  }

  if (!token || (!invite && !status)) return null;

  return <div style={{ position: 'fixed', inset: 0, zIndex: 390, background: 'rgba(0,0,0,.86)', padding: '18px', display: 'grid', placeItems: 'center' }}>
    <div className="card" style={{ width: 'min(560px,96vw)', maxHeight: '90vh', overflow: 'auto', margin: 0, borderColor: '#d0a948' }}>
      <div className="section-heading compact" style={{ marginBottom: '14px', alignItems: 'flex-start' }}>
        <div><p className="eyebrow">TwoBall invite</p><h2 style={{ fontSize: 'clamp(2rem,7vw,3.2rem)' }}>{claimed ? 'Stats Claimed' : `Claim ${invite?.guest_name || 'Your Stats'}`}</h2></div>
        <button className="button secondary" type="button" onClick={() => { sessionStorage.removeItem('tbd-pending-guest-invite'); window.history.replaceState({}, '', `${window.location.origin}${window.location.pathname}`); setToken(''); }}>Close</button>
      </div>

      {invite && invite.invite_status === 'pending' && !claimed && <>
        <p style={{ marginTop: 0, opacity: .84 }}><strong>{invite.inviter_name}</strong> has been saving your TwoBall rounds as <strong>{invite.guest_name}</strong>. Join or sign in to claim that existing history instead of starting from zero.</p>
        {!user ? <form onSubmit={sendMagicLink} style={{ display: 'grid', gap: '10px' }}>
          <label htmlFor="guest-invite-email" style={{ color: '#fff4d6', fontWeight: 900 }}>Email</label>
          <input id="guest-invite-email" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" />
          <button className="button primary" type="submit" disabled={loading || !email.trim()}>Join / Sign In</button>
          <p style={{ margin: 0, fontSize: '.82rem', opacity: .68 }}>No password. We’ll email you a secure sign-in link.</p>
        </form> : <button className="button primary" type="button" onClick={claimInvite} disabled={loading}>Claim My Stats</button>}
      </>}

      {status && <p className="status-line" style={{ marginBottom: 0 }}>{status}</p>}
    </div>
  </div>;
}

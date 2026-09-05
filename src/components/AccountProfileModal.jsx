'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getOwnerKey } from '@/lib/storage';

const cleanUsername = value => value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

export default function AccountProfileModal({ open, onClose }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadAccount() {
    setLoading(true);
    setStatus('Loading account...');
    const { data: userData } = await supabase.auth.getUser();
    const nextUser = userData?.user ?? null;
    setUser(nextUser);

    if (!nextUser) {
      setProfile(null);
      setUsername('');
      setDisplayName('');
      setStatus('');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id,user_id,username,display_name')
      .eq('user_id', nextUser.id)
      .maybeSingle();

    if (error) setStatus(error.message);
    else {
      setProfile(data ?? null);
      setUsername(data?.username ?? '');
      setDisplayName(data?.display_name ?? '');
      setStatus('');
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!open) return;
    loadAccount();
    const { data: authListener } = supabase.auth.onAuthStateChange(() => loadAccount());
    return () => authListener?.subscription?.unsubscribe();
  }, [open]);

  async function sendMagicLink(event) {
    event.preventDefault();
    const address = email.trim();
    if (!address) return;
    setLoading(true);
    setStatus('Sending sign-in link...');
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: window.location.origin }
    });
    setLoading(false);
    setStatus(error ? error.message : 'Check your email for your TwoBall sign-in link.');
  }

  async function saveProfile(event) {
    event.preventDefault();
    if (!user) return;
    const handle = cleanUsername(username);
    const name = displayName.trim();
    if (handle.length < 3) {
      setStatus('Username must be at least 3 characters.');
      return;
    }
    if (!name) {
      setStatus('Add your display name.');
      return;
    }

    setLoading(true);
    setStatus('Saving profile...');
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ user_id: user.id, username: handle, display_name: name, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .select('id,user_id,username,display_name')
      .single();

    if (error || !data) {
      setLoading(false);
      setStatus(error?.code === '23505' ? 'That username is already taken.' : (error?.message || 'Could not save profile.'));
      return;
    }

    const ownerKey = getOwnerKey();
    const { data: linkedPlayer } = await supabase
      .from('players')
      .select('id')
      .eq('profile_id', data.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    let accountPlayerId = linkedPlayer?.id ?? null;

    if (accountPlayerId) {
      await supabase
        .from('players')
        .update({ owner_key: ownerKey, display_name: name, is_profile: true })
        .eq('id', accountPlayerId);
    } else {
      const { data: existingLocal } = await supabase
        .from('players')
        .select('id')
        .eq('owner_key', ownerKey)
        .eq('display_name', name)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (existingLocal?.id) {
        accountPlayerId = existingLocal.id;
        await supabase
          .from('players')
          .update({ profile_id: data.id, is_profile: true, display_name: name })
          .eq('id', existingLocal.id);
      } else {
        const { data: createdPlayer, error: playerError } = await supabase
          .from('players')
          .insert({ owner_key: ownerKey, display_name: name, is_profile: true, profile_id: data.id })
          .select('id')
          .single();
        if (playerError || !createdPlayer) {
          setLoading(false);
          setStatus(playerError?.message || 'Profile saved, but your player identity could not be created.');
          return;
        }
        accountPlayerId = createdPlayer.id;
      }
    }

    window.dispatchEvent(new CustomEvent('tbd-account-player-changed', { detail: { playerId: accountPlayerId, profileId: data.id, displayName: name } }));
    setProfile(data);
    setUsername(data.username ?? '');
    setDisplayName(data.display_name ?? '');
    setLoading(false);
    setStatus('Profile saved. Your TwoBall player identity is synced across devices.');
  }

  async function signOut() {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
    setStatus('Signed out. You can still play as a guest.');
  }

  if (!open) return null;

  return <div style={{ position: 'fixed', inset: 0, zIndex: 360, background: 'rgba(0,0,0,.82)', padding: '18px', display: 'grid', placeItems: 'center' }}>
    <div className="card" style={{ width: 'min(560px,96vw)', maxHeight: '90vh', overflow: 'auto', margin: 0, borderColor: '#d0a948' }}>
      <div className="section-heading compact" style={{ marginBottom: '14px', alignItems: 'flex-start' }}>
        <div><p className="eyebrow">TwoBall account</p><h2 style={{ fontSize: 'clamp(2rem,7vw,3.5rem)' }}>{user ? 'My Profile' : 'Save Your Game'}</h2></div>
        <button className="button secondary" onClick={onClose}>Close</button>
      </div>

      {!user ? <>
        <p style={{ marginTop: 0, opacity: .82 }}>Sign in to keep your profile, rounds and stats connected across devices. No account is required to play.</p>
        <form onSubmit={sendMagicLink} style={{ display: 'grid', gap: '10px' }}>
          <label htmlFor="twoball-email" style={{ color: '#fff4d6', fontWeight: 900 }}>Email</label>
          <input id="twoball-email" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" />
          <button className="button primary" type="submit" disabled={loading || !email.trim()}>Email Me a Sign-In Link</button>
        </form>
      </> : <form onSubmit={saveProfile} style={{ display: 'grid', gap: '10px' }}>
        <p style={{ marginTop: 0, opacity: .72, fontSize: '.86rem' }}>{user.email}</p>
        <label htmlFor="twoball-display-name" style={{ color: '#fff4d6', fontWeight: 900 }}>Display Name</label>
        <input id="twoball-display-name" value={displayName} onChange={event => setDisplayName(event.target.value)} placeholder="Brent" autoComplete="nickname" />
        <label htmlFor="twoball-username" style={{ color: '#fff4d6', fontWeight: 900 }}>Username</label>
        <input id="twoball-username" value={username} onChange={event => setUsername(cleanUsername(event.target.value))} placeholder="brent" autoCapitalize="none" autoCorrect="off" />
        <p style={{ margin: '-4px 0 4px', opacity: .66, fontSize: '.78rem' }}>3-24 characters. Letters, numbers and underscores. This will be how friends find you.</p>
        <button className="button primary" type="submit" disabled={loading || !displayName.trim() || cleanUsername(username).length < 3}>{profile?.username ? 'Update Profile' : 'Create My Profile'}</button>
        <button className="button ghost" type="button" onClick={signOut} disabled={loading}>Sign Out</button>
      </form>}

      {status && <p className="status-line" style={{ marginBottom: 0 }}>{status}</p>}
    </div>
  </div>;
}

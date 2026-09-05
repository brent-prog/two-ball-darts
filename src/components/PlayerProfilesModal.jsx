'use client';

import { useEffect, useRef, useState } from 'react';
import PlayerProfileStats from '@/components/PlayerProfileStats';
import { supabase } from '@/lib/supabase';
import { getOwnerKey } from '@/lib/storage';

export default function PlayerProfilesModal({ open, onClose, onSelectProfile, onAddGuest, activePlayerIds = [], browseOnly = false }) {
  const [profiles, setProfiles] = useState([]);
  const [friends, setFriends] = useState([]);
  const [accountPlayerId, setAccountPlayerId] = useState(null);
  const [accountProfileId, setAccountProfileId] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [invitePrompt, setInvitePrompt] = useState(null);
  const [inviteUrl, setInviteUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const autoSelectedRef = useRef(false);

  async function loadProfiles() {
    setLoading(true);
    setStatus('Loading players...');

    const ownerKey = getOwnerKey();
    let nextAccountProfileId = null;
    let nextAccountPlayerId = null;
    let friendPlayers = [];
    const { data: userData } = await supabase.auth.getUser();
    const authUser = userData?.user ?? null;

    if (authUser) {
      const { data: accountProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', authUser.id)
        .maybeSingle();
      nextAccountProfileId = accountProfile?.id ?? null;

      if (nextAccountProfileId) {
        await supabase
          .from('players')
          .update({ owner_profile_id: nextAccountProfileId })
          .eq('owner_key', ownerKey)
          .eq('is_profile', true)
          .is('profile_id', null)
          .is('owner_profile_id', null);

        const { data: accountPlayer } = await supabase
          .from('players')
          .select('id')
          .eq('profile_id', nextAccountProfileId)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        nextAccountPlayerId = accountPlayer?.id ?? null;

        const { data: friendshipRows } = await supabase
          .from('friendships')
          .select('requester_profile_id,addressee_profile_id')
          .eq('status', 'accepted')
          .or(`requester_profile_id.eq.${nextAccountProfileId},addressee_profile_id.eq.${nextAccountProfileId}`);

        const friendProfileIds = [...new Set((friendshipRows ?? []).map(row => row.requester_profile_id === nextAccountProfileId ? row.addressee_profile_id : row.requester_profile_id))];
        if (friendProfileIds.length) {
          const { data: linkedFriendPlayers } = await supabase
            .from('players')
            .select('id,display_name,profile_id,owner_profile_id')
            .in('profile_id', friendProfileIds)
            .eq('is_profile', true)
            .order('display_name', { ascending: true });
          friendPlayers = linkedFriendPlayers ?? [];
        }
      }
    }

    let query = supabase
      .from('players')
      .select('id,display_name,profile_id,owner_profile_id')
      .eq('is_profile', true)
      .order('display_name', { ascending: true });

    if (nextAccountProfileId) query = query.or(`profile_id.eq.${nextAccountProfileId},owner_profile_id.eq.${nextAccountProfileId},owner_key.eq.${ownerKey}`);
    else query = query.eq('owner_key', ownerKey);

    const { data, error } = await query;
    if (error) setStatus(error.message);
    else {
      const unique = [];
      const seen = new Set();
      (data ?? []).forEach(player => {
        if (seen.has(player.id)) return;
        seen.add(player.id);
        unique.push(player);
      });
      unique.sort((a, b) => {
        if (a.id === nextAccountPlayerId) return -1;
        if (b.id === nextAccountPlayerId) return 1;
        return a.display_name.localeCompare(b.display_name);
      });
      setProfiles(unique);
      setFriends(friendPlayers.filter(player => !seen.has(player.id)));
      setAccountPlayerId(nextAccountPlayerId);
      setAccountProfileId(nextAccountProfileId);
      setStatus(unique.length || friendPlayers.length ? '' : 'No players yet.');

      if (!browseOnly && !autoSelectedRef.current && activePlayerIds.length === 0 && nextAccountPlayerId) {
        const me = unique.find(player => player.id === nextAccountPlayerId);
        if (me) {
          autoSelectedRef.current = true;
          onSelectProfile?.(me);
          onClose();
        }
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    if (open) {
      autoSelectedRef.current = false;
      setSelectedProfile(null);
      setInvitePrompt(null);
      setInviteUrl('');
      loadProfiles();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => loadProfiles(), 0);
    });
    return () => authListener?.subscription?.unsubscribe();
  }, [open]);

  async function createProfile(event) {
    event.preventDefault();
    const displayName = newName.trim();
    if (!displayName) return;
    setLoading(true);
    setStatus('Saving guest...');
    const payload = {
      owner_key: getOwnerKey(),
      display_name: displayName,
      is_profile: true,
      ...(accountProfileId ? { owner_profile_id: accountProfileId } : {})
    };
    const { data, error } = await supabase
      .from('players')
      .upsert(payload, { onConflict: 'owner_key,display_name' })
      .select('id,display_name,profile_id,owner_profile_id')
      .single();
    setLoading(false);
    if (error || !data) {
      setStatus(error?.message || 'Could not save guest.');
      return;
    }
    setNewName('');
    await loadProfiles();
    if (!browseOnly) onSelectProfile?.(data);
    setInvitePrompt({ ...data, closeAfter: !browseOnly });
    setStatus('');
  }

  function openAccountForInvite() {
    const accountButton = document.querySelector('[data-tbd-account]');
    if (!accountButton) {
      setStatus('Open My Profile and sign in, then return here to create the invite.');
      return;
    }
    setStatus('Sign in to create this guest invite.');
    accountButton.click();
  }

  async function createInvite(profile) {
    if (!accountProfileId) {
      openAccountForInvite();
      return;
    }
    setLoading(true);
    setStatus('Creating invite...');

    let token = null;
    const { data: existing } = await supabase
      .from('guest_player_invites')
      .select('token')
      .eq('guest_player_id', profile.id)
      .eq('status', 'pending')
      .maybeSingle();
    token = existing?.token ?? null;

    if (!token) {
      const { data, error } = await supabase
        .from('guest_player_invites')
        .insert({ guest_player_id: profile.id, inviter_profile_id: accountProfileId })
        .select('token')
        .single();
      if (error || !data?.token) {
        setLoading(false);
        setStatus(error?.message || 'Could not create invite.');
        return;
      }
      token = data.token;
    }

    const url = `${window.location.origin}/?invite=${encodeURIComponent(token)}`;
    setInvitePrompt(profile);
    setInviteUrl(url);
    setStatus('Invite ready. Send this link to the guest.');
    setLoading(false);
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setStatus('Invite link copied.');
    } catch {
      setStatus('Copy the invite link below.');
    }
  }

  async function shareInvite() {
    if (!inviteUrl || !invitePrompt) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on TwoBall Darts',
          text: `I saved your TwoBall stats as ${invitePrompt.display_name}. Claim them and join me on TwoBall Darts.`,
          url: inviteUrl
        });
        return;
      } catch {}
    }
    await copyInvite();
  }

  function dismissInvite() {
    const shouldClose = invitePrompt?.closeAfter;
    setInvitePrompt(null);
    setInviteUrl('');
    setStatus('');
    if (shouldClose) onClose();
  }

  function renderPlayer(profile, labelSuffix = '') {
    const alreadyPlaying = activePlayerIds.includes(profile.id);
    const isMe = profile.id === accountPlayerId;
    const label = `${profile.display_name}${isMe ? ' · You' : ''}${labelSuffix}`;
    if (browseOnly) return <button key={profile.id} className="button secondary" type="button" onClick={() => setSelectedProfile(profile)} style={{ width: '100%', textAlign: 'left' }}>{label}</button>;
    return <div key={profile.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '8px' }}>
      <button className="button secondary" disabled={alreadyPlaying} onClick={() => { onSelectProfile?.(profile); onClose(); }} style={{ opacity: alreadyPlaying ? .5 : 1, minWidth: 0, textAlign: 'left' }}>{label}{alreadyPlaying ? ' · Playing' : ''}</button>
      <button className="button ghost" type="button" onClick={() => setSelectedProfile(profile)} aria-label={`View ${profile.display_name} profile`}>Stats</button>
    </div>;
  }

  function renderSavedGuest(profile) {
    if (!browseOnly) return renderPlayer(profile);
    return <div key={profile.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '8px' }}>
      <button className="button secondary" type="button" onClick={() => setSelectedProfile(profile)} style={{ minWidth: 0, textAlign: 'left' }}>{profile.display_name}</button>
      {accountProfileId && <button className="button ghost" type="button" onClick={() => createInvite(profile)} disabled={loading}>Invite</button>}
    </div>;
  }

  if (!open) return null;

  const me = profiles.find(profile => profile.id === accountPlayerId) ?? null;
  const savedGuests = profiles.filter(profile => profile.id !== accountPlayerId && !profile.profile_id);

  return <div style={{ position: 'fixed', inset: 0, zIndex: 340, background: 'rgba(0,0,0,.8)', padding: '18px', display: 'grid', placeItems: 'center' }}>
    <div className="card" style={{ width: 'min(560px, 96vw)', maxHeight: '90vh', overflow: 'auto', margin: 0, borderColor: '#d0a948' }}>
      {invitePrompt ? <>
        <div className="section-heading compact" style={{ marginBottom: '14px', alignItems: 'flex-start' }}>
          <div><p className="eyebrow">Guest saved</p><h2 style={{ fontSize: 'clamp(2rem,7vw,3.2rem)' }}>Invite {invitePrompt.display_name}?</h2></div>
          <button className="button secondary" type="button" onClick={dismissInvite}>Not Now</button>
        </div>
        <p style={{ marginTop: 0, opacity: .82 }}>Optional. If {invitePrompt.display_name} joins through this invite, their saved TwoBall rounds and stats become their account history.</p>
        {!inviteUrl ? <button className="button primary" type="button" onClick={accountProfileId ? () => createInvite(invitePrompt) : openAccountForInvite} disabled={loading}>{accountProfileId ? 'Create Invite' : 'Sign In to Invite'}</button> : <div style={{ display: 'grid', gap: '10px' }}>
          <input value={inviteUrl} readOnly onFocus={event => event.target.select()} aria-label="Guest invite link" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button className="button primary" type="button" onClick={shareInvite}>Share Invite</button>
            <button className="button secondary" type="button" onClick={copyInvite}>Copy Link</button>
          </div>
        </div>}
        {status && <p className="status-line">{status}</p>}
      </> : selectedProfile ? <PlayerProfileStats profile={selectedProfile} onBack={() => setSelectedProfile(null)} /> : <>
        <div className="section-heading compact" style={{ marginBottom: '14px', alignItems: 'flex-start' }}>
          <div><p className="eyebrow">{browseOnly ? 'Your TwoBall players' : 'Round players'}</p><h2 style={{ fontSize: 'clamp(2rem, 7vw, 3.5rem)' }}>{browseOnly ? 'Players' : 'Add Player'}</h2></div>
          <button className="button secondary" onClick={onClose}>Close</button>
        </div>

        {me && <section><p style={{ margin: '0 0 10px', color: '#fff4d6', fontWeight: 900 }}>You</p><div style={{ display: 'grid', gap: '8px' }}>{renderPlayer(me)}</div></section>}

        <section style={{ marginTop: me ? '18px' : 0, paddingTop: me ? '16px' : 0, borderTop: me ? '1px solid rgba(208,169,72,.28)' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
            <p style={{ margin: 0, color: '#fff4d6', fontWeight: 900 }}>Friends</p>
            {browseOnly && <button className="button ghost" type="button" data-tbd-friends="true" onClick={onClose}>Manage Friends</button>}
          </div>
          <div style={{ display: 'grid', gap: '8px' }}>{friends.length ? friends.map(profile => renderPlayer(profile, ' · Friend')) : <p style={{ margin: 0, opacity: .68 }}>No friends yet.</p>}</div>
        </section>

        <section style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid rgba(208,169,72,.28)' }}>
          <p style={{ margin: '0 0 10px', color: '#fff4d6', fontWeight: 900 }}>Saved Guests</p>
          <div style={{ display: 'grid', gap: '8px' }}>{savedGuests.length ? savedGuests.map(renderSavedGuest) : <p style={{ margin: 0, opacity: .68 }}>No saved guests yet.</p>}</div>
          {accountProfileId && <p style={{ margin: '8px 0 0', fontSize: '.84rem', opacity: .65 }}>Saved guests follow your account. Invite them later to claim their stats.</p>}
        </section>

        {status && <p className="status-line">{status}</p>}

        <form onSubmit={createProfile} style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid rgba(208,169,72,.28)', display: 'grid', gap: '10px' }}>
          <label htmlFor="new-player-profile" style={{ color: '#fff4d6', fontWeight: 900 }}>Save a Guest</label>
          <input id="new-player-profile" className="tbd-player-name-input" value={newName} onChange={event => setNewName(event.target.value)} placeholder="Guest name" autoComplete="off" />
          <button className="button primary" type="submit" disabled={loading || !newName.trim()}>{browseOnly ? 'Save Guest' : 'Save & Add Guest'}</button>
        </form>

        {!browseOnly && <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(208,169,72,.28)' }}>
          <button className="button ghost" style={{ width: '100%' }} onClick={() => { onAddGuest?.(); onClose(); }}>One-Round Guest Instead</button>
          <p style={{ margin: '8px 0 0', fontSize: '.86rem', opacity: .72, textAlign: 'center' }}>One-round guests are not saved to your Players list.</p>
        </div>}
      </>}
    </div>
  </div>;
}

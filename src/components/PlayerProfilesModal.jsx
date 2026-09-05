'use client';

import { useEffect, useRef, useState } from 'react';
import PlayerProfileStats from '@/components/PlayerProfileStats';
import { supabase } from '@/lib/supabase';
import { getOwnerKey } from '@/lib/storage';

export default function PlayerProfilesModal({ open, onClose, onSelectProfile, onAddGuest, activePlayerIds = [], browseOnly = false }) {
  const [profiles, setProfiles] = useState([]);
  const [friends, setFriends] = useState([]);
  const [accountPlayerId, setAccountPlayerId] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [newName, setNewName] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const autoSelectedRef = useRef(false);

  async function loadProfiles() {
    setLoading(true);
    setStatus('Loading players...');

    const ownerKey = getOwnerKey();
    let accountProfileId = null;
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
      accountProfileId = accountProfile?.id ?? null;

      if (accountProfileId) {
        const { data: accountPlayer } = await supabase
          .from('players')
          .select('id')
          .eq('profile_id', accountProfileId)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        nextAccountPlayerId = accountPlayer?.id ?? null;

        const { data: friendshipRows } = await supabase
          .from('friendships')
          .select('requester_profile_id,addressee_profile_id')
          .eq('status', 'accepted')
          .or(`requester_profile_id.eq.${accountProfileId},addressee_profile_id.eq.${accountProfileId}`);

        const friendProfileIds = [...new Set((friendshipRows ?? []).map(row => row.requester_profile_id === accountProfileId ? row.addressee_profile_id : row.requester_profile_id))];
        if (friendProfileIds.length) {
          const { data: linkedFriendPlayers } = await supabase
            .from('players')
            .select('id,display_name,profile_id')
            .in('profile_id', friendProfileIds)
            .eq('is_profile', true)
            .order('display_name', { ascending: true });
          friendPlayers = linkedFriendPlayers ?? [];
        }
      }
    }

    let query = supabase
      .from('players')
      .select('id,display_name,profile_id')
      .eq('is_profile', true)
      .order('display_name', { ascending: true });

    if (accountProfileId) query = query.or(`owner_key.eq.${ownerKey},profile_id.eq.${accountProfileId}`);
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
      setStatus(unique.length || friendPlayers.length ? '' : 'No saved players yet.');

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
      loadProfiles();
    }
  }, [open]);

  async function createProfile(event) {
    event.preventDefault();
    const displayName = newName.trim();
    if (!displayName) return;
    setLoading(true);
    setStatus('Saving player...');
    const { data, error } = await supabase
      .from('players')
      .upsert({ owner_key: getOwnerKey(), display_name: displayName, is_profile: true }, { onConflict: 'owner_key,display_name' })
      .select('id,display_name,profile_id')
      .single();
    setLoading(false);
    if (error || !data) {
      setStatus(error?.message || 'Could not save player.');
      return;
    }
    setNewName('');
    if (browseOnly) {
      await loadProfiles();
      setSelectedProfile(data);
      return;
    }
    onSelectProfile?.(data);
    onClose();
  }

  function renderPlayer(profile, labelSuffix = '') {
    const alreadyPlaying = activePlayerIds.includes(profile.id);
    const isMe = profile.id === accountPlayerId;
    const label = `${profile.display_name}${isMe ? ' · You' : ''}${labelSuffix}`;
    if (browseOnly) {
      return <button key={profile.id} className="button secondary" type="button" onClick={() => setSelectedProfile(profile)} style={{ width: '100%', textAlign: 'left' }}>{label}</button>;
    }
    return <div key={profile.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '8px' }}>
      <button className="button secondary" disabled={alreadyPlaying} onClick={() => { onSelectProfile?.(profile); onClose(); }} style={{ opacity: alreadyPlaying ? .5 : 1, minWidth: 0, textAlign: 'left' }}>{label}{alreadyPlaying ? ' · Playing' : ''}</button>
      <button className="button ghost" type="button" onClick={() => setSelectedProfile(profile)} aria-label={`View ${profile.display_name} profile`}>Stats</button>
    </div>;
  }

  if (!open) return null;

  return <div style={{ position: 'fixed', inset: 0, zIndex: 340, background: 'rgba(0,0,0,.8)', padding: '18px', display: 'grid', placeItems: 'center' }}>
    <div className="card" style={{ width: 'min(560px, 96vw)', maxHeight: '90vh', overflow: 'auto', margin: 0, borderColor: '#d0a948' }}>
      {selectedProfile ? <PlayerProfileStats profile={selectedProfile} onBack={() => setSelectedProfile(null)} /> : <>
        <div className="section-heading compact" style={{ marginBottom: '14px', alignItems: 'flex-start' }}>
          <div><p className="eyebrow">{browseOnly ? 'Saved players' : 'Round players'}</p><h2 style={{ fontSize: 'clamp(2rem, 7vw, 3.5rem)' }}>{browseOnly ? 'Player Profiles' : 'Add Player'}</h2></div>
          <button className="button secondary" onClick={onClose}>Close</button>
        </div>

        <p style={{ margin: '0 0 10px', color: '#fff4d6', fontWeight: 900 }}>Saved Players</p>
        <div style={{ display: 'grid', gap: '8px' }}>{profiles.map(profile => renderPlayer(profile))}</div>

        {friends.length > 0 && <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid rgba(208,169,72,.28)' }}>
          <p style={{ margin: '0 0 10px', color: '#fff4d6', fontWeight: 900 }}>Friends</p>
          <div style={{ display: 'grid', gap: '8px' }}>{friends.map(profile => renderPlayer(profile, ' · Friend'))}</div>
        </div>}

        {status && <p className="status-line">{status}</p>}

        <form onSubmit={createProfile} style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid rgba(208,169,72,.28)', display: 'grid', gap: '10px' }}>
          <label htmlFor="new-player-profile" style={{ color: '#fff4d6', fontWeight: 900 }}>Create Saved Player</label>
          <input id="new-player-profile" className="tbd-player-name-input" value={newName} onChange={event => setNewName(event.target.value)} placeholder="Player name" autoComplete="off" />
          <button className="button primary" type="submit" disabled={loading || !newName.trim()}>{browseOnly ? 'Create Player' : 'Save & Add Player'}</button>
        </form>

        {!browseOnly && <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(208,169,72,.28)' }}>
          <button className="button ghost" style={{ width: '100%' }} onClick={() => { onAddGuest?.(); onClose(); }}>Add Guest Instead</button>
          <p style={{ margin: '8px 0 0', fontSize: '.86rem', opacity: .72, textAlign: 'center' }}>Guest names can be edited during this round and are not treated as saved profiles.</p>
        </div>}
      </>}
    </div>
  </div>;
}

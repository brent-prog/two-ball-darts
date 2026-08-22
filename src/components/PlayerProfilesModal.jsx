'use client';

import { useEffect, useState } from 'react';
import PlayerProfileStats from '@/components/PlayerProfileStats';
import { supabase } from '@/lib/supabase';
import { getOwnerKey } from '@/lib/storage';

export default function PlayerProfilesModal({ open, onClose, onSelectProfile, onAddGuest, activePlayerIds = [], browseOnly = false }) {
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [newName, setNewName] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadProfiles() {
    setLoading(true);
    setStatus('Loading players...');
    const { data, error } = await supabase
      .from('players')
      .select('id,display_name')
      .eq('owner_key', getOwnerKey())
      .eq('is_profile', true)
      .order('display_name', { ascending: true });
    if (error) setStatus(error.message);
    else {
      setProfiles(data ?? []);
      setStatus(data?.length ? '' : 'No saved players yet.');
    }
    setLoading(false);
  }

  useEffect(() => {
    if (open) {
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
      .select('id,display_name')
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

  if (!open) return null;

  return <div style={{ position: 'fixed', inset: 0, zIndex: 340, background: 'rgba(0,0,0,.8)', padding: '18px', display: 'grid', placeItems: 'center' }}>
    <div className="card" style={{ width: 'min(560px, 96vw)', maxHeight: '90vh', overflow: 'auto', margin: 0, borderColor: '#d0a948' }}>
      {selectedProfile ? <PlayerProfileStats profile={selectedProfile} onBack={() => setSelectedProfile(null)} /> : <>
        <div className="section-heading compact" style={{ marginBottom: '14px', alignItems: 'flex-start' }}>
          <div><p className="eyebrow">{browseOnly ? 'Saved players' : 'Round players'}</p><h2 style={{ fontSize: 'clamp(2rem, 7vw, 3.5rem)' }}>{browseOnly ? 'Player Profiles' : 'Add Player'}</h2></div>
          <button className="button secondary" onClick={onClose}>Close</button>
        </div>

        <p style={{ margin: '0 0 10px', color: '#fff4d6', fontWeight: 900 }}>Saved Players</p>
        <div style={{ display: 'grid', gap: '8px' }}>
          {profiles.map(profile => {
            const alreadyPlaying = activePlayerIds.includes(profile.id);
            if (browseOnly) {
              return <button key={profile.id} className="button secondary" type="button" onClick={() => setSelectedProfile(profile)} style={{ width: '100%', justifyContent: 'space-between', textAlign: 'left' }}>
                <span>{profile.display_name}</span><span>View Profile</span>
              </button>;
            }
            return <div key={profile.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '8px' }}>
              <button className="button secondary" disabled={alreadyPlaying} onClick={() => { onSelectProfile?.(profile); onClose(); }} style={{ justifyContent: 'space-between', opacity: alreadyPlaying ? .5 : 1, minWidth: 0 }}>
                <span>{profile.display_name}</span><span>{alreadyPlaying ? 'Playing' : 'Add'}</span>
              </button>
              <button className="button ghost" type="button" onClick={() => setSelectedProfile(profile)} aria-label={`View ${profile.display_name} profile`}>Stats</button>
            </div>;
          })}
        </div>
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

'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function FriendsModal({ open, onClose }) {
  const [myProfile, setMyProfile] = useState(null);
  const [relationships, setRelationships] = useState([]);
  const [peopleById, setPeopleById] = useState({});
  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadFriends() {
    setLoading(true);
    setStatus('Loading friends...');
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user ?? null;
    if (!user) {
      setMyProfile(null);
      setRelationships([]);
      setPeopleById({});
      setStatus('Sign in to use Friends.');
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id,username,display_name')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError || !profile) {
      setStatus(profileError?.message || 'Create your profile before adding friends.');
      setLoading(false);
      return;
    }
    setMyProfile(profile);

    const { data: rows, error } = await supabase
      .from('friendships')
      .select('id,requester_profile_id,addressee_profile_id,status,created_at')
      .or(`requester_profile_id.eq.${profile.id},addressee_profile_id.eq.${profile.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      setStatus(error.message);
      setLoading(false);
      return;
    }

    const ids = [...new Set((rows ?? []).flatMap(row => [row.requester_profile_id, row.addressee_profile_id]).filter(id => id !== profile.id))];
    let people = {};
    if (ids.length) {
      const { data: profiles } = await supabase.from('profiles').select('id,username,display_name').in('id', ids);
      people = Object.fromEntries((profiles ?? []).map(person => [person.id, person]));
    }

    setRelationships(rows ?? []);
    setPeopleById(people);
    setStatus('');
    setLoading(false);
  }

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setSearchResult(null);
    loadFriends();
  }, [open]);

  const accepted = useMemo(() => relationships.filter(row => row.status === 'accepted'), [relationships]);
  const incoming = useMemo(() => relationships.filter(row => row.status === 'pending' && row.addressee_profile_id === myProfile?.id), [relationships, myProfile]);
  const outgoing = useMemo(() => relationships.filter(row => row.status === 'pending' && row.requester_profile_id === myProfile?.id), [relationships, myProfile]);

  function otherPerson(row) {
    if (!myProfile) return null;
    const otherId = row.requester_profile_id === myProfile.id ? row.addressee_profile_id : row.requester_profile_id;
    return peopleById[otherId] ?? null;
  }

  async function searchUsername(event) {
    event.preventDefault();
    if (!myProfile) return;
    const handle = query.trim().toLowerCase().replace(/^@/, '');
    if (!handle) return;
    setLoading(true);
    setStatus('Searching...');
    const { data, error } = await supabase
      .from('profiles')
      .select('id,username,display_name')
      .ilike('username', handle)
      .maybeSingle();
    setLoading(false);
    if (error) {
      setSearchResult(null);
      setStatus(error.message);
      return;
    }
    if (!data || data.id === myProfile.id) {
      setSearchResult(null);
      setStatus(data?.id === myProfile.id ? 'That is your own username.' : 'No TwoBall player found with that username.');
      return;
    }
    setSearchResult(data);
    setStatus('');
  }

  async function sendRequest(person) {
    if (!myProfile || !person) return;
    setLoading(true);
    setStatus('Sending request...');
    const existing = relationships.find(row =>
      (row.requester_profile_id === myProfile.id && row.addressee_profile_id === person.id) ||
      (row.requester_profile_id === person.id && row.addressee_profile_id === myProfile.id)
    );
    if (existing) {
      setLoading(false);
      setStatus(existing.status === 'accepted' ? 'You are already friends.' : existing.status === 'pending' ? 'A friend request already exists.' : 'A previous friendship record already exists.');
      return;
    }

    const { error } = await supabase.from('friendships').insert({
      requester_profile_id: myProfile.id,
      addressee_profile_id: person.id,
      status: 'pending'
    });
    if (error) setStatus(error.code === '23505' ? 'A friend request already exists.' : error.message);
    else {
      setSearchResult(null);
      setQuery('');
      await loadFriends();
      setStatus('Friend request sent.');
    }
    setLoading(false);
  }

  async function respond(row, nextStatus) {
    setLoading(true);
    const { error } = await supabase.from('friendships').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', row.id);
    if (error) setStatus(error.message);
    else await loadFriends();
    setLoading(false);
  }

  async function removeFriend(row) {
    setLoading(true);
    const { error } = await supabase.from('friendships').delete().eq('id', row.id);
    if (error) setStatus(error.message);
    else {
      await loadFriends();
      setStatus('Friend removed.');
    }
    setLoading(false);
  }

  if (!open) return null;

  return <div style={{ position: 'fixed', inset: 0, zIndex: 370, background: 'rgba(0,0,0,.82)', padding: '18px', display: 'grid', placeItems: 'center' }}>
    <div className="card" style={{ width: 'min(620px,96vw)', maxHeight: '90vh', overflow: 'auto', margin: 0, borderColor: '#d0a948' }}>
      <div className="section-heading compact" style={{ marginBottom: '14px', alignItems: 'flex-start' }}>
        <div><p className="eyebrow">TwoBall network</p><h2 style={{ fontSize: 'clamp(2rem,7vw,3.5rem)' }}>Friends</h2></div>
        <button className="button secondary" onClick={onClose}>Close</button>
      </div>

      {myProfile && <form onSubmit={searchUsername} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '8px', marginBottom: '18px' }}>
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search username" autoCapitalize="none" autoCorrect="off" />
        <button className="button primary" type="submit" disabled={loading || !query.trim()}>Find</button>
      </form>}

      {searchResult && <div style={{ border: '1px solid rgba(208,169,72,.45)', borderRadius: '14px', padding: '12px', marginBottom: '18px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '10px', alignItems: 'center' }}>
        <div><strong style={{ display: 'block' }}>{searchResult.display_name || searchResult.username}</strong><span style={{ opacity: .72 }}>@{searchResult.username}</span></div>
        <button className="button primary" onClick={() => sendRequest(searchResult)} disabled={loading}>Add Friend</button>
      </div>}

      {incoming.length > 0 && <section style={{ marginBottom: '18px' }}>
        <p style={{ color: '#fff4d6', fontWeight: 900, margin: '0 0 8px' }}>Friend Requests</p>
        <div style={{ display: 'grid', gap: '8px' }}>{incoming.map(row => { const person = otherPerson(row); return <div key={row.id} style={{ border: '1px solid rgba(208,169,72,.35)', borderRadius: '12px', padding: '10px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto auto', gap: '8px', alignItems: 'center' }}><span><strong>{person?.display_name || person?.username || 'Player'}</strong>{person?.username ? ` · @${person.username}` : ''}</span><button className="button primary" onClick={() => respond(row, 'accepted')} disabled={loading}>Accept</button><button className="button ghost" onClick={() => respond(row, 'declined')} disabled={loading}>Decline</button></div>; })}</div>
      </section>}

      <section style={{ marginBottom: '18px' }}>
        <p style={{ color: '#fff4d6', fontWeight: 900, margin: '0 0 8px' }}>Your Friends</p>
        <div style={{ display: 'grid', gap: '8px' }}>
          {accepted.length ? accepted.map(row => { const person = otherPerson(row); return <div key={row.id} style={{ border: '1px solid rgba(208,169,72,.35)', borderRadius: '12px', padding: '10px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '8px', alignItems: 'center' }}><span><strong>{person?.display_name || person?.username || 'Player'}</strong>{person?.username ? ` · @${person.username}` : ''}</span><button className="button ghost" onClick={() => removeFriend(row)} disabled={loading}>Remove</button></div>; }) : <p style={{ margin: 0, opacity: .68 }}>No friends yet.</p>}
        </div>
      </section>

      {outgoing.length > 0 && <section>
        <p style={{ color: '#fff4d6', fontWeight: 900, margin: '0 0 8px' }}>Pending</p>
        <div style={{ display: 'grid', gap: '8px' }}>{outgoing.map(row => { const person = otherPerson(row); return <div key={row.id} style={{ border: '1px solid rgba(208,169,72,.25)', borderRadius: '12px', padding: '10px' }}><strong>{person?.display_name || person?.username || 'Player'}</strong>{person?.username ? ` · @${person.username}` : ''}</div>; })}</div>
      </section>}

      {status && <p className="status-line">{status}</p>}
    </div>
  </div>;
}

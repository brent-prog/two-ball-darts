'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { getOwnerKey } from '@/lib/storage';

const PAGE_SIZE = 5;
const holes = Array.from({ length: 18 }, (_, index) => index + 1);

const fmt = score => {
  const value = Number(score) || 0;
  if (value === 0) return 'E';
  return value > 0 ? `+${value}` : `${value}`;
};

function scoreForHole(row, hole) {
  return row.hole_scores?.find(score => Number(score.hole_number) === hole) ?? null;
}

function completeRound(game) {
  const rows = game.game_players ?? [];
  return rows.length > 0 && rows.every(row => new Set((row.hole_scores ?? []).map(score => Number(score.hole_number))).size === 18);
}

function roundWinners(game) {
  const rows = game.game_players ?? [];
  if (!rows.length || !completeRound(game)) return [];
  const best = Math.min(...rows.map(row => Number(row.total_score) || 0));
  return rows.filter(row => (Number(row.total_score) || 0) === best);
}

function personalStats(row) {
  const scores = row?.hole_scores ?? [];
  if (!scores.length) return null;
  const parBetter = scores.filter(score => Number(score.relative_score) <= 0).length;
  const birdiesPlus = scores.filter(score => Number(score.relative_score) <= -1).length;
  const bogeysPlus = scores.filter(score => Number(score.relative_score) >= 1).length;
  return {
    parBetterPct: Math.round((parBetter / scores.length) * 100),
    birdiesPlus,
    bogeysPlus
  };
}

function scoreLabel(score) {
  if (!score) return '—';
  return fmt(Number(score.relative_score) || 0);
}

function ScorecardModal({ game, onClose }) {
  if (!game) return null;
  return <div style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(0,0,0,.84)', padding: '16px', display: 'grid', placeItems: 'center' }}>
    <div className="card" style={{ width: 'min(1120px,96vw)', maxHeight: '90vh', overflow: 'auto', margin: 0, borderColor: '#d0a948' }}>
      <div className="section-heading compact" style={{ marginBottom: '14px', alignItems: 'flex-start' }}>
        <div><p className="eyebrow">Round scorecard</p><h2 style={{ fontSize: 'clamp(1.8rem,6vw,3rem)' }}>{new Date(game.played_at).toLocaleDateString()}</h2></div>
        <button className="button secondary" type="button" onClick={onClose}>Close</button>
      </div>
      <div className="scorecard-table-wrap">
        <table className="scorecard-table">
          <thead><tr><th>Player</th><th>Total</th>{holes.map(hole => <th key={hole}>{hole}</th>)}</tr></thead>
          <tbody>{(game.game_players ?? []).map(row => <tr key={row.id}><th>{row.players?.display_name || 'Player'}</th><td className="total-score">{fmt(row.total_score)}</td>{holes.map(hole => <td key={hole}>{scoreLabel(scoreForHole(row, hole))}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </div>
  </div>;
}

function StatChip({ label, value }) {
  return <div style={{ border: '1px solid rgba(208,169,72,.46)', borderRadius: '14px', padding: '10px 8px', textAlign: 'center', background: 'rgba(0,0,0,.16)' }}>
    <strong style={{ display: 'block', color: '#fff4d6', fontSize: '1.15rem', lineHeight: 1 }}>{value}</strong>
    <span style={{ display: 'block', marginTop: '5px', fontSize: '.72rem', opacity: .7, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</span>
  </div>;
}

function RoundCard({ game, accountPlayerId, onView, onResume, onDiscard, discarding }) {
  const players = [...(game.game_players ?? [])].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  const winners = roundWinners(game);
  const isComplete = completeRound(game);
  const me = players.find(row => row.player_id === accountPlayerId) ?? null;
  const stats = personalStats(me);
  const winnerNames = winners.map(row => row.players?.display_name || 'Player');
  const winnerScore = winners[0] ? fmt(winners[0].total_score) : null;

  return <article style={{ border: '1px solid rgba(208,169,72,.5)', borderRadius: '20px', padding: '16px', background: 'linear-gradient(180deg, rgba(6,57,39,.72), rgba(2,20,15,.9))', boxShadow: '0 12px 30px rgba(0,0,0,.2)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
      <div>
        <span style={{ display: 'block', color: '#d0a948', fontSize: '.76rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.08em' }}>{new Date(game.played_at).toLocaleDateString()}</span>
        <strong style={{ display: 'block', marginTop: '4px', color: '#fff4d6', fontSize: '1.05rem' }}>{isComplete ? 'Official 18' : 'Incomplete Round'}</strong>
      </div>
      <button className="button secondary" type="button" onClick={() => onView(game)} style={{ minHeight: '38px', padding: '7px 11px', borderRadius: '11px', fontSize: '.8rem' }}>Scorecard</button>
    </div>

    <div style={{ marginTop: '14px', padding: '12px 14px', borderRadius: '15px', background: winners.length ? 'rgba(208,169,72,.16)' : 'rgba(255,255,255,.04)', border: '1px solid rgba(208,169,72,.32)' }}>
      {winners.length ? <><span style={{ display: 'block', fontSize: '.72rem', fontWeight: 900, color: '#d0a948', textTransform: 'uppercase', letterSpacing: '.09em' }}>{winners.length > 1 ? 'Tie' : 'Winner'}</span><strong style={{ display: 'block', marginTop: '3px', color: '#fff4d6', fontSize: '1.35rem' }}>{winnerNames.join(' & ')} <span style={{ color: '#d0a948' }}>{winnerScore}</span></strong></> : <strong style={{ color: '#fff4d6' }}>Round in progress</strong>}
    </div>

    <div style={{ display: 'grid', gap: '8px', marginTop: '14px' }}>
      {players.map(row => {
        const isWinner = winners.some(winner => winner.id === row.id);
        const isMe = row.player_id === accountPlayerId;
        return <div key={row.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '12px', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid rgba(255,244,214,.09)' }}><span style={{ fontWeight: isWinner || isMe ? 900 : 700, color: isWinner ? '#fff4d6' : 'inherit' }}>{row.players?.display_name || 'Player'}{isMe ? ' · You' : ''}</span><strong style={{ fontSize: '1.08rem', color: isWinner ? '#d0a948' : '#fff4d6' }}>{fmt(row.total_score)}</strong></div>;
      })}
    </div>

    {stats && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '8px', marginTop: '14px' }}><StatChip label="Par+" value={`${stats.parBetterPct}%`} /><StatChip label="Birdies+" value={stats.birdiesPlus} /><StatChip label="Bogeys+" value={stats.bogeysPlus} /></div>}

    {!isComplete && <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '8px', marginTop: '14px' }}>
      <button className="button primary" type="button" onClick={() => onResume(game)}>Resume Round</button>
      <button className="button ghost" type="button" disabled={discarding} onClick={() => onDiscard(game)} style={{ minHeight: '44px', padding: '8px 12px' }}>{discarding ? 'Discarding...' : 'Discard'}</button>
    </div>}
  </article>;
}

export default function RoundHistoryCards() {
  const [target, setTarget] = useState(null);
  const [games, setGames] = useState([]);
  const [accountPlayerId, setAccountPlayerId] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedGame, setSelectedGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [discardingId, setDiscardingId] = useState(null);
  const lastSaveMessageRef = useRef('');

  function suppressLegacy(section) {
    if (!section) return;
    const list = section.querySelector('.history-list');
    if (list) list.style.display = 'none';
    const status = section.querySelector('.status-line');
    if (status) status.style.display = 'none';
    const legacyMore = section.querySelector('[data-tbd-round-history-more]');
    if (legacyMore) legacyMore.style.display = 'none';
  }

  useEffect(() => {
    let cancelled = false;
    let timer = null;
    let sectionObserver = null;

    function findTarget() {
      const section = [...document.querySelectorAll('section.card')].find(node => node.querySelector('h2')?.textContent?.trim() === 'Round History');
      if (!section) return false;
      suppressLegacy(section);
      sectionObserver = new MutationObserver(() => suppressLegacy(section));
      sectionObserver.observe(section, { childList: true, subtree: true });
      if (!cancelled) setTarget(section);
      return true;
    }

    if (!findTarget()) timer = window.setInterval(() => { if (findTarget() && timer) { window.clearInterval(timer); timer = null; } }, 300);
    return () => { cancelled = true; if (timer) window.clearInterval(timer); sectionObserver?.disconnect(); };
  }, []);

  async function loadGames() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user ?? null;
    let roundGames = [];
    let canonicalPlayerId = null;

    if (user) {
      const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).maybeSingle();
      if (profile?.id) {
        const { data: player } = await supabase.from('players').select('id').eq('profile_id', profile.id).order('created_at', { ascending: true }).limit(1).maybeSingle();
        canonicalPlayerId = player?.id ?? null;
      }
      if (canonicalPlayerId) {
        const { data: participations } = await supabase.from('game_players').select('game_id').eq('player_id', canonicalPlayerId).limit(100);
        const gameIds = [...new Set((participations ?? []).map(row => row.game_id).filter(Boolean))];
        if (gameIds.length) {
          const { data } = await supabase.from('games').select('id,title,played_at,course_name').in('id', gameIds).order('played_at', { ascending: false }).limit(50);
          roundGames = data ?? [];
        }
      }
    } else {
      const ownerKey = getOwnerKey();
      const { data } = await supabase.from('games').select('id,title,played_at,course_name').eq('owner_key', ownerKey).order('played_at', { ascending: false }).limit(50);
      roundGames = data ?? [];
    }

    if (roundGames.length) {
      const ids = roundGames.map(game => game.id);
      const { data: rows } = await supabase.from('game_players').select('id,game_id,player_id,display_order,total_score,total_strokes,players(id,display_name,is_profile),hole_scores(hole_number,relative_score,strokes,result)').in('game_id', ids).order('display_order', { ascending: true });
      roundGames = roundGames.map(game => ({ ...game, game_players: (rows ?? []).filter(row => row.game_id === game.id) })).filter(game => game.game_players.length > 0);
    }

    setAccountPlayerId(canonicalPlayerId);
    setGames(roundGames);
    setVisibleCount(PAGE_SIZE);
    setLoading(false);
    if (target) suppressLegacy(target);
  }

  useEffect(() => {
    loadGames();
    const refresh = () => loadGames();
    window.addEventListener('focus', refresh);
    const { data: authListener } = supabase.auth.onAuthStateChange(() => window.setTimeout(loadGames, 50));

    const scorecard = document.querySelector('#scorecard');
    const saveObserver = scorecard ? new MutationObserver(() => {
      const statuses = [...scorecard.querySelectorAll('.status-line')];
      const saveMessage = statuses.map(node => node.textContent?.trim() || '').find(value => /^Round saved as /i.test(value));
      if (saveMessage && saveMessage !== lastSaveMessageRef.current) {
        lastSaveMessageRef.current = saveMessage;
        window.setTimeout(loadGames, 150);
      }
    }) : null;
    if (scorecard && saveObserver) saveObserver.observe(scorecard, { childList: true, subtree: true, characterData: true });

    return () => {
      window.removeEventListener('focus', refresh);
      authListener?.subscription?.unsubscribe();
      saveObserver?.disconnect();
    };
  }, []);

  function resumeGame(game) {
    const rows = [...document.querySelectorAll('.history-list .history-row')];
    const row = rows.find(item => item.querySelector('strong')?.textContent?.trim() === game.title);
    const button = row ? [...row.querySelectorAll('button')].find(item => item.textContent?.trim() === 'Resume Round') : null;
    if (button) {
      button.click();
      return;
    }
    window.alert('Could not resume this round from the current screen. Refresh and try again.');
  }

  async function discardGame(game) {
    if (!window.confirm('Discard this incomplete round? This permanently deletes its saved scores.')) return;
    setDiscardingId(game.id);
    const { error } = await supabase.from('games').delete().eq('id', game.id);
    setDiscardingId(null);
    if (error) {
      window.alert(`Could not discard round: ${error.message}`);
      return;
    }
    if (selectedGame?.id === game.id) setSelectedGame(null);
    await loadGames();
  }

  const visibleGames = useMemo(() => games.slice(0, visibleCount), [games, visibleCount]);
  if (!target) return null;

  return createPortal(<>
    <div data-tbd-rich-round-history style={{ display: 'grid', gap: '12px', marginTop: '4px' }}>
      {loading && <p style={{ opacity: .72 }}>Loading rounds...</p>}
      {!loading && !games.length && <p style={{ opacity: .72 }}>No rounds yet.</p>}
      {visibleGames.map(game => <RoundCard key={game.id} game={game} accountPlayerId={accountPlayerId} onView={setSelectedGame} onResume={resumeGame} onDiscard={discardGame} discarding={discardingId === game.id} />)}
      {games.length > visibleCount && <button className="button secondary" type="button" onClick={() => setVisibleCount(count => count + PAGE_SIZE)} style={{ width: '100%', marginTop: '2px', minHeight: '48px', borderRadius: '14px' }}>Load More</button>}
    </div>
    <ScorecardModal game={selectedGame} onClose={() => setSelectedGame(null)} />
  </>, target);
}

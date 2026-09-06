'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

const fmt = score => score === 0 ? 'E' : score > 0 ? `+${score}` : `${score}`;
const isComplete = row => new Set((row?.hole_scores ?? []).map(score => score.hole_number)).size === 18;

const scoringLabels = [
  ['eagle', 'Eagles', '-2'],
  ['birdie', 'Birdies', '-1'],
  ['par', 'Pars', 'E'],
  ['bogey', 'Bogeys', '+1'],
  ['double_bogey', 'Double Bogeys', '+2'],
  ['triple_bogey', 'Triple Bogeys', '+3']
];

export default function PlayerProfileStats({ profile, onBack }) {
  const [rows, setRows] = useState([]);
  const [fieldRows, setFieldRows] = useState([]);
  const [myPlayer, setMyPlayer] = useState(null);
  const [sharedRows, setSharedRows] = useState([]);
  const [status, setStatus] = useState('Loading profile...');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus('Loading profile...');
      setMyPlayer(null);
      setSharedRows([]);

      const { data, error } = await supabase
        .from('game_players')
        .select('id,game_id,total_score,total_strokes,games(id,title,played_at,course_name),hole_scores(hole_number,result,relative_score)')
        .eq('player_id', profile.id)
        .order('id', { ascending: false });

      if (cancelled) return;
      if (error) {
        setStatus(error.message);
        return;
      }

      const playerRows = data ?? [];
      setRows(playerRows);

      const gameIds = [...new Set(playerRows.map(row => row.game_id).filter(Boolean))];
      if (gameIds.length) {
        const { data: allPlayers, error: fieldError } = await supabase
          .from('game_players')
          .select('game_id,player_id,total_score,hole_scores(hole_number)')
          .in('game_id', gameIds);

        if (cancelled) return;
        if (fieldError) {
          setStatus(fieldError.message);
          return;
        }
        setFieldRows(allPlayers ?? []);
      } else {
        setFieldRows([]);
      }

      // Social stats only apply to account-linked players. Saved Guests have no profile_id.
      if (profile.profile_id) {
        const { data: userData } = await supabase.auth.getUser();
        const authUser = userData?.user ?? null;

        if (authUser) {
          const { data: ownProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', authUser.id)
            .maybeSingle();

          if (cancelled) return;

          if (ownProfile?.id && ownProfile.id !== profile.profile_id) {
            const { data: ownPlayer } = await supabase
              .from('players')
              .select('id,display_name,profile_id')
              .eq('profile_id', ownProfile.id)
              .eq('is_profile', true)
              .order('created_at', { ascending: true })
              .limit(1)
              .maybeSingle();

            if (cancelled) return;

            if (ownPlayer?.id) {
              setMyPlayer(ownPlayer);

              const friendCompleteGameIds = playerRows.filter(isComplete).map(row => row.game_id);
              if (friendCompleteGameIds.length) {
                const { data: mine, error: mineError } = await supabase
                  .from('game_players')
                  .select('id,game_id,total_score,total_strokes,games(id,title,played_at,course_name),hole_scores(hole_number,result,relative_score)')
                  .eq('player_id', ownPlayer.id)
                  .in('game_id', friendCompleteGameIds);

                if (cancelled) return;
                if (mineError) {
                  setStatus(mineError.message);
                  return;
                }

                const friendByGame = new Map(playerRows.filter(isComplete).map(row => [row.game_id, row]));
                const shared = (mine ?? [])
                  .filter(isComplete)
                  .map(myRow => ({
                    game_id: myRow.game_id,
                    game: myRow.games,
                    mine: myRow,
                    theirs: friendByGame.get(myRow.game_id)
                  }))
                  .filter(item => item.theirs)
                  .sort((a, b) => new Date(b.game?.played_at || 0) - new Date(a.game?.played_at || 0));

                setSharedRows(shared);
              }
            }
          }
        }
      }

      setStatus('');
    }

    load();
    return () => { cancelled = true; };
  }, [profile.id, profile.profile_id]);

  const stats = useMemo(() => {
    const completeRows = rows.filter(isComplete);
    const gameFields = new Map();
    fieldRows.forEach(row => {
      if (!isComplete(row)) return;
      if (!gameFields.has(row.game_id)) gameFields.set(row.game_id, []);
      gameFields.get(row.game_id).push(row);
    });

    let wins = 0;
    completeRows.forEach(row => {
      const field = gameFields.get(row.game_id) ?? [];
      if (!field.length) return;
      const scores = field.map(item => Number(item.total_score));
      const best = Math.min(...scores);
      const leaders = field.filter(item => Number(item.total_score) === best);
      if (Number(row.total_score) === best && leaders.length === 1) wins += 1;
    });

    const scores = completeRows.map(row => Number(row.total_score)).filter(Number.isFinite);
    const average = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
    const best = scores.length ? Math.min(...scores) : null;

    const breakdown = { eagle: 0, birdie: 0, par: 0, bogey: 0, double_bogey: 0, triple_bogey: 0 };

    rows.forEach(row => {
      (row.hole_scores ?? []).forEach(score => {
        if (score.result && Object.prototype.hasOwnProperty.call(breakdown, score.result)) {
          breakdown[score.result] += 1;
          return;
        }
        const relative = Number(score.relative_score);
        if (relative === -2) breakdown.eagle += 1;
        else if (relative === -1) breakdown.birdie += 1;
        else if (relative === 0) breakdown.par += 1;
        else if (relative === 1) breakdown.bogey += 1;
        else if (relative === 2) breakdown.double_bogey += 1;
        else if (relative === 3) breakdown.triple_bogey += 1;
      });
    });

    const totalHoles = Object.values(breakdown).reduce((sum, count) => sum + count, 0);
    const underParRounds = completeRows.filter(row => Number(row.total_score) < 0).length;
    const evenParRounds = completeRows.filter(row => Number(row.total_score) === 0).length;
    const overParRounds = completeRows.filter(row => Number(row.total_score) > 0).length;
    const bogeyFreeRounds = completeRows.filter(row => (row.hole_scores ?? []).every(score => Number(score.relative_score) <= 0)).length;

    return {
      rounds: completeRows.length,
      wins,
      average,
      best,
      breakdown,
      totalHoles,
      underParRounds,
      evenParRounds,
      overParRounds,
      bogeyFreeRounds,
      history: [...rows].sort((a, b) => new Date(b.games?.played_at || 0) - new Date(a.games?.played_at || 0)).slice(0, 8)
    };
  }, [rows, fieldRows]);

  const headToHead = useMemo(() => {
    let myWins = 0;
    let theirWins = 0;
    let ties = 0;
    let myTotal = 0;
    let theirTotal = 0;

    sharedRows.forEach(item => {
      const mine = Number(item.mine.total_score);
      const theirs = Number(item.theirs.total_score);
      myTotal += mine;
      theirTotal += theirs;
      if (mine < theirs) myWins += 1;
      else if (theirs < mine) theirWins += 1;
      else ties += 1;
    });

    return {
      rounds: sharedRows.length,
      myWins,
      theirWins,
      ties,
      myAverage: sharedRows.length ? myTotal / sharedRows.length : null,
      theirAverage: sharedRows.length ? theirTotal / sharedRows.length : null,
      lastPlayed: sharedRows[0]?.game?.played_at ?? null
    };
  }, [sharedRows]);

  return (
    <div>
      <div className="section-heading compact" style={{ marginBottom: '14px', alignItems: 'flex-start' }}>
        <div>
          <p className="eyebrow">{myPlayer ? 'Friend Profile' : 'Player Profile'}</p>
          <h2 style={{ fontSize: 'clamp(2rem, 7vw, 3.4rem)' }}>{profile.display_name}</h2>
        </div>
        <button className="button secondary" onClick={onBack}>Back</button>
      </div>

      {status && <p className="status-line">{status}</p>}

      {myPlayer && <div style={{ marginBottom: '20px', paddingBottom: '18px', borderBottom: '1px solid rgba(208,169,72,.28)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'baseline', marginBottom: '10px' }}>
          <p style={{ margin: 0, color: '#fff4d6', fontWeight: 900 }}>Head-to-Head</p>
          <span style={{ opacity: .68, fontSize: '.78rem', fontWeight: 800 }}>Completed 18-hole rounds together</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '8px' }}>
          <div className="card" style={{ margin: 0, padding: '12px', textAlign: 'center' }}><span style={{ display: 'block', opacity: .72, fontSize: '.76rem', fontWeight: 900, textTransform: 'uppercase' }}>Rounds Together</span><strong style={{ display: 'block', marginTop: '4px', fontSize: '1.5rem' }}>{headToHead.rounds}</strong></div>
          <div className="card" style={{ margin: 0, padding: '12px', textAlign: 'center' }}><span style={{ display: 'block', opacity: .72, fontSize: '.76rem', fontWeight: 900, textTransform: 'uppercase' }}>Record</span><strong style={{ display: 'block', marginTop: '4px', fontSize: '1.5rem' }}>{headToHead.myWins}-{headToHead.theirWins}-{headToHead.ties}</strong><span style={{ display: 'block', marginTop: '2px', opacity: .62, fontSize: '.72rem' }}>You - {profile.display_name} - Ties</span></div>
          <div className="card" style={{ margin: 0, padding: '12px', textAlign: 'center' }}><span style={{ display: 'block', opacity: .72, fontSize: '.76rem', fontWeight: 900, textTransform: 'uppercase' }}>Your Avg Together</span><strong style={{ display: 'block', marginTop: '4px', fontSize: '1.5rem' }}>{headToHead.myAverage === null ? '-' : fmt(Math.round(headToHead.myAverage * 10) / 10)}</strong></div>
          <div className="card" style={{ margin: 0, padding: '12px', textAlign: 'center' }}><span style={{ display: 'block', opacity: .72, fontSize: '.76rem', fontWeight: 900, textTransform: 'uppercase' }}>{profile.display_name} Avg Together</span><strong style={{ display: 'block', marginTop: '4px', fontSize: '1.5rem' }}>{headToHead.theirAverage === null ? '-' : fmt(Math.round(headToHead.theirAverage * 10) / 10)}</strong></div>
        </div>

        <p style={{ margin: '8px 0 0', opacity: .66, fontSize: '.78rem' }}>{headToHead.lastPlayed ? `Last played together ${new Date(headToHead.lastPlayed).toLocaleDateString()}.` : 'No completed rounds together yet.'} Multi-player rounds count as head-to-head between the two of you.</p>

        {sharedRows.length > 0 && <>
          <p style={{ margin: '16px 0 9px', color: '#fff4d6', fontWeight: 900 }}>Recent Rounds Together</p>
          <div style={{ display: 'grid', gap: '8px' }}>
            {sharedRows.slice(0, 6).map(item => {
              const mine = Number(item.mine.total_score);
              const theirs = Number(item.theirs.total_score);
              const result = mine < theirs ? 'You won' : theirs < mine ? `${profile.display_name} won` : 'Tie';
              return <div key={item.game_id} style={{ border: '1px solid rgba(208,169,72,.38)', borderRadius: '14px', padding: '10px 12px', background: 'rgba(0,0,0,.18)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'baseline' }}>
                  <strong>{item.game?.title || 'Two Ball Darts'}</strong>
                  <strong style={{ color: '#d0a948' }}>{result}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '4px', fontSize: '.84rem' }}>
                  <span>You {fmt(mine)}</span>
                  <span>{profile.display_name} {fmt(theirs)}</span>
                </div>
                <span style={{ display: 'block', marginTop: '3px', opacity: .66, fontSize: '.78rem' }}>{item.game?.played_at ? new Date(item.game.played_at).toLocaleDateString() : 'Date unavailable'}</span>
              </div>;
            })}
          </div>
        </>}
      </div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '10px', marginBottom: '18px' }}>
        <div className="card" style={{ margin: 0, padding: '12px', textAlign: 'center' }}><span style={{ display: 'block', opacity: .72, fontSize: '.78rem', fontWeight: 900, textTransform: 'uppercase' }}>Rounds</span><strong style={{ display: 'block', marginTop: '4px', fontSize: '1.6rem' }}>{stats.rounds}</strong></div>
        <div className="card" style={{ margin: 0, padding: '12px', textAlign: 'center' }}><span style={{ display: 'block', opacity: .72, fontSize: '.78rem', fontWeight: 900, textTransform: 'uppercase' }}>Wins</span><strong style={{ display: 'block', marginTop: '4px', fontSize: '1.6rem' }}>{stats.wins}</strong></div>
        <div className="card" style={{ margin: 0, padding: '12px', textAlign: 'center' }}><span style={{ display: 'block', opacity: .72, fontSize: '.78rem', fontWeight: 900, textTransform: 'uppercase' }}>Best Round</span><strong style={{ display: 'block', marginTop: '4px', fontSize: '1.6rem' }}>{stats.best === null ? '-' : fmt(stats.best)}</strong></div>
        <div className="card" style={{ margin: 0, padding: '12px', textAlign: 'center' }}><span style={{ display: 'block', opacity: .72, fontSize: '.78rem', fontWeight: 900, textTransform: 'uppercase' }}>Avg Score</span><strong style={{ display: 'block', marginTop: '4px', fontSize: '1.6rem' }}>{stats.average === null ? '-' : fmt(Math.round(stats.average * 10) / 10)}</strong></div>
      </div>

      <div style={{ marginBottom: '18px' }}>
        <p style={{ margin: '0 0 10px', color: '#fff4d6', fontWeight: 900 }}>Round Quality</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '8px' }}>
          <div style={{ border: '1px solid rgba(208,169,72,.38)', borderRadius: '14px', padding: '10px 11px', background: 'rgba(0,0,0,.18)' }}><span style={{ display: 'block', opacity: .72, fontSize: '.76rem', fontWeight: 900, textTransform: 'uppercase' }}>Bogey-Free</span><strong style={{ display: 'block', marginTop: '4px', fontSize: '1.5rem' }}>{stats.bogeyFreeRounds}</strong></div>
          <div style={{ border: '1px solid rgba(208,169,72,.38)', borderRadius: '14px', padding: '10px 11px', background: 'rgba(0,0,0,.18)' }}><span style={{ display: 'block', opacity: .72, fontSize: '.76rem', fontWeight: 900, textTransform: 'uppercase' }}>Under Par</span><strong style={{ display: 'block', marginTop: '4px', fontSize: '1.5rem' }}>{stats.underParRounds}</strong></div>
          <div style={{ border: '1px solid rgba(208,169,72,.38)', borderRadius: '14px', padding: '10px 11px', background: 'rgba(0,0,0,.18)' }}><span style={{ display: 'block', opacity: .72, fontSize: '.76rem', fontWeight: 900, textTransform: 'uppercase' }}>Even Par</span><strong style={{ display: 'block', marginTop: '4px', fontSize: '1.5rem' }}>{stats.evenParRounds}</strong></div>
          <div style={{ border: '1px solid rgba(208,169,72,.38)', borderRadius: '14px', padding: '10px 11px', background: 'rgba(0,0,0,.18)' }}><span style={{ display: 'block', opacity: .72, fontSize: '.76rem', fontWeight: 900, textTransform: 'uppercase' }}>Over Par</span><strong style={{ display: 'block', marginTop: '4px', fontSize: '1.5rem' }}>{stats.overParRounds}</strong></div>
        </div>
        <p style={{ margin: '7px 0 0', opacity: .62, fontSize: '.75rem' }}>Round-quality stats use completed 18-hole rounds only.</p>
      </div>

      <div style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'baseline', marginBottom: '10px' }}>
          <p style={{ margin: 0, color: '#fff4d6', fontWeight: 900 }}>Scoring Breakdown</p>
          <span style={{ opacity: .68, fontSize: '.78rem', fontWeight: 800 }}>{stats.totalHoles} holes scored</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '8px' }}>
          {scoringLabels.map(([key, label, score]) => {
            const count = stats.breakdown[key];
            const percentage = stats.totalHoles ? Math.round((count / stats.totalHoles) * 100) : 0;
            return <div key={key} style={{ border: '1px solid rgba(208,169,72,.38)', borderRadius: '14px', padding: '10px 11px', background: 'rgba(0,0,0,.18)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'baseline' }}><strong style={{ color: '#fff4d6' }}>{label}</strong><span style={{ color: '#d0a948', fontWeight: 900 }}>{score}</span></div>
              <strong style={{ display: 'block', marginTop: '5px', fontSize: '1.5rem' }}>{count}</strong>
              <span style={{ display: 'block', marginTop: '2px', opacity: .66, fontSize: '.78rem', fontWeight: 800 }}>{percentage}% of holes</span>
            </div>;
          })}
        </div>
      </div>

      <p style={{ margin: '0 0 10px', color: '#fff4d6', fontWeight: 900 }}>Recent Rounds</p>
      <div style={{ display: 'grid', gap: '8px' }}>
        {stats.history.map(row => {
          const holesPlayed = new Set((row.hole_scores ?? []).map(score => score.hole_number)).size;
          const complete = holesPlayed === 18;
          return <div key={row.id} style={{ border: '1px solid rgba(208,169,72,.38)', borderRadius: '14px', padding: '10px 12px', background: 'rgba(0,0,0,.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'baseline' }}><strong>{row.games?.title || 'Two Ball Darts'}</strong><strong style={{ color: '#d0a948' }}>{fmt(Number(row.total_score) || 0)}</strong></div>
            <span style={{ display: 'block', marginTop: '3px', opacity: .72, fontSize: '.82rem' }}>{row.games?.played_at ? new Date(row.games.played_at).toLocaleDateString() : 'Date unavailable'} · {complete ? '18 holes' : `${holesPlayed} holes`}</span>
          </div>;
        })}
        {!status && !stats.history.length && <p style={{ margin: 0, opacity: .72 }}>No rounds recorded for this player yet.</p>}
      </div>
    </div>
  );
}

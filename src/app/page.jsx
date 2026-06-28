'use client';

import { useMemo, useState } from 'react';
import LogoMark from '@/components/LogoMark';
import { holes, scoreResults, totalPar } from '@/lib/brand';
import { answerRuleQuestion } from '@/lib/rules';
import { supabase } from '@/lib/supabase';
import { getOwnerKey } from '@/lib/storage';

const defaults = [
  { id: 'p1', name: 'Player 1', scores: {} },
  { id: 'p2', name: 'Player 2', scores: {} }
];

const scoreByKey = new Map(scoreResults.map(result => [result.key, result]));
const fmt = score => score === 0 ? 'E' : score > 0 ? `+${score}` : `${score}`;
const total = player => holes.reduce((sum, hole) => sum + (scoreByKey.get(player.scores[hole])?.score ?? 0), 0);
const strokes = player => totalPar + total(player);
const side = (player, list) => list.reduce((sum, hole) => sum + (scoreByKey.get(player.scores[hole])?.score ?? 0), 0);

function AllRulesPanel() {
  return (
    <div className="rule-answer" style={{ marginTop: '14px' }}>
      <h3>All Official Rules</h3>
      <p><strong>Basic game:</strong> Play holes 1-18. The hole number is the target. All holes are par 3. Each player throws exactly two darts per hole. Lowest score wins.</p>
      <div style={{ display: 'grid', gap: '10px', margin: '16px 0' }}>
        {scoreResults.map(result => (
          <div key={result.key} style={{ border: '1px solid rgba(208,169,72,.45)', borderRadius: '10px', padding: '10px 12px', background: 'rgba(0,0,0,.14)' }}>
            <strong>{result.label} ({fmt(result.score)})</strong>
            <p style={{ margin: '6px 0 0' }}>{result.description}</p>
          </div>
        ))}
      </div>
      <p><strong>Local rulings:</strong> Only the active hole number counts as a target hit. Everything else is a miss. Bulls count for nothing - ever. A bull is still an on-board miss. Off the board literally means off the board. If a dart sticks anywhere in the cork/board, it is on-board and OK. Worst possible score on any hole is triple bogey.</p>
      <p><strong>Tie-break:</strong> After 18 holes, if players are tied, each tied player throws one dart. Closest to the bullseye wins.</p>
    </div>
  );
}

export default function Home() {
  const [players, setPlayers] = useState(defaults);
  const [activeHole, setActiveHole] = useState(1);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(answerRuleQuestion('bull'));
  const [status, setStatus] = useState('');
  const [history, setHistory] = useState([]);
  const [showAllRules, setShowAllRules] = useState(false);
  const leader = useMemo(() => [...players].sort((a, b) => total(a) - total(b))[0], [players]);

  function updateScore(playerId, score) {
    setPlayers(current => current.map(player => player.id === playerId ? { ...player, scores: { ...player.scores, [activeHole]: score } } : player));
  }

  function updateName(playerId, name) {
    setPlayers(current => current.map(player => player.id === playerId ? { ...player, name } : player));
  }

  async function saveRound() {
    setStatus('Saving round...');
    const ownerKey = getOwnerKey();
    const { data: game, error } = await supabase.from('games').insert({ owner_key: ownerKey, title: `Two Ball Darts - ${new Date().toLocaleDateString()}`, status: 'complete' }).select('id').single();
    if (error || !game) { setStatus(error?.message || 'Could not save round.'); return; }

    for (const [index, player] of players.entries()) {
      const displayName = player.name.trim() || `Player ${index + 1}`;
      const { data: dbPlayer } = await supabase.from('players').upsert({ owner_key: ownerKey, display_name: displayName }, { onConflict: 'owner_key,display_name' }).select('id').single();
      if (!dbPlayer) continue;
      const { data: gp } = await supabase.from('game_players').insert({ game_id: game.id, player_id: dbPlayer.id, display_order: index, total_score: total(player), total_strokes: strokes(player) }).select('id').single();
      if (!gp) continue;
      const rows = holes.map(hole => {
        const key = player.scores[hole];
        const result = scoreByKey.get(key);
        return result ? { game_player_id: gp.id, hole_number: hole, result: key, relative_score: result.score, strokes: result.strokes } : null;
      }).filter(Boolean);
      if (rows.length) await supabase.from('hole_scores').insert(rows);
    }

    setStatus('Round saved to Supabase history.');
    loadHistory();
  }

  async function loadHistory() {
    const ownerKey = getOwnerKey();
    const { data } = await supabase.from('games').select('id,title,played_at,course_name').eq('owner_key', ownerKey).order('played_at', { ascending: false }).limit(8);
    setHistory(data ?? []);
  }

  function askRule() {
    const response = answerRuleQuestion(question);
    setAnswer(response);
    setShowAllRules(false);
    supabase.from('rule_questions').insert({ owner_key: getOwnerKey(), question, matched_rule: response.matchedRule, answer: response.answer }).then(() => undefined);
  }

  return (
    <main className="app-shell">
      <section className="hero-card">
        <LogoMark />
        <div className="hero-copy">
          <p className="eyebrow">18 holes · 2 darts per hole · all holes par 3</p>
          <h1>No gimmes. Just throw.</h1>
          <p>Golf-course scoring for the dartboard. Track a live round, settle rule arguments, and keep your score history.</p>
          <div className="hero-actions"><a href="#scorecard" className="button primary">Start scoring</a><a href="#rules" className="button secondary">Check rules</a></div>
        </div>
      </section>

      <section className="quick-stats" aria-label="Round status and navigation" style={{ position: 'sticky', top: '10px', zIndex: 50, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', backdropFilter: 'blur(12px)' }}>
        <div><span>Current leader</span><strong>{leader.name}</strong></div>
        <div><span>Leader score</span><strong>{fmt(total(leader))}</strong></div>
        <div><span>Strokes</span><strong>{strokes(leader)}</strong></div>
        <div><span>Active hole</span><strong>{activeHole}</strong></div>
        <div className="quick-nav" style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', borderRight: 0 }}><a href="#scorecard" className="button secondary">Scorecard</a><a href="#rules" className="button primary">Check Rules</a></div>
      </section>

      <section className="card" id="scorecard" style={{ paddingTop: '18px' }}>
        <div className="section-heading" style={{ marginBottom: '12px', alignItems: 'center' }}>
          <p className="eyebrow" style={{ margin: 0 }}>Live round</p>
          <div className="actions-inline"><button className="button secondary" onClick={() => setPlayers([...players, { id: crypto.randomUUID(), name: `Player ${players.length + 1}`, scores: {} }])}>Add player</button><button className="button ghost" onClick={() => setPlayers(players.map(p => ({ ...p, scores: {} })))}>Reset</button><button className="button primary" onClick={saveRound}>Save round</button></div>
        </div>
        <div className="hole-picker" style={{ marginBottom: '12px' }}>{holes.map(hole => <button key={hole} className={hole === activeHole ? 'active' : ''} onClick={() => setActiveHole(hole)}>{hole}</button>)}</div>
        <div className="active-hole-panel" style={{ padding: '14px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.55rem', marginBottom: '10px' }}>Hole {activeHole}</h3>
          <div className="player-score-grid">{players.map(player => <div className="player-hole-card" key={player.id}><input style={{ marginBottom: '8px', padding: '10px' }} value={player.name} onChange={e => updateName(player.id, e.target.value)} /> <div className="score-buttons">{scoreResults.map(result => <button key={result.key} style={{ minHeight: '42px', padding: '8px 10px' }} className={player.scores[activeHole] === result.key ? 'selected' : ''} onClick={() => updateScore(player.id, result.key)}><span>{result.label}</span><strong>{fmt(result.score)}</strong></button>)}<button className="clear-score" style={{ minHeight: '40px', padding: '8px 10px' }} onClick={() => updateScore(player.id, '')}>Clear</button></div></div>)}</div>
        </div>
        <div className="scorecard-table-wrap"><table className="scorecard-table"><thead><tr><th>Player</th>{holes.slice(0,9).map(h => <th key={h}>{h}</th>)}<th>OUT</th>{holes.slice(9).map(h => <th key={h}>{h}</th>)}<th>IN</th><th>TOT</th><th>Score</th></tr><tr className="par-row"><th>Par</th>{holes.slice(0,9).map(h => <td key={h}>3</td>)}<td>27</td>{holes.slice(9).map(h => <td key={h}>3</td>)}<td>27</td><td>54</td><td>E</td></tr></thead><tbody>{players.map(player => <tr key={player.id}><th>{player.name}</th>{holes.slice(0,9).map(h => <td key={h}>{scoreByKey.get(player.scores[h])?.score ?? ''}</td>)}<td className="subtotal">{fmt(side(player, holes.slice(0,9)))}</td>{holes.slice(9).map(h => <td key={h}>{scoreByKey.get(player.scores[h])?.score ?? ''}</td>)}<td className="subtotal">{fmt(side(player, holes.slice(9)))}</td><td className="subtotal">{strokes(player)}</td><td className="total-score">{fmt(total(player))}</td></tr>)}</tbody></table></div>{status && <p className="status-line">{status}</p>}
      </section>

      <section className="two-column">
        <div className="card" id="rules">
          <p className="eyebrow">Official rule assistant</p>
          <h2>Ask a rule question</h2>
          <div className="rule-input"><input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Example: single target plus off board?"/><button className="button primary" onClick={askRule}>Ask</button></div>
          <button className="button primary" style={{ marginTop: '2px', boxShadow: '0 0 0 3px rgba(208,169,72,.28)' }} onClick={() => setShowAllRules(current => !current)}>{showAllRules ? 'Hide All Rules' : 'Display All Rules'}</button>
          {showAllRules ? <AllRulesPanel /> : <div className="rule-answer"><h3>{answer.title}</h3><p>{answer.answer}</p><span>Matched rule: {answer.matchedRule}</span></div>}
        </div>
        <div className="card"><div className="section-heading compact"><div><p className="eyebrow">Supabase history</p><h2>Saved rounds</h2></div><button className="button secondary" onClick={loadHistory}>Load</button></div><div className="history-list">{history.map(game => <div className="history-row" key={game.id}><strong>{game.title}</strong><span>{new Date(game.played_at).toLocaleString()} · {game.course_name}</span></div>)}</div></div>
      </section>
    </main>
  );
}

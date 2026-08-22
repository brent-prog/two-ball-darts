'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import LogoMark from '@/components/LogoMark';
import PlayerProfilesModal from '@/components/PlayerProfilesModal';
import { holes, scoreResults } from '@/lib/brand';
import { supabase } from '@/lib/supabase';
import { getOwnerKey } from '@/lib/storage';

const defaults = [
  { id: 'p1', playerId: null, isProfile: false, name: 'Player 1', scores: {} },
  { id: 'p2', playerId: null, isProfile: false, name: 'Player 2', scores: {} }
];

const dartOptions = [
  { value: 'power', label: 'Double / Triple', tone: 'green' },
  { value: 'single', label: 'Single', tone: 'gold' },
  { value: 'safe', label: 'Safe Miss', tone: 'neutral' },
  { value: 'hazard', label: 'Hazard', tone: 'red' }
];

const scoreByKey = new Map(scoreResults.map(result => [result.key, result]));
const scoreKeyByRelative = new Map(scoreResults.map(result => [result.score, result.key]));
const fmt = score => score === 0 ? 'E' : score > 0 ? `+${score}` : `${score}`;
const total = player => holes.reduce((sum, hole) => sum + (scoreByKey.get(player.scores[hole])?.score ?? 0), 0);
const strokes = player => holes.reduce((sum, hole) => sum + (scoreByKey.get(player.scores[hole])?.strokes ?? 0), 0);
const scoredHoleCount = player => holes.filter(hole => scoreByKey.has(player.scores[hole])).length;
const currentRoundComplete = players => players.length > 0 && players.every(player => scoredHoleCount(player) === 18);
const hasRoundScores = players => players.some(player => scoredHoleCount(player) > 0);
const savedRoundPlayers = game => game.game_players ?? [];
const savedRoundPlayerNames = game => savedRoundPlayers(game).map(row => row.players?.display_name).filter(Boolean);
const savedScore = (row, hole) => row.hole_scores?.find(score => score.hole_number === hole) ?? null;
const savedStrokes = row => row.hole_scores?.reduce((sum, score) => sum + (Number(score.strokes) || 0), 0) ?? 0;
const savedSideScore = (row, list) => list.reduce((sum, hole) => sum + (Number(savedScore(row, hole)?.relative_score) || 0), 0);
const savedSideStrokes = (row, list) => list.reduce((sum, hole) => sum + (Number(savedScore(row, hole)?.strokes) || 0), 0);
const savedPlayerHoleCount = row => new Set((row.hole_scores ?? []).map(score => score.hole_number)).size;
const isSavedRoundComplete = game => {
  const rows = savedRoundPlayers(game);
  if (rows.length > 0) return rows.every(row => savedPlayerHoleCount(row) === 18);
  return game.course_name === 'Official 18';
};
const savedRoundLabel = game => isSavedRoundComplete(game) ? 'Official 18' : 'Incomplete round';
const savedRoundSummary = game => {
  const names = savedRoundPlayerNames(game);
  const playerCount = names.length || savedRoundPlayers(game).length;
  return names.length ? `${playerCount} player${playerCount === 1 ? '' : 's'}: ${names.join(', ')}` : `${playerCount} player${playerCount === 1 ? '' : 's'}: names unavailable`;
};
const firstUnscoredHole = players => holes.find(hole => players.some(player => !scoreByKey.has(player.scores[hole]))) ?? 18;
const scoreKeyFromSavedScore = score => {
  if (!score) return '';
  if (score.result && scoreByKey.has(score.result)) return score.result;
  const relative = Number(score.relative_score);
  return scoreKeyByRelative.get(relative) ?? '';
};
const playersFromSavedRows = rows => {
  const restored = (rows ?? []).map((row, index) => {
    const scores = {};
    (row.hole_scores ?? []).forEach(score => {
      const key = scoreKeyFromSavedScore(score);
      const holeNumber = Number(score.hole_number);
      if (key && holes.includes(holeNumber)) scores[holeNumber] = key;
    });
    return {
      id: `saved-${row.id || index}`,
      playerId: row.player_id || row.players?.id || null,
      isProfile: Boolean(row.players?.is_profile),
      name: row.players?.display_name || `Player ${index + 1}`,
      scores
    };
  });
  return restored.length ? restored : defaults;
};

function scoreTwoDarts(dart1, dart2) {
  if (!dart1 || !dart2) return { title: 'Select both darts', matchedRule: 'select_both_darts', scoreKey: '', answer: 'Choose a result for Dart 1 and Dart 2 to calculate the official score.' };
  const darts = [dart1, dart2];
  const power = darts.filter(dart => dart === 'power').length;
  const single = darts.filter(dart => dart === 'single').length;
  const safe = darts.filter(dart => dart === 'safe').length;
  const hazard = darts.filter(dart => dart === 'hazard').length;
  if (power === 2) return { title: 'Eagle', matchedRule: 'eagle', scoreKey: 'eagle', answer: 'Both darts hit DOUBLE/TRIPLE target. Score: EAGLE (-2). Strokes: 1.' };
  if (power === 1 && single === 1) return { title: 'Birdie', matchedRule: 'birdie', scoreKey: 'birdie', answer: 'One DOUBLE/TRIPLE target plus one SINGLE target. Score: BIRDIE (-1). Strokes: 2.' };
  if (single === 2 || (power === 1 && safe === 1)) return { title: 'Par', matchedRule: 'par', scoreKey: 'par', answer: 'Official result is PAR (E). Strokes: 3.' };
  if ((single === 1 && safe === 1) || (power === 1 && hazard === 1)) return { title: 'Bogey', matchedRule: 'bogey', scoreKey: 'bogey', answer: 'Official result is BOGEY (+1). Strokes: 4.' };
  if ((single === 1 && hazard === 1) || safe === 2) return { title: 'Double bogey', matchedRule: 'double_bogey', scoreKey: 'double_bogey', answer: 'Official result is DOUBLE BOGEY (+2). Strokes: 5.' };
  return { title: 'Triple bogey', matchedRule: 'triple_bogey', scoreKey: 'triple_bogey', answer: 'No target hits plus at least one hazard/off-board miss. Score: TRIPLE BOGEY (+3). Strokes: 6.' };
}

function symbolClass(score) {
  if (score === -2) return 'eagle';
  if (score === -1) return 'birdie';
  if (score === 1) return 'bogey';
  if (score === 2) return 'double-bogey';
  if (score === 3) return 'triple-bogey';
  return 'par';
}

function symbolStyle(score) {
  const base = { display: 'inline-grid', placeItems: 'center', minWidth: '34px', height: '34px', padding: '0 6px', color: '#102017', fontWeight: 900, lineHeight: 1, background: 'rgba(255,255,255,.08)' };
  if (score === -2) return { ...base, border: '4px double #102017', borderRadius: '999px' };
  if (score === -1) return { ...base, border: '3px solid #102017', borderRadius: '999px' };
  if (score === 1) return { ...base, border: '3px solid #102017', borderRadius: '2px' };
  if (score === 2) return { ...base, border: '4px double #102017', borderRadius: '2px' };
  if (score === 3) return { ...base, border: '3px solid #102017', borderRadius: '2px', boxShadow: '0 0 0 3px #102017 inset' };
  return base;
}

function getHonoursIndex(players, activeHole) {
  if (activeHole <= 1) return -1;
  let honoursIndex = -1;
  for (let hole = 2; hole <= activeHole; hole += 1) {
    const priorHole = hole - 1;
    const scored = players.map((player, index) => ({ index, score: scoreByKey.get(player.scores[priorHole])?.score })).filter(item => Number.isFinite(item.score));
    if (scored.length !== players.length) continue;
    const best = Math.min(...scored.map(item => item.score));
    const tied = scored.filter(item => item.score === best).map(item => item.index);
    if (tied.length === 1) honoursIndex = tied[0];
    else if (!tied.includes(honoursIndex)) honoursIndex = -1;
  }
  return honoursIndex;
}

function ScoreCell({ result }) {
  if (!result) return <td></td>;
  return <td style={{ padding: '6px 4px' }}><span className={`score-symbol ${symbolClass(result.score)}`} style={symbolStyle(result.score)}>{result.strokes}</span></td>;
}

function SavedScoreCell({ score }) {
  if (!score) return <td></td>;
  const relativeScore = Number(score.relative_score);
  return <td style={{ padding: '6px 4px' }}><span className={`score-symbol ${symbolClass(relativeScore)}`} style={symbolStyle(relativeScore)}>{score.strokes}</span></td>;
}

function LiveScorecard({ players }) {
  return <div className="scorecard-table-wrap"><table className="scorecard-table"><thead><tr><th>Player</th><th>Score</th>{holes.map(hole => <th key={hole}>{hole}</th>)}</tr><tr className="par-row"><th>Par</th><td>E</td>{holes.map(hole => <td key={hole}>3</td>)}</tr></thead><tbody>{players.map(player => <tr key={player.id}><th>{player.name}</th><td className="total-score">{fmt(total(player))}</td>{holes.map(hole => <ScoreCell key={hole} result={scoreByKey.get(player.scores[hole])} />)}</tr>)}</tbody></table></div>;
}

function SavedScorecard({ game, rows, onClose }) {
  if (!game || !rows?.length) return null;
  return <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.78)', padding: '24px', display: 'grid', placeItems: 'center' }}><div className="card" style={{ width: 'min(1180px, 96vw)', maxHeight: '90vh', overflow: 'auto', margin: 0 }}><div className="section-heading compact" style={{ marginBottom: '14px', alignItems: 'flex-start' }}><div><p className="eyebrow">Viewing saved round</p><h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.6rem)' }}>{game.title}</h2><p style={{ margin: '6px 0 0' }}>{new Date(game.played_at).toLocaleString()}</p></div><button className="button primary" onClick={onClose}>Close</button></div><div className="scorecard-table-wrap"><table className="scorecard-table"><thead><tr><th>Player</th>{holes.slice(0,9).map(h => <th key={h}>{h}</th>)}<th>OUT</th>{holes.slice(9).map(h => <th key={h}>{h}</th>)}<th>IN</th><th>TOT</th><th>Score</th></tr><tr className="par-row"><th>Par</th>{holes.slice(0,9).map(h => <td key={h}>3</td>)}<td>27</td>{holes.slice(9).map(h => <td key={h}>3</td>)}<td>27</td><td>54</td><td>E</td></tr></thead><tbody>{rows.map(row => <tr key={row.id}><th>{row.players?.display_name || 'Player'}</th>{holes.slice(0,9).map(h => <SavedScoreCell key={h} score={savedScore(row, h)} />)}<td className="subtotal">{savedSideStrokes(row, holes.slice(0,9))}</td>{holes.slice(9).map(h => <SavedScoreCell key={h} score={savedScore(row, h)} />)}<td className="subtotal">{savedSideStrokes(row, holes.slice(9))}</td><td className="subtotal">{savedStrokes(row)}</td><td className="total-score">{fmt(savedSideScore(row, holes))}</td></tr>)}</tbody></table></div></div></div>;
}

function HowToPlayModal({ onClose }) {
  const cheatRows = [
    ['Eagle', 'Both darts hit double/triple target', '-2'],
    ['Birdie', 'One double/triple target + one single target', '-1'],
    ['Par', 'Two singles OR double/triple target + safe on-board miss', 'E'],
    ['Bogey', 'Single target + safe on-board miss OR double/triple target + hazard', '+1'],
    ['Double Bogey', 'No target hits with both darts safe on-board OR single target + hazard', '+2'],
    ['Triple Bogey', 'No target hits + at least one hazard', '+3']
  ];
  return <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.78)', padding: '20px', display: 'grid', placeItems: 'center' }}><div className="card" style={{ width: 'min(760px, 96vw)', maxHeight: '90vh', overflow: 'auto', margin: 0, borderColor: '#d0a948' }}><div className="section-heading compact" style={{ marginBottom: '14px', alignItems: 'flex-start' }}><div><p className="eyebrow">Quick start</p><h2 style={{ fontSize: 'clamp(2rem, 6vw, 3.8rem)' }}>How to Play</h2></div><button className="button primary" onClick={onClose}>Close</button></div><div className="rule-answer" style={{ borderLeftColor: '#d0a948' }}><h3>Two Ball Darts is golf scoring on a dartboard.</h3><ol style={{ display: 'grid', gap: '10px', margin: '12px 0 0', paddingLeft: '22px', lineHeight: 1.45 }}><li>Play holes 1 through 18. The hole number is your target.</li><li>Each player throws two darts at that number.</li><li>Hazards are red bull, green bull, 19, 20, or completely off the board.</li><li>Lowest score after 18 holes wins.</li></ol></div><div style={{ marginTop: '16px' }}><p className="eyebrow">Scoring cheat sheet</p><div style={{ display: 'grid', gap: '8px' }}>{cheatRows.map(([label, description, score]) => <div key={label} style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 150px) 1fr 58px', gap: '10px', alignItems: 'center', border: '1px solid rgba(208,169,72,.45)', borderRadius: '12px', padding: '10px', background: 'rgba(0,0,0,.18)' }}><strong style={{ color: '#fff4d6' }}>{label}</strong><span style={{ lineHeight: 1.35 }}>{description}</span><strong style={{ color: '#d0a948', textAlign: 'right' }}>{score}</strong></div>)}</div></div></div></div>;
}

function ScoringMenu({ isOpen, setIsOpen, addPlayer, removePlayer, canRemovePlayer, resetRound, saveRound, saveDisabled, saveLabel, exitScoring }) {
  const menuRef = useRef(null);
  useEffect(() => {
    if (!isOpen) return;
    function closeOnOutside(event) {
      if (!menuRef.current || menuRef.current.contains(event.target)) return;
      setIsOpen(false);
    }
    document.addEventListener('pointerdown', closeOnOutside, true);
    return () => document.removeEventListener('pointerdown', closeOnOutside, true);
  }, [isOpen, setIsOpen]);

  return <div ref={menuRef} style={{ position: 'relative' }}>
    <button className="button secondary" aria-label="Scoring menu" aria-expanded={isOpen} onClick={() => setIsOpen(current => !current)} style={{ minWidth: '58px', padding: '11px 14px', fontSize: '1.35rem', lineHeight: 1 }}>☰</button>
    {isOpen && <div style={{ position: 'absolute', zIndex: 280, top: 'calc(100% + 8px)', left: 0, width: 'min(300px, 82vw)', border: '2px solid #d0a948', borderRadius: '18px', background: '#02140f', boxShadow: '0 18px 40px rgba(0,0,0,.46)', padding: '8px', display: 'grid', gap: '8px' }}>
      <button className="button secondary" onClick={() => { setIsOpen(false); addPlayer(); }}>Add Player</button>
      <button className="button secondary" disabled={!canRemovePlayer} onClick={() => { setIsOpen(false); removePlayer(); }}>Remove Player</button>
      <button className="button secondary" disabled={saveDisabled} onClick={() => { setIsOpen(false); saveRound(); }}>{saveLabel}</button>
      <button className="button ghost" onClick={() => { setIsOpen(false); resetRound(); }}>Reset Round</button>
      <button className="button primary" onClick={() => { setIsOpen(false); exitScoring(); }}>Exit Scoring</button>
    </div>}
  </div>;
}

function PlayerScoringRow({ player, result, totalScore, isLeader, hasHonours, openScore, updateName }) {
  const scored = Boolean(result);
  const scoreLabel = scored ? `${result.label} ${fmt(result.score)}` : 'No score yet';
  const buttonLabel = scored ? `${result.label} ${fmt(result.score)}` : 'Add Score';
  const badgeClasses = ['tbd-player-total-score'];
  if (!scored && totalScore === 0) badgeClasses.push('is-empty-round');
  if (isLeader && scored) badgeClasses.push('is-leader');
  if (totalScore < 0) badgeClasses.push('is-under');
  if (totalScore > 0) badgeClasses.push('is-over');
  if (totalScore === 0 && scored) badgeClasses.push('is-even');

  return <div className={`tbd-player-score-row ${scored ? 'scored' : ''} ${hasHonours ? 'has-honours' : ''}`}>
    <div className="tbd-player-score-main">
      <div className="tbd-player-name-line">
        <span className={badgeClasses.join(' ')}>{scored || totalScore !== 0 ? fmt(totalScore) : '-'}</span>
        {hasHonours && <span className="tbd-honours-chip">H</span>}
        <input className="tbd-player-name-input" aria-label={`${player.name} name`} value={player.name} readOnly={Boolean(player.isProfile)} title={player.isProfile ? 'Saved player profile' : 'Guest player'} onFocus={event => { if (!player.isProfile) event.target.select(); }} onChange={event => { if (!player.isProfile) updateName(player.id, event.target.value); }} />
      </div>
      <span className="tbd-hole-status">{scoreLabel}</span>
    </div>
    <button className="button secondary" onClick={() => openScore(player.id)}>{buttonLabel}</button>
  </div>;
}

function DartChoiceGroup({ label, value, setValue }) {
  return <div className="tbd-custom-dart-picker"><div className="tbd-custom-dart-picker-heading">{label}</div><div className="tbd-custom-dart-options">{dartOptions.map(option => <button key={option.value} type="button" className={`tbd-custom-dart-option is-${option.tone} ${value === option.value ? 'is-selected' : ''}`} onClick={() => setValue(option.value)}>{option.label}</button>)}</div></div>;
}

function ScoreModal({ player, activeHole, currentKey, onScore, onClear, onClose }) {
  const [dartOne, setDartOne] = useState('');
  const [dartTwo, setDartTwo] = useState('');
  const dartResult = scoreTwoDarts(dartOne, dartTwo);
  const canApply = Boolean(dartResult.scoreKey);
  return <div className="tbd-score-modal-shell"><div className="card tbd-score-modal-card"><div className="tbd-score-modal-title-row"><div><p className="eyebrow">Hole {activeHole}</p><h2>{player.name}</h2></div><button className="button secondary" onClick={onClose}>Close</button></div><div className="tbd-quick-score-grid">{scoreResults.map(result => <button key={result.key} className={`button ${currentKey === result.key ? 'primary' : 'secondary'}`} onClick={() => onScore(result.key)}>{result.label} {fmt(result.score)}</button>)}</div><div className="tbd-dart-score-card"><p className="eyebrow">Score by Darts</p><div className="tbd-dart-select-grid has-custom-dart-pickers"><DartChoiceGroup label="Dart 1" value={dartOne} setValue={setDartOne} /><DartChoiceGroup label="Dart 2" value={dartTwo} setValue={setDartTwo} /></div><div className="rule-answer" style={{ marginTop: '12px' }}><strong>{dartResult.title}</strong><p style={{ margin: '6px 0 0' }}>{dartResult.answer}</p></div><button className="button primary" style={{ marginTop: '12px', width: '100%' }} disabled={!canApply} onClick={() => onScore(dartResult.scoreKey)}>Apply Dart Result</button></div><button className="button ghost" style={{ marginTop: '12px' }} onClick={onClear}>Clear score</button></div></div>;
}

export default function Home() {
  const [players, setPlayers] = useState(defaults);
  const [activeHole, setActiveHole] = useState(1);
  const [status, setStatus] = useState('');
  const [historyStatus, setHistoryStatus] = useState('');
  const [history, setHistory] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showScorecard, setShowScorecard] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showPlayerProfiles, setShowPlayerProfiles] = useState(false);
  const [showScoringMode, setShowScoringMode] = useState(false);
  const [savedGameId, setSavedGameId] = useState(null);
  const [isRoundDirty, setIsRoundDirty] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [scoringMenuOpen, setScoringMenuOpen] = useState(false);
  const [scoringPlayerId, setScoringPlayerId] = useState(null);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const lastAutoAdvanceHoleRef = useRef(null);

  const leader = useMemo(() => [...players].sort((a, b) => total(a) - total(b))[0], [players]);
  const leaderScore = total(leader);
  const isActiveHoleComplete = players.length > 0 && players.every(player => scoreByKey.has(player.scores[activeHole]));
  const honoursIndex = useMemo(() => getHonoursIndex(players, activeHole), [players, activeHole]);
  const scoringPlayer = players.find(player => player.id === scoringPlayerId);

  function markRoundDirty() { setIsRoundDirty(true); setStatus(''); }
  function updateScoreForHole(playerId, score, hole) { markRoundDirty(); setPlayers(current => current.map(player => player.id === playerId ? { ...player, scores: { ...player.scores, [hole]: score } } : player)); }
  function updateScore(playerId, score) { updateScoreForHole(playerId, score, activeHole); }
  function updateName(playerId, name) { markRoundDirty(); setPlayers(current => current.map(player => player.id === playerId && !player.isProfile ? { ...player, name, playerId: null } : player)); }
  function addPlayer() { setShowPlayerProfiles(true); }
  function addGuest() { markRoundDirty(); setPlayers(current => [...current, { id: crypto.randomUUID(), playerId: null, isProfile: false, name: `Player ${current.length + 1}`, scores: {} }]); }
  function addSavedProfile(profile) {
    if (!profile?.id) return;
    setPlayers(current => {
      if (current.some(player => player.playerId === profile.id)) return current;
      const placeholderIndex = current.findIndex(player => !player.playerId && !player.isProfile && scoredHoleCount(player) === 0 && /^Player \d+$/.test(player.name));
      if (placeholderIndex >= 0) return current.map((player, index) => index === placeholderIndex ? { ...player, playerId: profile.id, isProfile: true, name: profile.display_name, scores: {} } : player);
      return [...current, { id: crypto.randomUUID(), playerId: profile.id, isProfile: true, name: profile.display_name, scores: {} }];
    });
    markRoundDirty();
  }
  function removePlayer() { setPlayers(current => { if (current.length <= 1) return current; const next = current.slice(0, -1); if (!next.some(player => player.id === scoringPlayerId)) setScoringPlayerId(null); return next; }); markRoundDirty(); }
  function resetRound() { lastAutoAdvanceHoleRef.current = null; setSavedGameId(null); setIsRoundDirty(true); setStatus(''); setShowScorecard(false); setActiveHole(1); setPlayers(current => current.map(player => ({ ...player, scores: {} }))); }
  function changeHole(nextHole) { setIsAdvancing(true); window.setTimeout(() => { setActiveHole(nextHole); window.setTimeout(() => setIsAdvancing(false), 620); }, 120); }
  function goToPreviousHole() { if (activeHole > 1) changeHole(activeHole - 1); }
  function goToNextHole() { if (activeHole < 18) changeHole(activeHole + 1); }
  function saveButtonLabel() { if (isSaving) return 'Saving...'; if (savedGameId && !isRoundDirty) return 'Saved'; if (savedGameId && isRoundDirty) return 'Save changes'; return 'Save round'; }
  function applyScore(playerId, scoreKey) { updateScore(playerId, scoreKey); setScoringPlayerId(null); }
  function clearScore(playerId) { updateScore(playerId, ''); setScoringPlayerId(null); }

  useEffect(() => { if (!showScoringMode || !isActiveHoleComplete || activeHole >= 18 || lastAutoAdvanceHoleRef.current === activeHole) return; lastAutoAdvanceHoleRef.current = activeHole; const timeoutId = window.setTimeout(() => goToNextHole(), 760); return () => window.clearTimeout(timeoutId); }, [showScoringMode, isActiveHoleComplete, activeHole]);

  async function cleanupFailedGame(gameId) { if (!gameId) return; await supabase.from('games').delete().eq('id', gameId); }
  async function writeRoundRows(gameId) {
    if (savedGameId) { const { error: deleteError } = await supabase.from('game_players').delete().eq('game_id', gameId); if (deleteError) throw new Error(deleteError.message || 'Could not clear previous saved player rows.'); }
    for (const [index, player] of players.entries()) {
      const displayName = player.name.trim() || `Player ${index + 1}`;
      let persistentPlayerId = player.playerId;
      if (!persistentPlayerId) {
        const { data: dbPlayer, error: playerError } = await supabase.from('players').upsert({ owner_key: getOwnerKey(), display_name: displayName }, { onConflict: 'owner_key,display_name' }).select('id,display_name').single();
        if (playerError || !dbPlayer) throw new Error(playerError?.message || `Could not save player ${displayName}.`);
        persistentPlayerId = dbPlayer.id;
      }
      const { data: gp, error: gamePlayerError } = await supabase.from('game_players').insert({ game_id: gameId, player_id: persistentPlayerId, display_order: index, total_score: total(player), total_strokes: strokes(player) }).select('id').single();
      if (gamePlayerError || !gp) throw new Error(gamePlayerError?.message || `Could not attach player ${displayName} to round.`);
      const rows = holes.map(hole => { const key = player.scores[hole]; const result = scoreByKey.get(key); return result ? { game_player_id: gp.id, hole_number: hole, result: key, relative_score: result.score, strokes: result.strokes } : null; }).filter(Boolean);
      if (rows.length) { const { error: scoreError } = await supabase.from('hole_scores').insert(rows); if (scoreError) throw new Error(scoreError.message || `Could not save scores for ${displayName}.`); }
    }
  }
  async function saveRound() {
    if (savedGameId && !isRoundDirty) { setStatus('Round already saved. Change a player or score to save updates.'); return; }
    setIsSaving(true); setStatus('Saving round...');
    const ownerKey = getOwnerKey(); const roundLabel = currentRoundComplete(players) ? 'Official 18' : 'Incomplete round'; let gameId = savedGameId; let createdNewGame = false;
    try {
      if (gameId) { const { error: gameUpdateError } = await supabase.from('games').update({ course_name: roundLabel, status: 'complete' }).eq('id', gameId).eq('owner_key', ownerKey); if (gameUpdateError) throw new Error(gameUpdateError.message || 'Could not update saved round.'); }
      else { const { data: game, error: gameError } = await supabase.from('games').insert({ owner_key: ownerKey, title: `Two Ball Darts - ${new Date().toLocaleDateString()}`, course_name: roundLabel, status: 'complete' }).select('id,title,played_at,course_name').single(); if (gameError || !game) throw new Error(gameError?.message || 'Could not create saved round.'); gameId = game.id; createdNewGame = true; }
      await writeRoundRows(gameId); setSavedGameId(gameId); setIsRoundDirty(false); setStatus(`Round saved as ${roundLabel}.`); await loadHistory(gameId);
    } catch (error) { if (createdNewGame) await cleanupFailedGame(gameId); setStatus(`Save failed: ${error.message}`); }
    finally { setIsSaving(false); }
  }
  async function enrichGamesWithPlayers(games) { if (!games?.length) return []; const gameIds = games.map(game => game.id); const { data: rows, error } = await supabase.from('game_players').select('id,game_id,player_id,display_order,total_score,total_strokes,players(id,display_name,is_profile),hole_scores(hole_number)').in('game_id', gameIds).order('display_order', { ascending: true }); if (error) { setHistoryStatus(error.message); return games; } return games.map(game => ({ ...game, game_players: (rows ?? []).filter(row => row.game_id === game.id) })); }
  async function loadHistory(gameIdToOpen) { setHistoryStatus('Loading saved rounds...'); const ownerKey = getOwnerKey(); const { data, error } = await supabase.from('games').select('id,title,played_at,course_name').eq('owner_key', ownerKey).order('played_at', { ascending: false }).limit(12); if (error) { setHistoryStatus(error.message); return; } const enriched = await enrichGamesWithPlayers(data ?? []); const visible = enriched.filter(game => savedRoundPlayers(game).length > 0); setHistory(visible); setHistoryStatus(visible.length ? `${visible.length} saved round${visible.length === 1 ? '' : 's'} loaded.` : 'No saved rounds found for this browser.'); if (gameIdToOpen) { const game = visible.find(item => item.id === gameIdToOpen); if (game) await viewSavedGame(game); } }
  async function viewSavedGame(game) { setHistoryStatus('Opening saved scorecard...'); const { data, error } = await supabase.from('game_players').select('id,player_id,display_order,total_score,total_strokes,players(id,display_name,is_profile),hole_scores(hole_number,relative_score,strokes,result)').eq('game_id', game.id).order('display_order', { ascending: true }); if (error) { setHistoryStatus(error.message); return; } setSelectedGame(game); setSelectedRows(data ?? []); setHistoryStatus(data?.length ? 'Saved scorecard opened.' : 'Saved round found, but no player score rows were returned.'); }
  async function resumeSavedGame(game) {
    setHistoryStatus('Resuming saved round...');
    const { data, error } = await supabase.from('game_players').select('id,player_id,display_order,total_score,total_strokes,players(id,display_name,is_profile),hole_scores(hole_number,relative_score,strokes,result)').eq('game_id', game.id).order('display_order', { ascending: true });
    if (error) { setHistoryStatus(error.message); return; }
    const restoredPlayers = playersFromSavedRows(data ?? []);
    setPlayers(restoredPlayers);
    setActiveHole(firstUnscoredHole(restoredPlayers));
    setSavedGameId(game.id);
    setIsRoundDirty(false);
    setShowScorecard(false);
    setShowScoringMode(true);
    setScoringPlayerId(null);
    setSelectedGame(null);
    setSelectedRows([]);
    lastAutoAdvanceHoleRef.current = null;
    setStatus('Incomplete round resumed.');
    setHistoryStatus('Incomplete round resumed.');
  }

  return <main className="app-shell">
    {!showScoringMode && <section className="hero-card"><LogoMark /><div className="hero-copy"><p className="eyebrow">18 holes · 2 darts per hole · all holes par 3</p><h1>No gimmes. Just throw.</h1><p>Golf-course scoring for the dartboard. Play holes 1 through 18 by throwing two darts at each number. Lowest score wins.</p><div className="hero-actions"><button className="button primary" onClick={() => setShowScoringMode(true)}>{hasRoundScores(players) ? 'Resume Scoring' : 'Start New Round'}</button><button className="button secondary" onClick={() => setShowHowToPlay(true)}>How to Play</button><button className="button secondary" onClick={() => loadHistory()}>Saved Rounds</button></div></div></section>}
    {!showScoringMode && <section className="quick-stats" aria-label="Round status and navigation"><div><span>Leader</span><strong>{leader.name}</strong></div><div><span>Score</span><strong>{fmt(leaderScore)}</strong></div><div><span>Strokes</span><strong>{strokes(leader)}</strong></div><div><span>Hole</span><strong>{activeHole}</strong></div></section>}
    <section className="card" id="scorecard" style={{ paddingTop: showScoringMode ? '22px' : '18px' }}>
      <div className="section-heading" style={{ marginBottom: '12px', alignItems: 'center' }}><div><p className="eyebrow" style={{ margin: 0 }}>{showScoringMode ? 'Scoring Mode' : 'Live round'}</p>{!showScoringMode && <p style={{ margin: '6px 0 0', color: '#fff4d6', fontWeight: 900 }}>Start or resume a round to enter scores.</p>}</div>{!showScoringMode && <div className="actions-inline"><button className="button secondary" onClick={() => setShowScoringMode(true)}>{hasRoundScores(players) ? 'Resume Scoring' : 'Start New Round'}</button><button className="button secondary" onClick={addPlayer}>Add player</button><button className="button ghost" onClick={resetRound}>Reset</button><button className="button primary" disabled={isSaving || (Boolean(savedGameId) && !isRoundDirty)} onClick={saveRound}>{saveButtonLabel()}</button></div>}</div>
      {showScoringMode && <div style={{ display: 'grid', gap: '10px', marginBottom: '12px' }}><div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr) minmax(0,1fr)', gap: '10px', alignItems: 'stretch' }}><ScoringMenu isOpen={scoringMenuOpen} setIsOpen={setScoringMenuOpen} addPlayer={addPlayer} removePlayer={removePlayer} canRemovePlayer={players.length > 1} resetRound={resetRound} saveRound={saveRound} saveDisabled={isSaving || (Boolean(savedGameId) && !isRoundDirty)} saveLabel={saveButtonLabel()} exitScoring={() => setShowScoringMode(false)} /><button className="button secondary" disabled={activeHole === 1} onClick={goToPreviousHole} style={{ opacity: activeHole === 1 ? .45 : 1 }}>Previous Hole</button><button className="button primary" disabled={activeHole === 18} onClick={goToNextHole} style={{ opacity: activeHole === 18 ? .45 : 1 }}>Next Hole</button></div><div style={{ border: '1px solid rgba(208,169,72,.55)', borderRadius: '14px', padding: '10px 14px', background: 'rgba(0,0,0,.18)', textAlign: 'center' }}><span style={{ display: 'block', color: '#d0a948', fontSize: '.78rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.08em' }}>Current hole</span><strong style={{ display: 'block', marginTop: '3px', fontSize: '1.35rem' }}>Hole {activeHole} of 18</strong></div></div>}
      {!showScoringMode && <div className="hole-picker" style={{ marginBottom: '12px' }}>{holes.map(hole => <button key={hole} className={hole === activeHole ? 'active' : ''} onClick={() => setActiveHole(hole)}>{hole}</button>)}</div>}
      <div className={`active-hole-panel ${isAdvancing ? 'tbd-hole-advancing' : ''}`} style={{ padding: '14px', marginBottom: '16px' }}><h3 style={{ fontSize: '1.55rem', marginBottom: '10px' }}>Hole {activeHole}</h3><div className="tbd-live-score-list">{players.map((player, index) => { const result = scoreByKey.get(player.scores[activeHole]); const playerTotal = total(player); const isLeader = playerTotal === leaderScore; return <PlayerScoringRow key={player.id} player={player} result={result} totalScore={playerTotal} isLeader={isLeader} hasHonours={index === honoursIndex} openScore={setScoringPlayerId} updateName={updateName} />; })}</div>{isActiveHoleComplete && <div style={{ marginTop: '16px', border: '2px solid rgba(208,169,72,.72)', borderRadius: '16px', padding: '14px', background: 'linear-gradient(135deg, rgba(208,169,72,.18), rgba(6,57,39,.62))' }}><strong style={{ display: 'block', fontSize: '1.25rem', color: '#fff4d6' }}>{activeHole === 18 ? 'Round complete' : `Hole ${activeHole} complete`}</strong><span style={{ display: 'block', marginTop: '4px', color: '#d0a948', fontWeight: 900 }}>{activeHole === 18 ? 'Every player has a score for 18.' : 'Every player has a score for this hole.'}</span></div>}</div>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: showScorecard ? '12px' : 0 }}><button className="button secondary" onClick={() => setShowScorecard(current => !current)}>{showScorecard ? 'Hide Scorecard' : 'Show Scorecard'}</button></div>{showScorecard && <LiveScorecard players={players} />}{status && <p className="status-line">{status}</p>}
    </section>
    {!showScoringMode && <section className="card"><div className="section-heading compact"><div><p className="eyebrow">Supabase history</p><h2>Saved rounds</h2></div><button className="button secondary" onClick={() => loadHistory()}>Load</button></div>{historyStatus && <p className="status-line">{historyStatus}</p>}<div className="history-list">{history.map(game => <div className="history-row" key={game.id}><strong>{game.title}</strong><span>{new Date(game.played_at).toLocaleString()} · {savedRoundLabel(game)}</span><span>{savedRoundSummary(game)}</span>{!isSavedRoundComplete(game) && <button className="button secondary" style={{ marginTop: '10px', marginRight: '8px' }} onClick={() => resumeSavedGame(game)}>Resume Round</button>}<button className="button primary" style={{ marginTop: '10px' }} onClick={() => viewSavedGame(game)}>View Scorecard</button></div>)}</div></section>}
    {!showScoringMode && <footer style={{ marginTop: '22px', border: '2px solid rgba(208,169,72,.72)', borderRadius: '22px', padding: '18px', background: 'linear-gradient(180deg, rgba(6,57,39,.88), rgba(2,20,15,.96))', boxShadow: '0 18px 44px rgba(0,0,0,.35)' }}><div style={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: '16px', alignItems: 'center' }}><img src="/two-ball-darts-logo.png" alt="TWO BALL DARTS" style={{ width: '64px', height: '64px', objectFit: 'contain', display: 'block' }} /><div><strong style={{ display: 'block', fontSize: '1.35rem', letterSpacing: '.03em' }}>TWO BALL DARTS</strong><span style={{ color: '#d0a948', fontWeight: 900 }}>No gimmes. Just throw.</span><p style={{ margin: '6px 0 0', color: '#f5e8c6' }}>18 holes. Two darts per hole. Bulls, 19s, and 20s are hazards.</p></div></div></footer>}
    <PlayerProfilesModal open={showPlayerProfiles} onClose={() => setShowPlayerProfiles(false)} onSelectProfile={addSavedProfile} onAddGuest={addGuest} activePlayerIds={players.map(player => player.playerId).filter(Boolean)} />{scoringPlayer && <ScoreModal player={scoringPlayer} activeHole={activeHole} currentKey={scoringPlayer.scores[activeHole] || ''} onScore={scoreKey => applyScore(scoringPlayer.id, scoreKey)} onClear={() => clearScore(scoringPlayer.id)} onClose={() => setScoringPlayerId(null)} />}{showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}<SavedScorecard game={selectedGame} rows={selectedRows} onClose={() => { setSelectedGame(null); setSelectedRows([]); }} />
  </main>;
}

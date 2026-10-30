'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import LogoMark from '@/components/LogoMark';
import PlayerProfilesModal from '@/components/PlayerProfilesModal';
import GameplayAdSlot from '@/components/GameplayAdSlot';
import RemovePlayerModal from '@/components/RemovePlayerModal';
import { holes, scoreResults } from '@/lib/brand';
import { supabase } from '@/lib/supabase';
import { getOwnerKey } from '@/lib/storage';
import NoSleep from '@marsgames/nosleep.js';

const defaults = [
  { id: 'p1', playerId: null, isProfile: false, isGuest: false, name: 'Player 1', scores: {} },
  { id: 'p2', playerId: null, isProfile: false, isGuest: false, name: 'Player 2', scores: {} }
];

const IN_PROGRESS_ROUND_KEY = 'twoBallDarts.inProgressRound.v1';

const dartOptions = [
  { value: 'power', label: 'Double / Triple', tone: 'green' },
  { value: 'single', label: 'Single Hit', tone: 'gold' },
  { value: 'safe', label: 'Safe Miss', tone: 'neutral' },
  { value: 'hazard', label: 'Hazard', tone: 'red' }
];

const scoreByKey = new Map(scoreResults.map(result => [result.key, result]));
const scoreKeyByRelative = new Map(scoreResults.map(result => [result.score, result.key]));
const fmt = score => score === 0 ? 'E' : score > 0 ? `+${score}` : `${score}`;
const total = player => holes.reduce((sum, hole) => sum + (scoreByKey.get(player.scores[hole])?.score ?? 0), 0);
const totalForHoles = (player, comparableHoles) => comparableHoles.reduce((sum, hole) => sum + (scoreByKey.get(player.scores[hole])?.score ?? 0), 0);
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
  if (game.status === 'active') return false;
  const rows = savedRoundPlayers(game);
  if (rows.length > 0) return rows.every(row => savedPlayerHoleCount(row) === 18);
  return game.course_name === 'Official 18';
};
const savedRoundLabel = game => game.status === 'active' ? 'Round In Progress' : isSavedRoundComplete(game) ? 'Official 18' : 'Incomplete round';
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
      isGuest: !Boolean(row.players?.is_profile),
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
  if (hazard === 2) return { title: 'Triple bogey', matchedRule: 'triple_bogey', scoreKey: 'triple_bogey', reactionKey: 'double_hazard', capNote: 'MAXED OUT - IT SHOULD BE WORSE.', answer: 'Two hazards. Score is capped at TRIPLE BOGEY (+3). Strokes: 6.' };
  return { title: 'Triple bogey', matchedRule: 'triple_bogey', scoreKey: 'triple_bogey', answer: 'No target hits plus at least one hazard/off-board miss. Score: TRIPLE BOGEY (+3). Strokes: 6.' };
}

const dartReactionByScoreKey = {
  eagle: 'HOLY SHIT!',
  birdie: 'BOOM!',
  par: 'SOLID.',
  bogey: 'MEH.',
  double_bogey: 'FUCK.',
  triple_bogey: 'GODDAMN FUCK SHIT.',
  double_hazard: 'TWO HAZARDS?! JESUS FUCK.'
};

const dartReactionBySequence = {
  'power:power': 'HOLY SHIT!',
  'power:single': 'BOOM!',
  'single:power': 'FUCK YEAH - BIRDIE!',
  'single:single': 'SOLID.',
  'power:safe': 'AHH... STILL PAR.',
  'safe:power': 'CLUTCH. SAVED PAR.',
  'single:safe': 'AH FUCK... BOGEY.',
  'safe:single': 'SAVED IT. SORT OF.',
  'power:hazard': 'OH COME ON.',
  'hazard:power': 'SAVED YOUR ASS.',
  'safe:safe': 'WELL, THAT SUCKED.',
  'single:hazard': 'FUCK. BLEW IT.',
  'hazard:single': 'FUCK... SAVED THE DOUBLE.',
  'safe:hazard': 'WELL... FUCK.',
  'hazard:safe': 'FUCK. SHIT. FUCK.',
  'hazard:hazard': 'TWO HAZARDS?! JESUS FUCK.'
};

const dartReactionOptionsBySequence = {
  'power:power': [
    'HOLY SHIT!',
    'NO FUCKING WAY.',
    'THAT WAS FILTHY.',
    'ABSOLUTELY DIALED.',
    'PURE FUCKING STRIPE.'
  ],
  'power:single': [
    'BOOM!',
    'FUCK YEAH.',
    'THAT\'S A BIRDIE.',
    'NICELY FUCKING DONE.',
    'CENTER CUT.'
  ],
  'single:power': [
    'FUCK YEAH - BIRDIE!',
    'BIG SECOND DART.',
    'THERE IT IS.',
    'CLUTCH AS FUCK.',
    'STRIPED THE SECOND ONE.'
  ],
  'single:single': [
    'CLEAN PAR.',
    'JOB DONE.',
    'TAKE THE PAR.',
    'THAT\'LL DO.',
    'RIGHT DOWN THE MIDDLE.',
    'FAIRWAY FINDER.',
    'FAIRWAYS AND GREENS.',
    'CENTER OF THE FAIRWAY.',
    'NOTHING WRONG WITH THAT.',
    'PUT IT IN THE BOOK.',
    'BORING GOLF. GOOD GOLF.',
    'JUST KEEP MAKING PARS.',
    'STRAIGHT DOWN BROADWAY.',
    'MIDDLE OF THE SHORT GRASS.',
    'TEXTBOOK PAR.',
    'EASY MONEY.',
    'NICE AND CLEAN.',
    'KEEP THE CARD CLEAN.'
  ],
  'power:safe': [
    'WASTED A GOOD FIRST DART.',
    'BE BETTER.',
    'PAR... BUT YOU HAD MORE.',
    'LEFT ONE OUT THERE.',
    'AH FUCK. STILL PAR.',
    'YOU HAD BIRDIE IN YOUR HAND.',
    'THAT SHOULD HAVE BEEN BIRDIE.',
    'GAVE ONE AWAY.',
    'GOOD START. SHIT FINISH.',
    'LEFT THE BIRDIE OUT THERE.',
    'YOU HAD THE HOLE BY THE BALLS.',
    'PAR FEELS LIKE A BOGEY THERE.',
    'THAT ONE GOT AWAY.',
    'SHOULD HAVE CASHED THAT.'
  ],
  'safe:power': [
    'THAT SAVED YOUR ASS.',
    'NICE RECOVERY.',
    'PAR FROM NOWHERE.',
    'CLUTCH SECOND DART.',
    'THERE\'S THE SAVE.',
    'GOOD FUCKING RECOVERY.',
    'SCRAMBLED THE PAR.',
    'HELL OF A SAVE.',
    'GOT UP AND DOWN.',
    'THAT\'S A SCRAMBLE.',
    'WAY TO STEAL PAR.',
    'FOUND PAR THE HARD WAY.',
    'SAVED IT FROM THE SHIT.',
    'THAT SECOND DART WAS MONEY.'
  ],
  'single:safe': [
    'AH FUCK... BOGEY.',
    'YOU HAD PAR.',
    'LET THAT ONE GET AWAY.',
    'DAMN. ONE TOO MANY.',
    'MISSED THE FUCKING GREEN.',
    'THAT BLOWS.',
    'GAVE PAR AWAY.',
    'LEFT A SHOT OUT THERE.',
    'BE BETTER.',
    'BOGEY FROM THE MIDDLE OF THE FAIRWAY. NICE.',
    'THAT\'S A STUPID BOGEY.',
    'FUCK. SHOULD HAVE BEEN PAR.'
  ],
  'safe:single': [
    'SAVED IT. SORT OF.',
    'NOT PRETTY, BUT BOGEY.',
    'AT LEAST YOU GOT ONE BACK.',
    'TAKE YOUR MEDICINE.',
    'UGLY BOGEY. THEY ALL COUNT.',
    'COULD HAVE BEEN A LOT WORSE.',
    'BOGEY AND GET THE FUCK OUT.',
    'UGLY, BUT YOU SAVED A SHOT.',
    'THAT\'S A GRINDY BOGEY.',
    'TAKE IT AND MOVE ON.',
    'NOT DEAD YET.',
    'FOUND A SHOT WHEN YOU NEEDED ONE.'
  ],
  'power:hazard': [
    'OH, FOR FUCK.',
    'WHAT A FUCKING WASTE.',
    'FROM GREAT TO SHIT.',
    'HAD BIRDIE. FOUND THE FUCKING WATER.',
    'IN THE DRINK. FUCK.'
  ],
  'hazard:power': [
    'SAVED YOUR ASS.',
    'HUGE FUCKING RECOVERY.',
    'THAT\'S A FUCKING SAVE.',
    'BOGEY FROM THE DEAD.',
    'GREAT RECOVERY FROM THE SHIT.'
  ],
  'safe:safe': [
    'WELL, THAT SUCKED.',
    'THAT BLOWS.',
    'FUCK, FUCK.',
    'SUCKS TO BE YOU.',
    'BE BETTER.',
    'DOUBLE. PICK IT UP.',
    'SON OF A FUCKING BITCH.',
    'OH, FOR FUCK.',
    'THAT WAS SHIT.',
    'NOT EXACTLY TOUR GOLF.',
    'NICE HANDICAP BUILDER.',
    'THAT\'S ONE TO FORGET.',
    'JUST WRITE DOWN FIVE.',
    'PUT THE DRIVER AWAY.',
    'ABSOLUTE DOGSHIT.',
    'WELL PLAYED, TIGER.'
  ],
  'single:hazard': [
    'FUCK. BLEW IT.',
    'THAT BLOWS.',
    'YOU JUST THREW AWAY PAR.',
    'IN THE DRINK. NICE ONE.',
    'OH, FOR FUCK.',
    'NICE WAY TO FUCK UP A GOOD HOLE.',
    'WELL... THAT WENT TO SHIT.',
    'FOUND THE WATER. BEAUTIFUL.',
    'WAY TO TURN PAR INTO SHIT.',
    'FUCKING HAZARD.',
    'YOU HAD PAR. THEN YOU DID THAT.',
    'THAT\'S TWO SHOTS YOU\'RE NOT GETTING BACK.'
  ],
  'hazard:single': [
    'NICE RECOVERY. SHAME ABOUT THE FUCKING WATER.',
    'TOO FUCKING LATE.',
    'AT LEAST YOU HIT SOMETHING.',
    'SMALL FUCKING MIRACLE.',
    'DOUBLE. TAKE IT.',
    'NOW YOU HIT IT.',
    'GOOD SECOND DART. DAMAGE WAS ALREADY DONE.',
    'NOT GOOD. NOT A DISASTER.',
    'YOU STOPPED THE BLEEDING.',
    'SECOND DART SAVED YOUR ASS.'
  ],
  'safe:hazard': [
    'SON OF A FUCKING BITCH.',
    'OH, FOR FUCK.',
    'THAT\'S A FUCKING DISASTER.',
    'WHAT A FUCKING MESS.',
    'ABSOLUTE SHITSHOW.',
    'THAT HOLE ATE YOU ALIVE.',
    'TRIPLE. BEAUTIFUL.',
    'WHAT THE FUCK WAS THAT?',
    'YOU FUCKED THAT HOLE.',
    'FUCKING UGLY.',
    'ARE YOU SURE YOU\'RE RIGHT-HANDED?'
  ],
  'hazard:safe': [
    'WELL, THAT\'S FUCKED.',
    'IN THE WATER, THEN NOWHERE.',
    'THAT\'S A TRIPLE.',
    'ABSOLUTE DISASTER.',
    'YOU\'RE MAKING THIS HARD ON YOURSELF.',
    'THAT HOLE JUST BEAT THE SHIT OUT OF YOU.',
    'FUCKING BRUTAL.',
    'NICE FOLLOW-UP. FUCKING USELESS.',
    'TRIPLE. FUCK.',
    'THAT WAS A COMPLETE FUCKING MESS.',
    'ARE YOU SURE YOU\'RE RIGHT-HANDED?'
  ],
  'hazard:hazard': [
    'JESUS FUCKING CHRIST!',
    'MAXED OUT. IT SHOULD BE WORSE.',
    'TWO FUCKING HAZARDS.',
    'YOU\'VE GOT TO BE KIDDING ME!',
    'ABSOLUTE FUCKING CARNAGE.',
    'WHAT THE FUCK ARE YOU DOING?',
    'JUST PICK IT UP.',
    'YOU FOUND EVERYTHING BUT THE TARGET.',
    'FUCKING DISASTER.',
    'THAT HOLE OWNS YOU.'
  ]
};

function dartReactionForSequence(dart1, dart2, fallbackKey, player, activeHole, usedReactionTexts = []) {
  const key = `${dart1}:${dart2}`;
  const options = dartReactionOptionsBySequence[key];
  if (options?.length) return pickUnusedReaction(options, usedReactionTexts, player?.id, activeHole, `sequence_${key}`);
  return dartReactionBySequence[key] ?? dartReactionByScoreKey[fallbackKey];
}

function reactionToneForSequence(dart1, dart2) {
  const key = `${dart1}:${dart2}`;
  if (['power:power', 'power:single', 'single:power'].includes(key)) return 'celebrate';
  if (['safe:power', 'hazard:power', 'safe:single', 'hazard:single'].includes(key)) return 'save';
  if (['power:safe', 'single:safe'].includes(key)) return 'letdown';
  if (['power:hazard', 'single:hazard', 'safe:hazard', 'hazard:safe'].includes(key)) return 'collapse';
  if (key === 'safe:safe') return 'chirp';
  return 'golf';
}

function pickContextReaction(options, playerId, activeHole, contextKey) {
  if (!options?.length) return '';

  const stableSeed = `${playerId ?? 'player'}:${contextKey}`;
  let hash = 0;
  for (let index = 0; index < stableSeed.length; index += 1) hash = ((hash << 5) - hash + stableSeed.charCodeAt(index)) | 0;

  const rotationOffset = Math.abs(hash) % options.length;
  const holeOffset = Math.max(0, activeHole - 1) % options.length;
  return options[(rotationOffset + holeOffset) % options.length];
}

function pickUnusedReaction(options, usedReactionTexts, playerId, activeHole, contextKey) {
  if (!options?.length) return '';
  const used = new Set(usedReactionTexts ?? []);
  const available = options.filter(option => !used.has(option));
  if (!available.length) return '';
  return pickContextReaction(available, playerId, activeHole, contextKey);
}

function contextualDartReaction(player, activeHole, scoreKey, dart1, dart2, usedReactionTexts = []) {
  if (!player || activeHole <= 1 || !scoreByKey.has(scoreKey)) return null;

  const previousKeys = [];
  for (let hole = activeHole - 1; hole >= 1; hole -= 1) {
    const key = player.scores[hole];
    if (!scoreByKey.has(key)) break;
    previousKeys.push(key);
  }

  if (!previousKeys.length) return null;

  const previousScores = previousKeys.map(key => scoreByKey.get(key)?.score ?? 0);
  const currentScore = scoreByKey.get(scoreKey)?.score ?? 0;
  const previousKey = previousKeys[0];
  const lastThreeKeys = previousKeys.slice(0, 3);
  const lastFourWithCurrent = [scoreKey, ...lastThreeKeys];
  const lastThreeScores = previousScores.slice(0, 3);
  const underPar = score => score < 0;
  const overPar = score => score > 0;
  const sequenceKey = `${dart1}:${dart2}`;

  const react = (contextKey, options, tone = 'golf') => ({
    text: pickUnusedReaction(options, usedReactionTexts, player.id, activeHole, contextKey),
    tone,
    contextKey,
    options
  });

  if (
    scoreKey === 'eagle' &&
    previousKeys.slice(0, 2).length === 2 &&
    previousKeys.slice(0, 2).every(key => key === 'eagle')
  ) {
    return react('three_straight_eagles', [
      'THREE FUCKING EAGLES IN A ROW?!',
      'WHAT THE ACTUAL FUCK?! THREE STRAIGHT.',
      'THREE EAGLES. THIS IS INSANE.',
      'SOMEBODY CHECK THIS FUCKING GUY.'
    ], 'celebrate');
  }

  if (scoreKey === 'eagle' && lastFourWithCurrent.filter(key => key === 'eagle').length >= 3) {
    return react('three_eagles_in_four', [
      'THIS IS GETTING STUPID.',
      'THREE EAGLES IN FOUR?! FUCK OFF.',
      'YOU ARE OUT OF YOUR FUCKING MIND.',
      'THREE EAGLES. ABSOLUTELY DIALED.'
    ], 'celebrate');
  }

  if (scoreKey === 'eagle' && previousKey === 'eagle') {
    return react('back_to_back_eagles', [
      'ARE YOU FUCKING KIDDING ME?!',
      'BACK-TO-BACK EAGLES. WHAT THE FUCK?!',
      'TWO EAGLES?! FUCK OFF.',
      'BACK-TO-BACK. ABSOLUTELY PURE.'
    ], 'celebrate');
  }

  if (scoreKey === 'triple_bogey' && lastFourWithCurrent.filter(key => key === 'triple_bogey').length >= 3) {
    return react('three_triples_in_four', [
      'ARE YOU DIGGING TO CHINA?',
      'THIS IS A FUCKING DISASTER.',
      'WHAT THE FUCK ARE YOU DOING?',
      'THIS IS FUCKING UGLY.',
      'MAYBE TAKE UP BOWLING.'
    ], 'collapse');
  }

  if (scoreKey === 'triple_bogey' && previousKey === 'triple_bogey') {
    return react('back_to_back_triples', [
      'DIGGING A FUCKING HOLE HERE.',
      'BACK-TO-BACK TRIPLES. JESUS.',
      'STOP THE FUCKING BLEEDING.',
      'TWO TRIPLES. FUCK ME.',
      'JUST PICK IT UP.'
    ], 'collapse');
  }

  const currentAndPreviousBadScores = [currentScore, ...previousScores];
  if (
    currentAndPreviousBadScores.length >= 4 &&
    currentAndPreviousBadScores.slice(0, 4).every(overPar)
  ) {
    return react('four_plus_bad_holes', [
      'SOMEONE\'S GOT A CASE OF THE SHANKS.'
    ], 'collapse');
  }

  if (
    currentAndPreviousBadScores.length >= 3 &&
    currentAndPreviousBadScores.slice(0, 3).every(overPar)
  ) {
    return react('three_bad_holes', [
      'NEED TO HIT THE RANGE.'
    ], 'collapse');
  }

  if (scoreKey === 'eagle' && previousKey === 'triple_bogey') {
    return react('eagle_after_triple', [
      'REDEMPTION. HOLY SHIT.',
      'NOW THAT IS A FUCKING COMEBACK.',
      'TRIPLE TO EAGLE. FUCK YEAH.',
      'THAT\'S HOW YOU ANSWER.'
    ], 'celebrate');
  }

  if (previousKey === 'birdie' && currentScore >= 2) {
    return react('post_birdie_fuckup', [
      'PBF. POST-BIRDIE FUCK-UP.',
      'CLASSIC PBF.',
      'BIRDIE THEN THAT? FUCK ME.',
      'WAY TO GIVE THE BIRDIE RIGHT BACK.'
    ], 'collapse');
  }

  if (
    scoreKey === 'triple_bogey' &&
    previousKeys.slice(0, 3).length === 3 &&
    previousKeys.slice(0, 3).every(key => key === 'par')
  ) {
    return react('triple_after_three_pars', [
      'DID YOU SMOKE A JOINT ON THE LAST HOLE?',
      'THREE PARS THEN THAT? WHAT THE FUCK?',
      'WHERE THE FUCK DID THAT COME FROM?',
      'WELL, THERE GOES THE NICE LITTLE PAR RUN.'
    ], 'collapse');
  }

  if (scoreKey === 'triple_bogey' && ['eagle', 'birdie'].includes(previousKey)) {
    return react('triple_after_under', [
      'OH, FOR FUCK\'S SAKE.',
      'WELL... THAT WENT TO SHIT FAST.',
      'FROM HERO TO TRAINWRECK.',
      'GAVE THAT ONE RIGHT THE FUCK BACK.'
    ], 'collapse');
  }

  if (scoreKey === 'birdie' && previousKey === 'birdie') {
    return react('back_to_back_birdies', [
      'BACK-TO-BACK BIRDIES. LET\'S GO.',
      'TWO BIRDIES. KEEP FUCKING GOING.',
      'THERE YOU FUCKING GO.',
      'BACK-TO-BACK. NICE.',
      'NOW WE\'RE COOKING.'
    ], 'celebrate');
  }

  if (underPar(currentScore) && lastThreeScores.slice(0, 2).length === 2 && lastThreeScores.slice(0, 2).every(underPar)) {
    return react('three_under_par', [
      'YOU\'RE ON A FUCKING RUN.',
      'THREE STRAIGHT UNDER PAR. DIALED.',
      'KEEP YOUR FOOT DOWN.',
      'THE CARD IS GETTING SEXY.'
    ], 'swagger');
  }

  if (scoreKey === 'par' && previousKeys.slice(0, 3).length === 3 && previousKeys.slice(0, 3).every(key => key === 'par')) {
    return react('four_plus_pars', [
      'FAIRWAYS. GREENS. PARS.',
      'FOUR STRAIGHT. JUST KEEP STRIPING IT.',
      'FUCKING METRONOME.',
      'KEEP THE CARD CLEAN.',
      'ANOTHER PAR. KEEP WALKING.',
      'THIS IS BORING AS FUCK. I LOVE IT.',
      'RIGHT DOWN THE MIDDLE AGAIN.',
      'JUST KEEP HITTING FAIRWAYS.',
      'THE CARD IS CLEAN.',
      'PAR TRAIN KEEPS ROLLING.',
      'YOU\'RE MAKING THIS LOOK EASY.',
      'STEADY FUCKING GOLF.',
      'NO MISTAKES. KEEP GOING.',
      'JUST ANOTHER DAY AT PAR.',
      'STRIPE. PAR. REPEAT.',
      'NOTHING FANCY. JUST GOOD GOLF.',
      'KEEP PILING UP THE PARS.',
      'YOU\'RE LIVING IN THE FAIRWAY.',
      'THE BORING STUFF WINS.',
      'ANOTHER ONE IN THE MIDDLE.'
    ], 'swagger');
  }

  if (scoreKey === 'par' && previousKeys.slice(0, 2).length === 2 && previousKeys.slice(0, 2).every(key => key === 'par')) {
    return react('three_pars', [
      'THREE STRAIGHT PARS. NICE.',
      'FAIRWAYS AND GREENS.',
      'PAR HAT TRICK.',
      'KEEP STRIPING IT.',
      'THREE CLEAN HOLES.',
      'THREE IN A ROW. SOLID.',
      'JUST KEEP FINDING FAIRWAYS.',
      'THE CARD LIKES THIS.',
      'THREE PARS. NOTHING WRONG WITH THAT.',
      'NICE LITTLE RUN.',
      'STEADY AS FUCK.',
      'KEEP THE PEDAL DOWN.'
    ], 'swagger');
  }

  if (scoreKey === 'bogey' && previousKeys.slice(0, 3).length === 3 && previousKeys.slice(0, 3).every(key => key === 'par')) {
    return react('bogey_breaks_par_run', [
      'THERE GOES THE PAR RUN.',
      'AH FUCK. STREAK OVER.',
      'GAVE ONE BACK.',
      'WELL, SHIT. THERE GOES THE CLEAN CARD.'
    ], 'letdown');
  }

  if (scoreKey === 'double_bogey' && previousKey === 'double_bogey') {
    return react('back_to_back_doubles', [
      'BACK-TO-BACK DOUBLES. FUCK.',
      'TWO DOUBLES. THAT BLOWS.',
      'BE BETTER.',
      'SUCKS TO BE YOU.',
      'SON OF A FUCKING BITCH.'
    ], 'chirp');
  }

  if (scoreKey === 'bogey' && previousKey === 'bogey') {
    return react('back_to_back_bogeys', [
      'BACK-TO-BACK BOGEYS. FUCK.',
      'GAVE ANOTHER ONE AWAY.',
      'BE BETTER.',
      'TWO BOGEYS. THAT BLOWS.',
      'GET OFF THE BOGEY TRAIN.'
    ], 'letdown');
  }

  // Recovery context only gets to override a Par when the current darts actually felt like a recovery,
  // not when a strong first dart was wasted.
  if (
    scoreKey === 'par' &&
    sequenceKey !== 'power:safe' &&
    lastThreeScores.slice(0, 2).length === 2 &&
    lastThreeScores.slice(0, 2).every(score => score >= 2)
  ) {
    return react('par_after_two_ugly', [
      'BACK IN THE FAIRWAY.',
      'THAT\'LL FUCKING DO.',
      'THERE WE GO.',
      'FINALLY FOUND THE SHORT GRASS.'
    ], 'save');
  }

  if (scoreKey === 'birdie' && lastThreeScores.slice(0, 2).length === 2 && lastThreeScores.slice(0, 2).every(overPar)) {
    return react('birdie_after_two_over', [
      'THERE WE FUCKING GO.',
      'NOW THAT\'S MORE LIKE IT.',
      'BIRDIE. ABOUT FUCKING TIME.',
      'FOUND THE FUCKING SWING AGAIN.'
    ], 'save');
  }

  if (scoreKey === 'bogey' && previousKey === 'eagle') {
    return react('bogey_after_eagle', [
      'HERO TO ZERO.',
      'AND WE GIVE ONE BACK.',
      'EAGLE THEN BOGEY. FUCK.',
      'COULDN\'T JUST ENJOY THE EAGLE, EH?'
    ], 'letdown');
  }

  if (underPar(currentScore) && previousKeys.length >= 4 && previousScores.slice(0, 4).every(score => score >= 0)) {
    return react('under_par_after_dry_spell', [
      'FINALLY.',
      'ABOUT FUCKING TIME.',
      'THERE IT IS.',
      'FOUND ONE.'
    ], 'save');
  }

  if (currentScore <= 0 && previousKeys.slice(0, 4).length === 4 && previousScores.slice(0, 4).every(score => score <= 0)) {
    return react('five_par_or_better', [
      'LOCKED THE FUCK IN.',
      'FIVE STRAIGHT PAR OR BETTER.',
      'FAIRWAYS AND GREENS, BABY.',
      'THIS CARD IS FUCKING CLEAN.',
      'YOU\'RE DIALED.',
      'KEEP THIS SHIT GOING.',
      'THE CARD IS LOOKING PRETTY.',
      'NOTHING BUT QUALITY GOLF.',
      'YOU\'RE IN A GROOVE NOW.',
      'JUST KEEP MAKING SWINGS.',
      'THIS IS HOW YOU BUILD A ROUND.',
      'NO LEAKS IN THE CARD.'
    ], 'swagger');
  }

  return null;
}

const difficultHoleRanks = new Map([
  [3, 1],
  [7, 2],
  [5, 3],
  [1, 4]
]);

const secondaryDifficultHoles = new Set([12, 16, 17, 18]);

function finalHoleReaction(player, players, activeHole, scoreKey, usedReactionTexts = []) {
  if (!player || activeHole !== 18 || !scoreByKey.has(scoreKey)) return null;

  const priorHoles = holes.filter(hole => hole < 18);
  if (!priorHoles.every(hole => scoreByKey.has(player.scores[hole]))) return null;

  const currentScore = scoreByKey.get(scoreKey)?.score ?? 0;
  const priorTotal = totalForHoles(player, priorHoles);
  const finalTotal = priorTotal + currentScore;
  const opponents = (players ?? []).filter(candidate => candidate.id !== player.id);

  const react = (contextKey, options, tone = 'golf') => ({
    text: pickUnusedReaction(options, usedReactionTexts, player.id, activeHole, contextKey),
    tone,
    contextKey,
    options
  });

  const opponentsHaveSeventeen = opponents.length > 0 && opponents.every(opponent =>
    priorHoles.every(hole => scoreByKey.has(opponent.scores[hole]))
  );
  const opponentsFinished = opponents.length > 0 && opponents.every(opponent =>
    scoreByKey.has(opponent.scores[18])
  );

  if (opponentsHaveSeventeen && opponentsFinished) {
    const opponentPriorTotals = opponents.map(opponent => totalForHoles(opponent, priorHoles));
    const bestOpponentPrior = Math.min(...opponentPriorTotals);
    const opponentFinalTotals = opponents.map(opponent =>
      totalForHoles(opponent, priorHoles) + (scoreByKey.get(opponent.scores[18])?.score ?? 0)
    );
    const bestOpponentFinal = Math.min(...opponentFinalTotals);
    const wasLeading = priorTotal < bestOpponentPrior;

    if (wasLeading && finalTotal > bestOpponentFinal && currentScore >= 2) {
      return react('eighteen_choked_lead', [
        'YOU HAD THE ROUND. THEN YOU DID THAT.',
        'BLEW IT ON EIGHTEEN. FUCK.',
        'THAT\'S A FUCKING HEARTBREAKER.',
        'YOU JUST HANDED THEM THE ROUND.'
      ], 'collapse');
    }

    if (finalTotal < bestOpponentFinal) {
      if (currentScore >= 2) {
        return react('eighteen_won_ugly', [
          'MADE IT INTERESTING, BUT YOU GOT IT DONE.',
          'UGLY FINISH. STILL A WIN.',
          'SHAKE HANDS. YOU SURVIVED IT.'
        ], 'pressure');
      }
      return react('eighteen_won', [
        'SHAKE HANDS. YOU GOT IT DONE.',
        'THAT\'S HOW YOU CLOSE A ROUND.',
        'GOOD FUCKING WIN.',
        'JOB DONE. NICE ROUND.'
      ], currentScore < 0 ? 'celebrate' : 'swagger');
    }

    if (finalTotal === bestOpponentFinal) {
      return react('eighteen_tied', [
        'ALL SQUARE AFTER EIGHTEEN.',
        'EIGHTEEN HOLES. NOTHING BETWEEN YOU.',
        'WELL... NOBODY WON THAT FUCKING THING.'
      ], 'pressure');
    }

    if (currentScore < 0 && priorTotal >= 6) {
      return react('eighteen_too_late', [
        'THAT\'LL KEEP YOU COMING BACK.',
        'WHERE THE FUCK WAS THAT ALL DAY?',
        'OF COURSE YOU FIND IT ON EIGHTEEN.',
        'TOO LITTLE, TOO LATE.'
      ], 'save');
    }
  }

  if (currentScore < 0) {
    if (priorTotal >= 6) {
      return react('eighteen_good_finish_bad_round', [
        'THAT\'LL KEEP YOU COMING BACK.',
        'WHERE THE FUCK WAS THAT ALL DAY?',
        'OF COURSE YOU FIND IT ON EIGHTEEN.',
        'NOW YOU FIND YOUR GAME.'
      ], 'save');
    }

    if (priorTotal <= 1) {
      return react('eighteen_good_finish_good_round', [
        'THAT\'S HOW YOU FINISH A ROUND.',
        'STRONG FUCKING FINISH.',
        'WAY TO CLOSE.',
        'GOOD ROUND. GREAT FINISH.'
      ], 'celebrate');
    }

    return react('eighteen_good_finish_mixed_round', [
      'NICE WAY TO FINISH.',
      'FINISHED STRONG.',
      'THAT\'S A GOOD ONE TO END ON.'
    ], 'celebrate');
  }

  if (currentScore === 0) {
    if (priorTotal <= 1) {
      return react('eighteen_par_good_round', [
        'SOLID ROUND.',
        'PAR TO FINISH. NICE WORK.',
        'GOOD ROUND. SHAKE HANDS.',
        'THAT\'S A GOOD DAY\'S WORK.'
      ], 'swagger');
    }

    if (priorTotal >= 6) {
      return react('eighteen_par_bad_round', [
        'PAR TO FINISH. AT LEAST THERE\'S THAT.',
        'FOUND A PAR BEFORE THE PARKING LOT.',
        'SHAKE HANDS. FORGET THE REST.'
      ], 'golf');
    }

    return react('eighteen_par_mixed_round', [
      'PAR TO FINISH. FAIR ENOUGH.',
      'SOLID FINISH.',
      'SHAKE HANDS. THAT\'S A ROUND.'
    ], 'golf');
  }

  if (currentScore >= 2) {
    if (priorTotal <= 1) {
      return react('eighteen_bad_finish_good_round', [
        'GOOD ROUND. SHIT FINISH.',
        'WAY TO FUCK UP THE LAST HOLE.',
        'SEVENTEEN GOOD HOLES. THEN THAT.',
        'THAT\'S GONNA PISS YOU OFF.'
      ], 'collapse');
    }

    if (priorTotal >= 6) {
      return react('eighteen_bad_finish_bad_round', [
        'FITTING FUCKING ENDING.',
        'MERCIFULLY, IT\'S OVER.',
        'JUST SHAKE HANDS AND GO HOME.',
        'AND THAT\'S HOW YOU FINISH A SHIT ROUND.'
      ], 'collapse');
    }

    return react('eighteen_bad_finish_mixed_round', [
      'ROUGH FUCKING FINISH.',
      'NOT HOW YOU WANTED TO END IT.',
      'EIGHTEEN JUST KICKED YOU IN THE BALLS.'
    ], 'collapse');
  }

  if (priorTotal <= 1) {
    return react('eighteen_bogey_good_round', [
      'GOOD ROUND. ANNOYING FINISH.',
      'BOGEY ON EIGHTEEN. FUCK IT. GOOD ROUND.',
      'NOT PRETTY, BUT THE ROUND WAS SOLID.'
    ], 'letdown');
  }

  if (priorTotal >= 6) {
    return react('eighteen_bogey_bad_round', [
      'BOGEY TO FINISH. SOUNDS ABOUT RIGHT.',
      'SHAKE HANDS. GET A DRINK.',
      'AT LEAST IT\'S OVER.'
    ], 'chirp');
  }

  return react('eighteen_bogey_mixed_round', [
    'BOGEY TO FINISH. FUCK.',
    'NOT THE FINISH YOU WANTED.',
    'ONE LAST FUCKING BOGEY.'
  ], 'letdown');
}

function difficultHoleReaction(player, activeHole, scoreKey, dart1, dart2, usedReactionTexts = []) {
  const result = scoreByKey.get(scoreKey);
  if (!result) return null;

  const primaryRank = difficultHoleRanks.get(activeHole);
  const isSecondary = secondaryDifficultHoles.has(activeHole);
  if (!primaryRank && !isSecondary) return null;

  const score = result.score;
  const tier = score < 0 ? 'under' : score === 0 ? 'par' : 'over';
  const sequenceKey = `${dart1}:${dart2}`;

  // If a player hit a power target first and then threw away the Birdie, keep that immediate story.
  if (tier === 'par' && sequenceKey === 'power:safe') return null;

  const primaryOptions = {
    3: {
      under: ['BIRDIE OR BETTER ON THREE? FUCK OFF.', 'YOU JUST BEAT THE HARDEST HOLE.', 'THREE IS A BASTARD. NOT THAT TIME.'],
      par: ['PAR ON THREE? TAKE IT AND RUN.', 'THAT\'S A FUCKING GOOD PAR.', 'THREE WILL TAKE PAR ALL DAY.'],
      over: ['THREE WILL FUCKING DO THAT.', 'HARDEST HOLE. TAKE YOUR MEDICINE.', 'THREE GOT YOU. MOVE ON.']
    },
    7: {
      under: ['UNDER PAR ON SEVEN. FUCK YEAH.', 'SEVEN? STRIPED IT.', 'THAT\'S A BIG FUCKING SCORE ON SEVEN.'],
      par: ['GOOD PAR ON SEVEN.', 'TAKE PAR ON SEVEN ALL DAY.', 'SEVEN DIDN\'T GET YOU.'],
      over: ['SEVEN GOT A PIECE OF YOU.', 'SEVEN CAN BE A PRICK.', 'FUCK IT. SEVEN DOES THAT.']
    },
    5: {
      under: ['UNDER PAR ON FIVE. BEAUTY.', 'FIVE? FUCKING PURE.', 'NICE WORK ON A TOUGH ONE.'],
      par: ['GOOD PAR ON FIVE.', 'TAKE THE PAR. FIVE CAN BITE.', 'SOLID FUCKING PAR ON FIVE.'],
      over: ['FIVE GOT YOU.', 'FIVE CAN BITE. THERE IT IS.', 'THAT BLOWS. TOUGH HOLE.']
    },
    1: {
      under: ['THAT\'S HOW YOU FUCKING START.', 'UNDER PAR ON ONE. LET\'S GO.', 'STRIPED THE TOUGH OPENER.'],
      par: ['GOOD START. TAKE THE PAR.', 'PAR ON ONE. OFF WE GO.', 'TOUGH OPENER. PAR\'S GOOD.'],
      over: ['ROUGH START. SHAKE IT OFF.', 'ONE GOT YOU. LOTS OF GOLF LEFT.', 'TOUGH OPENER. FUCK IT.']
    }
  };

  const secondaryOptions = {
    under: [
      `NICE FUCKING SCORE ON ${activeHole}.`,
      `${activeHole} CAN BITE. NOT THAT TIME.`,
      `GOOD ONE ON ${activeHole}.`
    ],
    par: [
      `TAKE PAR ON ${activeHole}.`,
      `GOOD PAR THERE.`,
      `${activeHole} CAN BE A PRICK. PAR\'S FINE.`
    ],
    over: [
      `${activeHole} GOT YOU.`,
      'THAT HOLE CAN BITE.',
      'FUCK IT. MOVE ON.'
    ]
  };

  const options = primaryRank ? primaryOptions[activeHole]?.[tier] : secondaryOptions[tier];
  if (!options?.length) return null;

  // The four primary tough holes should feel different. The secondary four only surface lightly.
  if (isSecondary) {
    const seed = `${player?.id ?? 'player'}:${activeHole}:${scoreKey}:secondary_hole`;
    let hash = 0;
    for (let index = 0; index < seed.length; index += 1) hash = ((hash << 5) - hash + seed.charCodeAt(index)) | 0;
    if (Math.abs(hash) % 2 !== 0) return null;
  }

  return {
    text: pickUnusedReaction(options, usedReactionTexts, player?.id, activeHole, `difficult_hole_${activeHole}_${tier}`),
    tone: tier === 'under' ? 'celebrate' : tier === 'par' ? 'golf' : 'chirp',
    contextKey: `difficult_hole_${activeHole}`,
    options
  };
}

function matchupReaction(player, players, activeHole, scoreKey, usedReactionTexts = []) {
  if (!player || !Array.isArray(players) || players.length < 2 || activeHole < 5) return null;

  const opponents = players.filter(candidate => candidate.id !== player.id);
  if (!opponents.length) return null;

  const comparablePriorHoles = holes.filter(
    hole => hole < activeHole && players.every(candidate => scoreByKey.has(candidate.scores[hole]))
  );
  if (comparablePriorHoles.length < 3) return null;

  const currentScore = scoreByKey.get(scoreKey)?.score;
  if (!Number.isFinite(currentScore)) return null;

  let playerTotal = totalForHoles(player, comparablePriorHoles);
  const opponentTotals = opponents.map(opponent => ({
    opponent,
    score: totalForHoles(opponent, comparablePriorHoles)
  }));

  const everyoneElseScoredCurrent = opponents.every(opponent => scoreByKey.has(opponent.scores[activeHole]));
  if (everyoneElseScoredCurrent) {
    playerTotal += currentScore;
    opponentTotals.forEach(item => {
      item.score += scoreByKey.get(item.opponent.scores[activeHole])?.score ?? 0;
    });
  }

  opponentTotals.sort((a, b) => a.score - b.score);
  const closestOpponent = opponentTotals[0];
  const gap = playerTotal - closestOpponent.score;
  const opponentName = closestOpponent.opponent.name?.toUpperCase() || 'THEM';
  const late = activeHole >= 15;

  const react = (contextKey, options, tone = 'pressure') => ({
    text: pickUnusedReaction(options, usedReactionTexts, player.id, activeHole, contextKey),
    tone,
    contextKey,
    options
  });

  const shouldSurface = (key, frequency) => {
    if (late) return true;
    const seed = `${player.id}:${activeHole}:${key}`;
    let hash = 0;
    for (let index = 0; index < seed.length; index += 1) hash = ((hash << 5) - hash + seed.charCodeAt(index)) | 0;
    return Math.abs(hash) % frequency === 0;
  };

  if (Math.abs(gap) <= 1 && shouldSurface('tight_match', 2)) {
    if (currentScore < 0) {
      return react('tight_match_good', [
        'THAT\'S A BIG FUCKING SCORE.',
        `PRESSURE\'S ON ${opponentName} NOW.`,
        'BIG SHOT IN A TIGHT MATCH.',
        'THAT ONE MATTERS.'
      ], 'pressure');
    }
    if (currentScore >= 2) {
      return react('tight_match_bad', [
        'BAD TIME FOR THAT SHIT.',
        'NOT WHEN IT\'S THIS FUCKING TIGHT.',
        `YOU JUST OPENED THE DOOR FOR ${opponentName}.`,
        'THAT ONE FUCKING HURTS.'
      ], 'collapse');
    }
    if (currentScore === 0) {
      return react('tight_match_par', [
        'TAKE THE PAR. THIS IS TIGHT.',
        'NO SHOTS GIVEN AWAY.',
        'PAR KEEPS THE PRESSURE ON.',
        'RIGHT DOWN THE MIDDLE. KEEP GOING.'
      ], 'pressure');
    }
  }

  if (gap <= -5 && shouldSurface('big_lead', 3)) {
    if (currentScore <= 0) {
      return react('big_lead_good', [
        `${opponentName} IS GETTING BURIED.`,
        'KEEP YOUR FOOT ON THE GAS.',
        'THIS IS TURNING INTO A FUCKING ROUT.',
        'NO MERCY.'
      ], 'swagger');
    }
    if (currentScore >= 2) {
      return react('big_lead_bad', [
        'DON\'T OPEN THE FUCKING DOOR.',
        'YOU\'RE TRYING TO LET THEM BACK IN.',
        'BIG LEAD. DUMB TIME FOR THAT.',
        'QUIT FUCKING AROUND.'
      ], 'letdown');
    }
  }

  if (gap >= 5 && currentScore < 0 && shouldSurface('chasing', 2)) {
    return react('chasing_good', [
      'THAT\'S ONE BACK.',
      'CHIP AWAY.',
      'NOW GO GET ANOTHER.',
      `START MAKING ${opponentName} SWEAT.`
    ], 'save');
  }

  return null;
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
  const savedPlayers = rows.map((row, index) => {
    const scores = {};
    holes.forEach(hole => {
      const key = scoreKeyFromSavedScore(savedScore(row, hole));
      if (key) scores[hole] = key;
    });
    return {
      id: row.id || `saved-scorecard-${index}`,
      name: row.players?.display_name || 'Player',
      scores
    };
  });

  return <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.78)', padding: '24px', display: 'grid', placeItems: 'center' }}><div className="card" style={{ width: 'min(1180px, 96vw)', maxHeight: '90vh', overflow: 'auto', margin: 0 }}><div className="section-heading compact" style={{ marginBottom: '14px', alignItems: 'flex-start' }}><div><p className="eyebrow">Viewing saved round</p><h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.6rem)' }}>{game.title}</h2><p style={{ margin: '6px 0 0' }}>{new Date(game.played_at).toLocaleString()}</p></div><button className="button primary" onClick={onClose}>Close</button></div><LiveScorecard players={savedPlayers} /></div></div>;
}


function RoundCompleteModal({ players, onClose, onMainMenu, onNewRound }) {
  const [showResults, setShowResults] = useState(false);
  const bestScore = Math.min(...players.map(player => total(player)));
  const winners = players.filter(player => total(player) === bestScore);
  const winnerNames = winners.map(player => player.name).join(' & ');
  const isTie = winners.length > 1;

  useEffect(() => {
    const timer = window.setTimeout(() => setShowResults(true), 1800);
    return () => window.clearTimeout(timer);
  }, []);

  if (!showResults) {
    return <div className="tbd-winner-celebration" role="status" aria-live="assertive"><div className="tbd-winner-burst"><span className="tbd-winner-kicker">{isTie ? '18 HOLES COMPLETE' : 'WINNER'}</span><strong>{isTie ? 'TIE!' : `${winnerNames} WINS!`}</strong><span className="tbd-winner-score">{fmt(bestScore)}</span></div></div>;
  }

  return <div style={{ position: 'fixed', inset: 0, zIndex: 320, background: 'rgba(0,0,0,.82)', padding: '16px', display: 'grid', placeItems: 'center' }}><div className="card" style={{ width: 'min(1180px, 98vw)', maxHeight: '92vh', overflow: 'auto', margin: 0 }}><div className="section-heading compact" style={{ marginBottom: '14px', alignItems: 'flex-start' }}><div><p className="eyebrow">{isTie ? '18 holes complete - tie' : '18 holes complete'}</p><h2 style={{ fontSize: 'clamp(2rem, 7vw, 4rem)' }}>{isTie ? `${winnerNames} tied` : `${winnerNames} wins!`}</h2></div></div><LiveScorecard players={players} /><div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px', marginTop: '16px' }}><button className="button secondary" onClick={onClose}>Resume Round</button><button className="button secondary" onClick={onMainMenu}>Main Menu</button><button className="button primary" onClick={onNewRound}>Start New Round</button></div></div></div>;
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
  return <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.78)', padding: '20px', display: 'grid', placeItems: 'center' }}><div className="card" style={{ width: 'min(760px, 96vw)', maxHeight: '90vh', overflow: 'auto', margin: 0, borderColor: '#d0a948' }}><div className="section-heading compact" style={{ marginBottom: '14px', alignItems: 'flex-start' }}><div><p className="eyebrow">Quick start</p><h2 style={{ fontSize: 'clamp(2rem, 6vw, 3.8rem)' }}>How to Play</h2></div><button className="button primary" onClick={onClose}>Close</button></div><div className="rule-answer" style={{ borderLeftColor: '#d0a948' }}><h3>Two Ball Darts is golf scoring on a dartboard.</h3><ol style={{ display: 'grid', gap: '10px', margin: '12px 0 0', paddingLeft: '22px', lineHeight: 1.45 }}><li>Play holes 1 through 18. The hole number is your target.</li><li>Each player throws two darts at that number.</li><li>Hazards are the complete 19 and 20 wedges, the bull, or completely off the board.</li><li>Lowest score after 18 holes wins.</li></ol></div><figure className="tbd-rules-board"><Image src="/two-ball-darts-board.webp" alt="Official TwoBall dartboard with the complete 20 wedge, complete 19 wedge, and bull marked blue" width={1200} height={1183} sizes="(max-width: 760px) 88vw, 680px" /><figcaption><strong>Blue means hazard.</strong> The complete 20, complete 19 and bull all count as hazards.</figcaption></figure><div style={{ marginTop: '16px' }}><p className="eyebrow">Scoring cheat sheet</p><div style={{ display: 'grid', gap: '8px' }}>{cheatRows.map(([label, description, score]) => <div key={label} style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 150px) 1fr 58px', gap: '10px', alignItems: 'center', border: '1px solid rgba(208,169,72,.45)', borderRadius: '12px', padding: '10px', background: 'rgba(0,0,0,.18)' }}><strong style={{ color: '#fff4d6' }}>{label}</strong><span style={{ lineHeight: 1.35 }}>{description}</span><strong style={{ color: '#d0a948', textAlign: 'right' }}>{score}</strong></div>)}</div></div></div></div>;
}

function ScoringMenu({ isOpen, setIsOpen, addPlayer, openRemovePlayer, canRemovePlayer, resetRound, saveRound, saveDisabled, saveLabel, exitScoring }) {
  const menuRef = useRef(null);
  const popupRef = useRef(null);
  useEffect(() => {
    if (!isOpen) return;
    function closeOnOutside(event) {
      if (menuRef.current?.contains(event.target) || popupRef.current?.contains(event.target)) return;
      setIsOpen(false);
    }
    document.addEventListener('pointerdown', closeOnOutside, true);
    return () => document.removeEventListener('pointerdown', closeOnOutside, true);
  }, [isOpen, setIsOpen]);

  return <div ref={menuRef} style={{ position: 'relative' }}>
    <button className="button secondary" aria-label="Scoring menu" aria-expanded={isOpen} onClick={() => setIsOpen(current => !current)} style={{ minWidth: '44px', padding: '10px 9px', fontSize: '1.35rem', lineHeight: 1 }}>☰</button>
    {isOpen && typeof document !== 'undefined' && createPortal(<div ref={popupRef} role="menu" aria-label="Round options" style={{ position: 'fixed', zIndex: 9999, top: Math.min((menuRef.current?.getBoundingClientRect().bottom ?? 100) + 6, window.innerHeight - 340), right: 'max(18px, env(safe-area-inset-right))', width: 'min(210px, calc(100vw - 36px))', maxHeight: 'min(320px, 55dvh)', overflowY: 'auto', border: '1px solid #d0a948', borderRadius: '12px', background: '#02140f', boxShadow: '0 12px 30px rgba(0,0,0,.6)', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {[[ 'Add Player', addPlayer, false ], [ 'Remove Player', openRemovePlayer, !canRemovePlayer ], [ saveLabel, saveRound, saveDisabled ], [ 'Reset Round', resetRound, false ], [ 'Exit Scoring', exitScoring, false ]].map(([label, action, disabled], index) => <button key={index} role="menuitem" className="button secondary" disabled={disabled} onClick={() => { setIsOpen(false); action(); }} style={{ display: 'block', width: '100%', minHeight: '40px', padding: '8px 10px', fontSize: '.8rem', lineHeight: 1.2, textAlign: 'left', whiteSpace: 'normal', flex: '0 0 auto' }}>{label}</button>)}
    </div>, document.body)}
  </div>;
}

function PlayerScoringRow({ player, result, totalScore, isLeader, hasHonours, openScore, updateName, choosePlayer }) {
  const scored = Boolean(result);
  const hasAnyScore = scoredHoleCount(player) > 0;
  const scoreLabel = scored ? `${result.label} ${fmt(result.score)}` : 'No score yet';
  const buttonLabel = scored ? `${result.label} ${fmt(result.score)}` : 'Add Score';
  const badgeClasses = ['tbd-player-total-score'];
  if (!hasAnyScore) badgeClasses.push('is-empty-round');
  if (isLeader) badgeClasses.push('is-leader');
  if (totalScore < 0) badgeClasses.push('is-under');
  if (totalScore > 0) badgeClasses.push('is-over');
  if (totalScore === 0 && hasAnyScore) badgeClasses.push('is-even');

  return <div className={`tbd-player-score-row ${scored ? 'scored' : ''} ${hasHonours ? 'has-honours' : ''}`}>
    <div className="tbd-player-score-main">
      <div className="tbd-player-name-line">
        <span className={badgeClasses.join(' ')}>{fmt(totalScore)}</span>
        {hasHonours && <span className="tbd-honours-chip">H</span>}
        {player.isProfile ? <input className="tbd-player-name-input" aria-label={`${player.name} saved profile`} value={player.name} readOnly title="Saved player profile" /> : player.isGuest ? <input className="tbd-player-name-input" aria-label={`${player.name} guest name`} value={player.name} title="Guest player" onFocus={event => event.target.select()} onChange={event => updateName(player.id, event.target.value)} /> : <button type="button" className="tbd-player-name-input" onClick={() => choosePlayer(player.id)} style={{ textAlign: 'left', cursor: 'pointer' }} aria-label={`Choose ${player.name}`}>{player.name} · Choose player</button>}
      </div>
      <span className="tbd-hole-status">{scoreLabel}</span>
    </div>
    <button className="button secondary" onClick={() => openScore(player.id)}>{buttonLabel}</button>
  </div>;
}

function DartChoiceGroup({ label, value, setValue }) {
  return <div className="tbd-custom-dart-picker"><div className="tbd-custom-dart-picker-heading">{label}</div><div className="tbd-custom-dart-options">{dartOptions.map(option => <button key={option.value} type="button" className={`tbd-custom-dart-option is-${option.tone} ${value === option.value ? 'is-selected' : ''}`} onClick={() => setValue(option.value)}>{option.label}</button>)}</div></div>;
}

const reserveGolfReactions = [
  'KEEP SWINGING.',
  'NEXT TEE.',
  'PUT IT ON THE CARD.',
  'THAT\'S GOLF.',
  'MOVE ON.',
  'PLAY THE NEXT ONE.',
  'ONE SHOT AT A TIME.',
  'KEEP IT IN PLAY.',
  'BACK TO WORK.',
  'FIND THE FAIRWAY.',
  'JUST HIT THE NEXT SHOT.',
  'NO GIMMES HERE.',
  'MAKE THE NEXT ONE COUNT.',
  'KEEP THE BALL ROLLING.',
  'GET AFTER THE NEXT HOLE.',
  'CARD IT AND GO.',
  'ONTO THE NEXT.',
  'KEEP GRINDING.',
  'STAY IN THE ROUND.',
  'SHORT MEMORY.',
  'RESET AND THROW.',
  'JUST KEEP PLAYING.',
  'THE SCORECARD REMEMBERS EVERYTHING.',
  'GOLF IS A STUPID GAME.',
  'SOMETIMES YOU STRIPE IT. SOMETIMES YOU DON\'T.',
  'NEXT SHOT.',
  'KEEP IT MOVING.',
  'PLAY YOUR GAME.',
  'STICK WITH IT.',
  'THE ROUND AIN\'T OVER.',
  'KEEP THE CARD HONEST.',
  'FIND SOME SHORT GRASS.',
  'SWING AGAIN.',
  'STILL GOT HOLES LEFT.',
  'GO MAKE ONE.',
  'GET ONE BACK.',
  'KEEP THROWING.',
  'PUT A NUMBER DOWN.',
  'THERE\'S ALWAYS THE NEXT HOLE.',
  'GOLF, BABY.'
];

function reserveReaction(usedReactionTexts, player, activeHole, scoreKey) {
  const text = pickUnusedReaction(
    reserveGolfReactions,
    usedReactionTexts,
    player?.id,
    activeHole,
    `reserve_${scoreKey}`
  );
  if (!text) {
    return {
      text: `HOLE ${activeHole}. NEW SHIT, SAME ROUND.`,
      tone: 'golf'
    };
  }
  return { text, tone: 'golf' };
}

function ScoreModal({ player, players, activeHole, currentKey, usedReactionTexts, onUseReaction, onScore, onClear, onClose }) {
  const [dartOne, setDartOne] = useState('');
  const [dartTwo, setDartTwo] = useState('');
  const [dartAnnouncement, setDartAnnouncement] = useState(null);
  const dartResult = scoreTwoDarts(dartOne, dartTwo);

  function chooseDart(setter, value, otherDart) {
    setter(value);
    if (!otherDart || dartAnnouncement) return;
    const nextDartOne = setter === setDartOne ? value : otherDart;
    const nextDartTwo = setter === setDartTwo ? value : otherDart;
    const result = scoreTwoDarts(nextDartOne, nextDartTwo);
    if (!result.scoreKey) return;
    const sequenceReaction = dartReactionForSequence(
      nextDartOne,
      nextDartTwo,
      result.reactionKey ?? result.scoreKey,
      player,
      activeHole,
      usedReactionTexts
    );
    const sequenceTone = reactionToneForSequence(nextDartOne, nextDartTwo);

    const finalReaction = finalHoleReaction(player, players, activeHole, result.scoreKey, usedReactionTexts);
    const streakReaction = finalReaction || result.reactionKey === 'double_hazard'
      ? null
      : contextualDartReaction(player, activeHole, result.scoreKey, nextDartOne, nextDartTwo, usedReactionTexts);
    const scorecardReaction = finalReaction || result.reactionKey === 'double_hazard' || streakReaction
      ? null
      : matchupReaction(player, players, activeHole, result.scoreKey, usedReactionTexts);
    const holeReaction = finalReaction || result.reactionKey === 'double_hazard' || streakReaction || scorecardReaction
      ? null
      : difficultHoleReaction(player, activeHole, result.scoreKey, nextDartOne, nextDartTwo, usedReactionTexts);

    const hasHazard = nextDartOne === 'hazard' || nextDartTwo === 'hazard';
    const sequenceChoice = sequenceReaction ? { text: sequenceReaction, tone: sequenceTone } : null;

    const chosenReaction =
      (finalReaction?.text ? finalReaction : null) ||
      (hasHazard
        ? sequenceChoice || reserveReaction(usedReactionTexts, player, activeHole, result.scoreKey)
        : (streakReaction?.text ? streakReaction : null) ||
          (scorecardReaction?.text ? scorecardReaction : null) ||
          (holeReaction?.text ? holeReaction : null) ||
          sequenceChoice ||
          reserveReaction(usedReactionTexts, player, activeHole, result.scoreKey));

    if (chosenReaction.text) onUseReaction?.(chosenReaction.text);

    setDartAnnouncement({
      ...result,
      reactionText: chosenReaction.text,
      reactionTone: chosenReaction.tone
    });
    window.setTimeout(() => onScore(result.scoreKey), 1850);
  }

  return <div className="tbd-score-modal-shell"><div className="card tbd-score-modal-card"><div className="tbd-score-modal-title-row"><div><p className="eyebrow">Hole {activeHole}</p><h2>{player.name}</h2></div><button className="button secondary" onClick={onClose}>Close</button></div><div className="tbd-dart-score-card"><p className="eyebrow">Score by Darts</p><div className="tbd-dart-select-grid has-custom-dart-pickers"><DartChoiceGroup label="Dart 1" value={dartOne} setValue={value => chooseDart(setDartOne, value, dartTwo)} /><DartChoiceGroup label="Dart 2" value={dartTwo} setValue={value => chooseDart(setDartTwo, value, dartOne)} /></div>{!dartAnnouncement && <div className="rule-answer" style={{ marginTop: '12px' }}><strong>{dartResult.title}</strong><p style={{ margin: '6px 0 0' }}>{dartResult.answer}</p></div>}</div><div className="tbd-quick-score-section"><p className="eyebrow">Quick Score</p><div className="tbd-quick-score-grid">{scoreResults.map(result => <button key={result.key} className={`button ${currentKey === result.key ? 'primary' : 'secondary'}`} onClick={() => onScore(result.key)}><span>{result.label}</span><strong>{fmt(result.score)}</strong></button>)}</div></div><button className="button ghost" style={{ marginTop: '12px' }} onClick={onClear}>Clear score</button></div>{dartAnnouncement && <div role="status" aria-live="assertive" className={`tbd-dart-announcement is-${dartAnnouncement.reactionKey ?? dartAnnouncement.scoreKey} tone-${dartAnnouncement.reactionTone ?? 'golf'}`}><div className="tbd-dart-announcement-card"><span className="tbd-dart-announcement-hole">Hole {activeHole}</span><strong className="tbd-dart-announcement-reaction">{dartAnnouncement.reactionText ?? dartReactionByScoreKey[dartAnnouncement.reactionKey ?? dartAnnouncement.scoreKey]}</strong><span className="tbd-dart-announcement-result">{dartAnnouncement.title}</span><strong className="tbd-dart-announcement-score">{fmt(scoreByKey.get(dartAnnouncement.scoreKey)?.score ?? 0)}</strong>{dartAnnouncement.capNote && <span className="tbd-dart-announcement-cap-note">{dartAnnouncement.capNote}</span>}</div></div>}</div>;
}

export default function Home() {
  const [players, setPlayers] = useState(defaults);
  const [usedReactionTexts, setUsedReactionTexts] = useState([]);
  const [activeHole, setActiveHole] = useState(1);
  const [status, setStatus] = useState('');
  const [historyStatus, setHistoryStatus] = useState('');
  const [history, setHistory] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showScorecard, setShowScorecard] = useState(false);
  const [showRoundComplete, setShowRoundComplete] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showPlayerProfiles, setShowPlayerProfiles] = useState(false);
  const [showRemovePlayer, setShowRemovePlayer] = useState(false);
  const [playerPickerTargetId, setPlayerPickerTargetId] = useState(null);
  const [showScoringMode, setShowScoringMode] = useState(false);
  const [savedGameId, setSavedGameId] = useState(null);
  const [isRoundDirty, setIsRoundDirty] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [scoringMenuOpen, setScoringMenuOpen] = useState(false);
  const [scoringPlayerId, setScoringPlayerId] = useState(null);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const lastAutoAdvanceHoleRef = useRef(null);
  const autoAdvanceArmedHoleRef = useRef(null);
  const autoAdvanceTimeoutRef = useRef(null);
  const holeChangeTimeoutRef = useRef(null);
  const holeSettleTimeoutRef = useRef(null);
  const wakeLockRef = useRef(null);
  const noSleepRef = useRef(null);
  const autosaveTimeoutRef = useRef(null);
  const autosaveInFlightRef = useRef(false);

  const comparableLeaderHoles = useMemo(
    () => holes.filter(hole => players.length > 0 && players.every(player => scoreByKey.has(player.scores[hole]))),
    [players]
  );
  const leaderScore = useMemo(() => {
    if (!players.length || !comparableLeaderHoles.length) return null;
    return Math.min(...players.map(player => totalForHoles(player, comparableLeaderHoles)));
  }, [players, comparableLeaderHoles]);
  const isActiveHoleComplete = players.length > 0 && players.every(player => scoreByKey.has(player.scores[activeHole]));
  const honoursIndex = useMemo(() => getHonoursIndex(players, activeHole), [players, activeHole]);
  const scoringPlayer = players.find(player => player.id === scoringPlayerId);

  useEffect(() => {
    let cancelled = false;

    async function restoreInProgressRound() {
      try {
        const ownerKey = getOwnerKey();
        const { data: activeGame, error: activeGameError } = await supabase
          .from('games')
          .select('id,title,played_at,course_name,status')
          .eq('owner_key', ownerKey)
          .eq('status', 'active')
          .order('played_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (activeGameError) throw activeGameError;

        if (activeGame?.id) {
          const { data: rows, error: rowsError } = await supabase
            .from('game_players')
            .select('id,player_id,display_order,total_score,total_strokes,players(id,display_name,is_profile),hole_scores(hole_number,relative_score,strokes,result)')
            .eq('game_id', activeGame.id)
            .order('display_order', { ascending: true });
          if (rowsError) throw rowsError;
          if (cancelled) return;

          const restoredPlayers = playersFromSavedRows(rows ?? []);
          setPlayers(restoredPlayers);
          setActiveHole(firstUnscoredHole(restoredPlayers));
          setSavedGameId(activeGame.id);
          try {
            const rawDraft = window.localStorage.getItem(IN_PROGRESS_ROUND_KEY);
            if (rawDraft) {
              const draft = JSON.parse(rawDraft);
              if (
                draft?.savedGameId === activeGame.id &&
                Array.isArray(draft?.usedReactionTexts)
              ) {
                setUsedReactionTexts(draft.usedReactionTexts.filter(text => typeof text === 'string'));
              }
            }
          } catch (error) {
            console.warn('Could not restore used reaction history.', error);
          }
          setIsRoundDirty(true);
          setShowScoringMode(true);
          setStatus('Round In Progress restored.');
          return;
        }

        const rawDraft = window.localStorage.getItem(IN_PROGRESS_ROUND_KEY);
        if (!rawDraft) return;
        const draft = JSON.parse(rawDraft);
        const restoredPlayers = Array.isArray(draft?.players)
          ? draft.players.filter(player => player && typeof player.id === 'string' && typeof player.name === 'string' && player.scores && typeof player.scores === 'object')
          : [];
        if (cancelled) return;
        if (restoredPlayers.length) setPlayers(restoredPlayers);
        if (Array.isArray(draft?.usedReactionTexts)) setUsedReactionTexts(draft.usedReactionTexts.filter(text => typeof text === 'string'));
        if (Number.isInteger(draft?.activeHole) && draft.activeHole >= 1 && draft.activeHole <= 18) setActiveHole(draft.activeHole);
        setSavedGameId(typeof draft?.savedGameId === 'string' ? draft.savedGameId : null);
        setIsRoundDirty(typeof draft?.isRoundDirty === 'boolean' ? draft.isRoundDirty : true);
        setShowScoringMode(Boolean(draft?.showScoringMode) || hasRoundScores(restoredPlayers));
        if (hasRoundScores(restoredPlayers)) setStatus('Round In Progress restored.');
      } catch (error) {
        console.warn('Could not restore in-progress round.', error);
      } finally {
        if (!cancelled) setDraftHydrated(true);
      }
    }

    restoreInProgressRound();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!draftHydrated) return;

    try {
      window.localStorage.setItem(IN_PROGRESS_ROUND_KEY, JSON.stringify({
        players,
        usedReactionTexts,
        activeHole,
        showScoringMode,
        savedGameId,
        isRoundDirty,
        updatedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.warn('Could not persist in-progress round.', error);
    }
  }, [draftHydrated, players, usedReactionTexts, activeHole, showScoringMode, savedGameId, isRoundDirty]);

  function markRoundDirty() { setIsRoundDirty(true); setStatus(''); }
  function recordReaction(text) {
    if (!text) return;
    setUsedReactionTexts(current => {
      if (current.includes(text)) return current;
      const next = [...current, text];

      try {
        const rawDraft = window.localStorage.getItem(IN_PROGRESS_ROUND_KEY);
        const draft = rawDraft ? JSON.parse(rawDraft) : {};
        window.localStorage.setItem(IN_PROGRESS_ROUND_KEY, JSON.stringify({
          ...draft,
          players,
          usedReactionTexts: next,
          activeHole,
          showScoringMode,
          savedGameId,
          isRoundDirty,
          updatedAt: new Date().toISOString()
        }));
      } catch (error) {
        console.warn('Could not persist used reaction history.', error);
      }

      return next;
    });
  }
  function updateScoreForHole(playerId, score, hole) { markRoundDirty(); setPlayers(current => current.map(player => player.id === playerId ? { ...player, scores: { ...player.scores, [hole]: score } } : player)); }
  function updateScore(playerId, score) {
    autoAdvanceArmedHoleRef.current = activeHole;
    updateScoreForHole(playerId, score, activeHole);
  }
  function updateName(playerId, name) { markRoundDirty(); setPlayers(current => current.map(player => player.id === playerId && player.isGuest ? { ...player, name, playerId: null } : player)); }
  function openPlayerPicker(playerId = null) { setPlayerPickerTargetId(playerId); setShowPlayerProfiles(true); }
  function closePlayerPicker() { setShowPlayerProfiles(false); setPlayerPickerTargetId(null); }
  function addPlayer() { openPlayerPicker(null); }
  function choosePlayer(playerId) { openPlayerPicker(playerId); }
  function addGuest() {
    markRoundDirty();
    setPlayers(current => {
      if (playerPickerTargetId) return current.map(player => player.id === playerPickerTargetId ? { ...player, playerId: null, isProfile: false, isGuest: true, name: player.name, scores: player.scores || {} } : player);
      return [...current, { id: crypto.randomUUID(), playerId: null, isProfile: false, isGuest: true, name: `Player ${current.length + 1}`, scores: {} }];
    });
    setPlayerPickerTargetId(null);
  }
  function addSavedProfile(profile) {
    if (!profile?.id) return;
    setPlayers(current => {
      if (current.some(player => player.playerId === profile.id)) return current;
      if (playerPickerTargetId) return current.map(player => player.id === playerPickerTargetId ? { ...player, playerId: profile.id, isProfile: true, isGuest: false, name: profile.display_name, scores: player.scores || {} } : player);
      const placeholderIndex = current.findIndex(player => !player.playerId && !player.isProfile && !player.isGuest && scoredHoleCount(player) === 0);
      if (placeholderIndex >= 0) return current.map((player, index) => index === placeholderIndex ? { ...player, playerId: profile.id, isProfile: true, isGuest: false, name: profile.display_name, scores: {} } : player);
      return [...current, { id: crypto.randomUUID(), playerId: profile.id, isProfile: true, isGuest: false, name: profile.display_name, scores: {} }];
    });
    markRoundDirty();
    setPlayerPickerTargetId(null);
  }
  function removePlayer(playerId) {
    setPlayers(current => {
      if (current.length <= 1) return current;
      const next = current.filter(player => player.id !== playerId);
      if (!next.some(player => player.id === scoringPlayerId)) setScoringPlayerId(null);
      return next;
    });
    setShowRemovePlayer(false);
    markRoundDirty();
  }
  function clearHoleNavigationTimers() {
    if (autoAdvanceTimeoutRef.current) window.clearTimeout(autoAdvanceTimeoutRef.current);
    if (holeChangeTimeoutRef.current) window.clearTimeout(holeChangeTimeoutRef.current);
    if (holeSettleTimeoutRef.current) window.clearTimeout(holeSettleTimeoutRef.current);
    autoAdvanceTimeoutRef.current = null;
    holeChangeTimeoutRef.current = null;
    holeSettleTimeoutRef.current = null;
  }
  function resetRound() {
    clearHoleNavigationTimers();
    if (savedGameId) {
      supabase.from('games').delete().eq('id', savedGameId).eq('status', 'active').then(({ error }) => {
        if (error) console.warn('Could not clear active round.', error);
      });
    }
    try { window.localStorage.removeItem(IN_PROGRESS_ROUND_KEY); } catch {}
    lastAutoAdvanceHoleRef.current = null;
    autoAdvanceArmedHoleRef.current = null;
    setSavedGameId(null);
    setIsRoundDirty(true);
    setStatus('');
    setShowScorecard(false);
    setShowRoundComplete(false);
    setIsAdvancing(false);
    setActiveHole(1);
    setUsedReactionTexts([]);
    setPlayers(current => current.map(player => ({ ...player, scores: {} })));
  }
  function changeHole(nextHole, { manual = false } = {}) {
    const clampedHole = Math.max(1, Math.min(18, nextHole));
    clearHoleNavigationTimers();
    if (manual) autoAdvanceArmedHoleRef.current = null;
    if (clampedHole === activeHole) {
      setIsAdvancing(false);
      return;
    }
    setIsAdvancing(true);
    holeChangeTimeoutRef.current = window.setTimeout(() => {
      setActiveHole(clampedHole);
      holeChangeTimeoutRef.current = null;
      holeSettleTimeoutRef.current = window.setTimeout(() => {
        setIsAdvancing(false);
        holeSettleTimeoutRef.current = null;
      }, 620);
    }, 120);
  }
  function goToPreviousHole() { if (activeHole > 1) changeHole(activeHole - 1, { manual: true }); }
  function goToNextHole() { if (activeHole < 18) changeHole(activeHole + 1, { manual: true }); }
  function saveButtonLabel() { if (isSaving) return 'Saving...'; if (savedGameId && !isRoundDirty) return 'Saved'; if (savedGameId && isRoundDirty) return 'Save changes'; return 'Save round'; }
  function applyScore(playerId, scoreKey) { updateScore(playerId, scoreKey); setScoringPlayerId(null); }
  function clearScore(playerId) { updateScore(playerId, ''); setScoringPlayerId(null); }

  useEffect(() => {
    if (showScoringMode && currentRoundComplete(players)) setShowRoundComplete(true);
  }, [showScoringMode, players]);

  useEffect(() => {
    if (!showScoringMode || !isActiveHoleComplete || activeHole >= 18) return;
    if (autoAdvanceArmedHoleRef.current !== activeHole || lastAutoAdvanceHoleRef.current === activeHole) return;

    lastAutoAdvanceHoleRef.current = activeHole;
    autoAdvanceTimeoutRef.current = window.setTimeout(() => {
      autoAdvanceTimeoutRef.current = null;
      autoAdvanceArmedHoleRef.current = null;
      changeHole(activeHole + 1);
    }, 760);

    return () => {
      if (autoAdvanceTimeoutRef.current) {
        window.clearTimeout(autoAdvanceTimeoutRef.current);
        autoAdvanceTimeoutRef.current = null;
      }
    };
  }, [showScoringMode, isActiveHoleComplete, activeHole]);

  useEffect(() => () => clearHoleNavigationTimers(), []);

  useEffect(() => {
    let cancelled = false;
    let retryTimeout = null;

    function enableNoSleepFallback() {
      if (cancelled || !showScoringMode) return;
      try {
        if (!noSleepRef.current) noSleepRef.current = new NoSleep();
        noSleepRef.current.enable();
      } catch {
        // iOS may require this to be triggered by a user interaction.
      }
    }

    function disableNoSleepFallback() {
      try { noSleepRef.current?.disable(); } catch {}
    }

    async function releaseWakeLock() {
      const lock = wakeLockRef.current;
      wakeLockRef.current = null;
      if (!lock) return;
      try {
        await lock.release();
      } catch {
        // Wake lock may already have been released by the browser.
      }
    }

    function scheduleWakeLockRetry(delay = 350) {
      if (cancelled || !showScoringMode || retryTimeout) return;
      retryTimeout = window.setTimeout(() => {
        retryTimeout = null;
        requestWakeLock();
      }, delay);
    }

    async function requestWakeLock() {
      if (cancelled || !showScoringMode || document.visibilityState !== 'visible') return;
      if (!('wakeLock' in navigator) || wakeLockRef.current) return;

      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled || !showScoringMode) {
          await lock.release().catch(() => {});
          return;
        }

        wakeLockRef.current = lock;
        lock.addEventListener('release', () => {
          if (wakeLockRef.current === lock) wakeLockRef.current = null;
          if (!cancelled && showScoringMode && document.visibilityState === 'visible') {
            scheduleWakeLockRetry();
          }
        }, { once: true });
      } catch {
        // Restored mobile sessions can reject the first request while the page is
        // becoming active. Retry shortly, and again on focus/interaction below.
        scheduleWakeLockRetry(500);
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible' && showScoringMode) {
        requestWakeLock();
      }
    }

    function handleForegroundReturn() {
      if (showScoringMode && document.visibilityState === 'visible') {
        requestWakeLock();
      }
    }

    function handleUserInteraction() {
      if (!showScoringMode || document.visibilityState !== 'visible') return;
      if (!wakeLockRef.current) requestWakeLock();
      enableNoSleepFallback();
    }

    if (showScoringMode) {
      requestWakeLock();
      scheduleWakeLockRetry(750);
    } else {
      releaseWakeLock();
      disableNoSleepFallback();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleForegroundReturn);
    window.addEventListener('pageshow', handleForegroundReturn);
    document.addEventListener('pointerdown', handleUserInteraction, { passive: true });
    document.addEventListener('touchstart', handleUserInteraction, { passive: true });

    return () => {
      cancelled = true;
      if (retryTimeout) window.clearTimeout(retryTimeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleForegroundReturn);
      window.removeEventListener('pageshow', handleForegroundReturn);
      document.removeEventListener('pointerdown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      releaseWakeLock();
      disableNoSleepFallback();
    };
  }, [showScoringMode]);

  async function sendCompletedRoundEmails(gameId) {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) return { sent: 0, skipped: 'No signed-in participant.' };

    const response = await fetch('/api/email/round-results', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({ gameId })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Could not send post-game emails.');
    return payload;
  }

  async function cleanupFailedGame(gameId) { if (!gameId) return; await supabase.from('games').delete().eq('id', gameId); }
  async function writeRoundRows(gameId, roundPlayers = players) {
    const { error: deleteError } = await supabase.from('game_players').delete().eq('game_id', gameId);
    if (deleteError) throw new Error(deleteError.message || 'Could not clear previous saved player rows.');
    for (const [index, player] of roundPlayers.entries()) {
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
  async function autosaveActiveRound(roundPlayers) {
    if (autosaveInFlightRef.current || !isRoundDirty || !hasRoundScores(roundPlayers)) return;
    autosaveInFlightRef.current = true;
    const ownerKey = getOwnerKey();
    let gameId = savedGameId;
    try {
      if (gameId) {
        const { data: updatedGames, error: updateError } = await supabase
          .from('games')
          .update({ course_name: 'Round In Progress' })
          .eq('id', gameId)
          .eq('owner_key', ownerKey)
          .eq('status', 'active')
          .select('id');
        if (updateError) throw updateError;
        if (!updatedGames?.length) return;
      } else {
        const { data: game, error: gameError } = await supabase.from('games').insert({
          owner_key: ownerKey,
          title: `Two Ball Darts - ${new Date().toLocaleDateString()}`,
          course_name: 'Round In Progress',
          status: 'active'
        }).select('id').single();
        if (gameError || !game) throw gameError || new Error('Could not create Round In Progress.');
        gameId = game.id;
        setSavedGameId(gameId);
      }
      await writeRoundRows(gameId, roundPlayers);
    } catch (error) {
      console.warn('Round In Progress autosave failed.', error);
    } finally {
      autosaveInFlightRef.current = false;
    }
  }

  useEffect(() => {
    if (!draftHydrated || !showScoringMode || isSaving || !isRoundDirty || !hasRoundScores(players)) return;
    if (autosaveTimeoutRef.current) window.clearTimeout(autosaveTimeoutRef.current);
    const snapshot = players.map(player => ({ ...player, scores: { ...player.scores } }));
    autosaveTimeoutRef.current = window.setTimeout(() => {
      autosaveTimeoutRef.current = null;
      autosaveActiveRound(snapshot);
    }, 500);
    return () => {
      if (autosaveTimeoutRef.current) {
        window.clearTimeout(autosaveTimeoutRef.current);
        autosaveTimeoutRef.current = null;
      }
    };
  }, [draftHydrated, players, showScoringMode, isSaving, isRoundDirty]);

  async function saveRound() {
    if (savedGameId && !isRoundDirty) { setStatus('Round already saved. Change a player or score to save updates.'); return; }
    if (autosaveTimeoutRef.current) {
      window.clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }
    setIsSaving(true); setStatus('Saving round...');
    while (autosaveInFlightRef.current) {
      await new Promise(resolve => window.setTimeout(resolve, 50));
    }
    const ownerKey = getOwnerKey(); const roundLabel = currentRoundComplete(players) ? 'Official 18' : 'Incomplete round'; let gameId = savedGameId; let createdNewGame = false;
    try {
      if (gameId) { const { error: gameUpdateError } = await supabase.from('games').update({ course_name: roundLabel, status: 'complete' }).eq('id', gameId).eq('owner_key', ownerKey); if (gameUpdateError) throw new Error(gameUpdateError.message || 'Could not update saved round.'); }
      else { const { data: game, error: gameError } = await supabase.from('games').insert({ owner_key: ownerKey, title: `Two Ball Darts - ${new Date().toLocaleDateString()}`, course_name: roundLabel, status: 'complete' }).select('id,title,played_at,course_name').single(); if (gameError || !game) throw new Error(gameError?.message || 'Could not create saved round.'); gameId = game.id; createdNewGame = true; }
      await writeRoundRows(gameId);
      setSavedGameId(gameId);
      setIsRoundDirty(false);
      if (autosaveTimeoutRef.current) {
        window.clearTimeout(autosaveTimeoutRef.current);
        autosaveTimeoutRef.current = null;
      }
      try { window.localStorage.removeItem(IN_PROGRESS_ROUND_KEY); } catch {}

      let emailStatus = '';
      if (currentRoundComplete(players)) {
        try {
          const emailResult = await sendCompletedRoundEmails(gameId);
          if (emailResult?.alreadySent) emailStatus = ' Results were already emailed.';
          else if (emailResult?.sent > 0) emailStatus = ` ${emailResult.sent} result email${emailResult.sent === 1 ? '' : 's'} sent.`;
        } catch (emailError) {
          console.warn('Round saved, but post-game email failed.', emailError);
          emailStatus = ' Result email could not be sent.';
        }
      }

      setStatus(`Round saved as ${roundLabel}.${emailStatus}`);
      if (currentRoundComplete(players)) {
        setSelectedGame(null);
        setSelectedRows([]);
        setShowRoundComplete(true);
        await loadHistory();
      } else {
        await loadHistory(gameId);
      }
    } catch (error) { if (createdNewGame) await cleanupFailedGame(gameId); setStatus(`Save failed: ${error.message}`); }
    finally { setIsSaving(false); }
  }
  async function enrichGamesWithPlayers(games) { if (!games?.length) return []; const gameIds = games.map(game => game.id); const { data: rows, error } = await supabase.from('game_players').select('id,game_id,player_id,display_order,total_score,total_strokes,players(id,display_name,is_profile),hole_scores(hole_number)').in('game_id', gameIds).order('display_order', { ascending: true }); if (error) { setHistoryStatus(error.message); return games; } return games.map(game => ({ ...game, game_players: (rows ?? []).filter(row => row.game_id === game.id) })); }
  async function loadHistory(gameIdToOpen) { setHistoryStatus('Loading saved rounds...'); const ownerKey = getOwnerKey(); const { data, error } = await supabase.from('games').select('id,title,played_at,course_name,status').eq('owner_key', ownerKey).order('played_at', { ascending: false }).limit(12); if (error) { setHistoryStatus(error.message); return; } const enriched = await enrichGamesWithPlayers(data ?? []); const visible = enriched.filter(game => savedRoundPlayers(game).length > 0); setHistory(visible); setHistoryStatus(visible.length ? `${visible.length} saved round${visible.length === 1 ? '' : 's'} loaded.` : 'No saved rounds found for this browser.'); if (gameIdToOpen) { const game = visible.find(item => item.id === gameIdToOpen); if (game) await viewSavedGame(game); } }
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
    autoAdvanceArmedHoleRef.current = null;
    clearHoleNavigationTimers();
    setStatus('Incomplete round resumed.');
    setHistoryStatus('Incomplete round resumed.');
  }

  return <main className="app-shell">
    {!showScoringMode && <section className="hero-card"><LogoMark /><div className="hero-copy"><p className="eyebrow">18 holes · 2 darts per hole · all holes par 3</p><h1>No gimmes. Just throw.</h1><p>Golf-course scoring for the dartboard. Play holes 1 through 18 by throwing two darts at each number. Lowest score wins.</p><div className="hero-actions"><button className="button primary" onClick={() => setShowScoringMode(true)}>{hasRoundScores(players) ? 'Resume Scoring' : 'Start New Round'}</button><button className="button secondary" onClick={() => setShowHowToPlay(true)}>How to Play</button><button className="button secondary" onClick={() => loadHistory()}>Saved Rounds</button></div></div></section>}
    <section className={`card ${currentRoundComplete(players) ? 'tbd-round-complete' : ''}`} id="scorecard" style={{ paddingTop: showScoringMode ? '22px' : '18px' }}>
      <div className="section-heading" style={{ marginBottom: '12px', alignItems: 'center' }}><div><p className="eyebrow" style={{ margin: 0 }}>{showScoringMode ? 'Scoring Mode' : 'Live round'}</p>{!showScoringMode && <p style={{ margin: '6px 0 0', color: '#fff4d6', fontWeight: 900 }}>Start or resume a round to enter scores.</p>}</div>{!showScoringMode && <div className="actions-inline"><button className="button secondary" onClick={() => setShowScoringMode(true)}>{hasRoundScores(players) ? 'Resume Scoring' : 'Start New Round'}</button><button className="button secondary" onClick={addPlayer}>Add player</button><button className="button ghost" onClick={resetRound}>Reset</button><button className="button primary" disabled={isSaving || (Boolean(savedGameId) && !isRoundDirty)} onClick={saveRound}>{saveButtonLabel()}</button></div>}</div>
      {showScoringMode && <div className="tbd-scoring-header" style={{ display: 'grid', gap: '8px', marginBottom: '10px' }}><div style={{ padding: '2px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', minHeight: '52px' }}><img src="/brand/twoball-logo-tm.svg" alt="TwoBall Darts" style={{ display: 'block', width: 'min(165px, 41vw)', maxHeight: '45px', objectFit: 'contain', flexShrink: 0 }} /><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', whiteSpace: 'nowrap', lineHeight: 1 }}><span style={{ color: '#d0a948', fontSize: '.66rem', fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase' }}>Hole</span><strong style={{ color: '#fff4d6', fontSize: 'clamp(1.5rem, 6vw, 2rem)', lineHeight: 1, fontWeight: 900 }}>{activeHole}</strong><span style={{ color: '#c6ad67', fontSize: '.75rem', fontWeight: 800 }}>/18</span><span style={{ color: '#9bb4a1', fontSize: '.62rem', fontWeight: 800, marginLeft: '4px' }}>PAR 3</span></div></div><GameplayAdSlot /></div>}
      {!showScoringMode && <div className="hole-picker" style={{ marginBottom: '12px' }}>{holes.map(hole => <button key={hole} className={hole === activeHole ? 'active' : ''} onClick={() => setActiveHole(hole)}>{hole}</button>)}</div>}
      <div className={`active-hole-panel ${isAdvancing ? 'tbd-hole-advancing' : ''}`} style={{ padding: '14px', marginBottom: '16px' }}><div className="tbd-hole-title-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '10px', minWidth: 0 }}><h3 style={{ fontSize: '1.55rem', marginBottom: 0, flexShrink: 0 }}>Hole {activeHole}</h3>{showScoringMode && <div className="tbd-scoring-nav" style={{ display: 'flex', gap: '5px', alignItems: 'center', minWidth: 0 }}><button className="button secondary" disabled={activeHole === 1} onClick={goToPreviousHole} style={{ opacity: activeHole === 1 ? .45 : 1, minWidth: 0, padding: '8px 6px', fontSize: '1.4rem', fontWeight: 900, background: '#e6a348', color: '#251408', borderColor: '#ffcf73', minHeight: '48px', minWidth: '48px' }} aria-label="Previous hole">❮</button><button className="button primary" disabled={activeHole === 18} onClick={goToNextHole} style={{ opacity: activeHole === 18 ? .45 : 1, minWidth: 0, padding: '8px 6px', fontSize: '1.4rem', fontWeight: 900, background: '#19885b', color: '#fff4d6', borderColor: '#64cfa0', minHeight: '48px', minWidth: '48px' }} aria-label="Next hole">❯</button><ScoringMenu isOpen={scoringMenuOpen} setIsOpen={setScoringMenuOpen} addPlayer={addPlayer} openRemovePlayer={() => setShowRemovePlayer(true)} canRemovePlayer={players.length > 1} resetRound={resetRound} saveRound={saveRound} saveDisabled={isSaving || (Boolean(savedGameId) && !isRoundDirty)} saveLabel={saveButtonLabel()} exitScoring={() => setShowScoringMode(false)} /></div>}</div><div className="tbd-live-score-list">{players.map((player, index) => { const result = scoreByKey.get(player.scores[activeHole]); const playerTotal = total(player); const comparableTotal = totalForHoles(player, comparableLeaderHoles); const isLeader = leaderScore !== null && comparableTotal === leaderScore; return <PlayerScoringRow key={player.id} player={player} result={result} totalScore={playerTotal} isLeader={isLeader} hasHonours={index === honoursIndex} openScore={setScoringPlayerId} updateName={updateName} choosePlayer={choosePlayer} />; })}</div>{isActiveHoleComplete && <div style={{ marginTop: '16px', border: '2px solid rgba(208,169,72,.72)', borderRadius: '16px', padding: '14px', background: 'linear-gradient(135deg, rgba(208,169,72,.18), rgba(6,57,39,.62))' }}><strong style={{ display: 'block', fontSize: '1.25rem', color: '#fff4d6' }}>{activeHole === 18 ? 'Round complete' : `Hole ${activeHole} complete`}</strong><span style={{ display: 'block', marginTop: '4px', color: '#d0a948', fontWeight: 900 }}>{activeHole === 18 ? 'Every player has a score for 18.' : 'Every player has a score for this hole.'}</span></div>}</div>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: showScorecard ? '12px' : 0 }}><button className="button secondary" onClick={() => setShowScorecard(current => !current)}>{showScorecard ? 'Hide Scorecard' : 'Show Scorecard'}</button></div>{showScorecard && <LiveScorecard players={players} />}{status && <p className="status-line">{status}</p>}
    </section>
    {!showScoringMode && <section className="card"><div className="section-heading compact"><div><p className="eyebrow">Supabase history</p><h2>Saved rounds</h2></div><button className="button secondary" onClick={() => loadHistory()}>Load</button></div>{historyStatus && <p className="status-line">{historyStatus}</p>}<div className="history-list">{history.map(game => <div className="history-row" key={game.id}><strong>{game.title}</strong><span>{new Date(game.played_at).toLocaleString()} · {savedRoundLabel(game)}</span><span>{savedRoundSummary(game)}</span>{!isSavedRoundComplete(game) && <button className="button secondary" style={{ marginTop: '10px', marginRight: '8px' }} onClick={() => resumeSavedGame(game)}>Resume Round</button>}<button className="button primary" style={{ marginTop: '10px' }} onClick={() => viewSavedGame(game)}>View Scorecard</button></div>)}</div></section>}
    {!showScoringMode && <footer style={{ marginTop: '22px', border: '2px solid rgba(208,169,72,.72)', borderRadius: '22px', padding: '18px', background: 'linear-gradient(180deg, rgba(6,57,39,.88), rgba(2,20,15,.96))', boxShadow: '0 18px 44px rgba(0,0,0,.35)' }}><div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 240px) 1fr', gap: '16px', alignItems: 'center' }}><img src="/brand/twoball-logo-tm.svg" alt="TWO BALL DARTS™" style={{ width: '100%', height: 'auto', objectFit: 'contain', display: 'block' }} /><div><span style={{ color: '#d0a948', fontWeight: 900 }}>No gimmes. Just throw.</span><p style={{ margin: '6px 0 0', color: '#f5e8c6' }}>18 holes. Two darts per hole. Bulls, 19s, and 20s are hazards.</p></div></div></footer>}
    <PlayerProfilesModal open={showPlayerProfiles} onClose={closePlayerPicker} onSelectProfile={addSavedProfile} onAddGuest={addGuest} activePlayerIds={players.map(player => player.playerId).filter(Boolean)} /><RemovePlayerModal open={showRemovePlayer} players={players} onRemove={removePlayer} onClose={() => setShowRemovePlayer(false)} />{scoringPlayer && <ScoreModal player={scoringPlayer} players={players} usedReactionTexts={usedReactionTexts} onUseReaction={recordReaction} activeHole={activeHole} currentKey={scoringPlayer.scores[activeHole] || ''} onScore={scoreKey => applyScore(scoringPlayer.id, scoreKey)} onClear={() => clearScore(scoringPlayer.id)} onClose={() => setScoringPlayerId(null)} />}{showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}<SavedScorecard game={selectedGame} rows={selectedRows} onClose={() => { setSelectedGame(null); setSelectedRows([]); }} />{showRoundComplete && <RoundCompleteModal players={players} onClose={() => setShowRoundComplete(false)} onMainMenu={() => { setShowRoundComplete(false); resetRound(); setShowScoringMode(false); }} onNewRound={() => { setShowRoundComplete(false); resetRound(); setShowScoringMode(true); }} />}
  </main>;
}

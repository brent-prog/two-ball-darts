const fallback = {
  title: 'Official rule check',
  matchedRule: 'general_rules',
  answer: 'Play holes 1-18. The hole number is the target. Each player throws exactly two darts. Score each hole against par. Bulls count for nothing, but a bull is still an on-board miss.'
};

const patterns = [
  {
    test: q => hasAny(q, ['tie', 'tied', 'tiebreak', 'tie break', 'closest']),
    response: { title: 'Tie-break', matchedRule: 'tie_break', answer: 'After 18 holes, if players are tied, each tied player throws one dart. Closest to the bullseye wins.' }
  },
  {
    test: q => hasAny(q, ['bull', 'bullseye', 'cork']),
    response: { title: 'Bulls and cork', matchedRule: 'bulls_count_for_nothing', answer: 'Bulls count for nothing - ever. A bull is still on-board, so it counts as an on-board miss. If it sticks anywhere in the cork or board, it is on-board and OK.' }
  },
  {
    test: q => isTwoDoubleOrTripleTargets(q),
    response: { title: 'Eagle', matchedRule: 'eagle', answer: 'Both darts hitting DOUBLE or TRIPLE of the target number is EAGLE. On a par 3 hole, that records as 1 stroke.' }
  },
  {
    test: q => hasOneSingleTarget(q) && hasOneDoubleOrTripleTarget(q),
    response: { title: 'Birdie', matchedRule: 'birdie', answer: 'One SINGLE target hit plus one DOUBLE/TRIPLE target hit is BIRDIE. On a par 3 hole, that records as 2 strokes.' }
  },
  {
    test: q => hasOneSingleTarget(q) && hasOffBoard(q),
    response: { title: 'Double bogey', matchedRule: 'single_target_off_board', answer: 'One SINGLE target hit plus one off-board dart is DOUBLE BOGEY. On a par 3 hole, that records as 5 strokes.' }
  },
  {
    test: q => hasOneDoubleOrTripleTarget(q) && hasOffBoard(q),
    response: { title: 'Bogey', matchedRule: 'double_triple_off_board', answer: 'One DOUBLE/TRIPLE target plus one off-board dart is BOGEY. On a par 3 hole, that records as 4 strokes.' }
  },
  {
    test: q => hasOneDoubleOrTripleTarget(q) && hasOnBoardMiss(q),
    response: { title: 'Par', matchedRule: 'double_triple_on_board_miss', answer: 'One DOUBLE/TRIPLE target plus one on-board miss is PAR. On a par 3 hole, that records as 3 strokes.' }
  },
  {
    test: q => hasTwoSingleTargets(q),
    response: { title: 'Par', matchedRule: 'two_single_targets', answer: 'Two SINGLE target hits is PAR. On a par 3 hole, that records as 3 strokes.' }
  },
  {
    test: q => hasNoTargetHits(q) && hasOffBoard(q),
    response: { title: 'Triple bogey', matchedRule: 'no_target_hits_off_board', answer: 'No target hits plus at least one off-board dart is TRIPLE BOGEY. On a par 3 hole, that records as 6 strokes.' }
  },
  {
    test: q => hasNoTargetHits(q),
    response: { title: 'Double bogey', matchedRule: 'no_target_hits_on_board', answer: 'No target hits with both darts on-board is DOUBLE BOGEY. On a par 3 hole, that records as 5 strokes.' }
  },
  {
    test: q => hasOffBoard(q),
    response: { title: 'Off the board', matchedRule: 'off_the_board', answer: 'Off the board literally means off the board. If the dart sticks anywhere in the cork or board, it is on-board. Max damage on any hole is triple bogey.' }
  },
  {
    test: q => hasAny(q, ['eagle']),
    response: { title: 'Eagle', matchedRule: 'eagle', answer: 'Eagle is both darts hitting DOUBLE or TRIPLE of the target number. On a par 3 hole, that records as 1 stroke.' }
  },
  {
    test: q => hasAny(q, ['birdie']),
    response: { title: 'Birdie', matchedRule: 'birdie', answer: 'Birdie is one dart hitting DOUBLE/TRIPLE target plus one SINGLE target hit. On a par 3 hole, that records as 2 strokes.' }
  }
];

function hasAny(text, words) {
  return words.some(word => text.includes(word));
}

function hasNumberMeaningTwo(text) {
  return hasAny(text, ['two', 'both', '2 darts', '2 dart', '2x', 'x2', 'twice']);
}

function hasOneSingleTarget(text) {
  return hasAny(text, ['single target', 'single of target', 'single on target', 'one single', '1 single', 'hit target with one', 'one dart hit target', 'one dart in target', 'one target hit']) || (hasAny(text, ['single']) && hasAny(text, ['target', 'number']));
}

function hasTwoSingleTargets(text) {
  return hasAny(text, ['two singles', 'two single', 'both single', '2 singles', '2 single']) || (hasNumberMeaningTwo(text) && hasAny(text, ['single target', 'single of target', 'single on target']));
}

function hasOneDoubleOrTripleTarget(text) {
  return hasAny(text, ['double target', 'triple target', 'double of target', 'triple of target', 'double on target', 'triple on target', 'double with', 'triple with']) || (hasAny(text, ['double', 'triple']) && hasAny(text, ['target', 'number']));
}

function isTwoDoubleOrTripleTargets(text) {
  return hasAny(text, ['both doubles', 'both triples', 'two doubles', 'two triples', '2 doubles', '2 triples', 'double double', 'triple triple']) || (hasNumberMeaningTwo(text) && hasAny(text, ['double', 'triple']) && hasAny(text, ['target', 'number'])) || hasAny(text, ['two darts in triple', 'two darts in double', '2 darts in triple', '2 darts in double']);
}

function hasOffBoard(text) {
  return hasAny(text, ['off board', 'off-board', 'off the board', 'miss board', 'missed board']);
}

function hasOnBoardMiss(text) {
  return hasAny(text, ['on board miss', 'on-board miss', 'onboard miss', 'miss on board', 'miss but on board', 'miss but stayed on', 'bull', 'cork']);
}

function hasNoTargetHits(text) {
  return hasAny(text, ['no target', 'no hits', 'no hit', 'zero target', '0 target', 'both miss target', 'both missed target']);
}

export function answerRuleQuestion(question) {
  const q = question
    .toLowerCase()
    .replace(/2nd/g, 'second')
    .replace(/1st/g, 'first')
    .replace(/[?.,!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return patterns.find(pattern => pattern.test(q))?.response ?? fallback;
}

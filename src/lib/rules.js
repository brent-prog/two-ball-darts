const fallback = {
  title: 'Official rule check',
  matchedRule: 'general_rules',
  answer: 'Play holes 1-18. The hole number is the target. Each player throws exactly two darts. Score each hole against par. Bulls count for nothing, but a bull is still an on-board miss.'
};

const patterns = [
  {
    test: q => hasAny(q, ['one dart', 'single', 'single target', 'target with one']) && hasAny(q, ['double', 'triple', 'double with', 'triple with']),
    response: { title: 'Birdie', matchedRule: 'birdie', answer: 'One SINGLE target hit plus one DOUBLE/TRIPLE target hit is BIRDIE.' }
  },
  {
    test: q => hasAny(q, ['both']) && hasAny(q, ['double', 'triple']),
    response: { title: 'Eagle', matchedRule: 'eagle', answer: 'Both darts hitting DOUBLE or TRIPLE of the target number is EAGLE.' }
  },
  {
    test: q => hasAny(q, ['single']) && hasAny(q, ['off board', 'off-board', 'off the board']),
    response: { title: 'Single target + off-board', matchedRule: 'single_target_off_board', answer: 'One SINGLE target hit plus one off-board dart is DOUBLE BOGEY.' }
  },
  {
    test: q => hasAny(q, ['double', 'triple']) && hasAny(q, ['off board', 'off-board', 'off the board']),
    response: { title: 'Double/triple + off-board', matchedRule: 'double_triple_off_board', answer: 'One DOUBLE/TRIPLE target plus one off-board dart is BOGEY.' }
  },
  {
    test: q => hasAny(q, ['double', 'triple']) && hasAny(q, ['miss', 'on board', 'on-board']),
    response: { title: 'Double/triple + on-board miss', matchedRule: 'double_triple_on_board_miss', answer: 'One DOUBLE/TRIPLE target plus one on-board miss is PAR.' }
  },
  {
    test: q => hasAny(q, ['two singles', 'two single', 'both single']),
    response: { title: 'Par', matchedRule: 'two_single_targets', answer: 'Two SINGLE target hits is PAR.' }
  },
  {
    test: q => hasAny(q, ['no target', 'no hits', 'no hit']) && hasAny(q, ['off board', 'off-board', 'off the board']),
    response: { title: 'No target hits + off-board', matchedRule: 'no_target_hits_off_board', answer: 'No target hits plus at least one off-board dart is TRIPLE BOGEY.' }
  },
  {
    test: q => hasAny(q, ['no target', 'no hits', 'no hit']),
    response: { title: 'No target hits', matchedRule: 'no_target_hits_on_board', answer: 'No target hits with both darts on-board is DOUBLE BOGEY.' }
  },
  {
    test: q => hasAny(q, ['tie', 'tied', 'tiebreak', 'tie break', 'closest']),
    response: { title: 'Tie-break', matchedRule: 'tie_break', answer: 'After 18 holes, if players are tied, each tied player throws one dart. Closest to the bullseye wins.' }
  },
  {
    test: q => hasAny(q, ['bull', 'bullseye', 'cork']),
    response: { title: 'Bulls and cork', matchedRule: 'bulls_count_for_nothing', answer: 'Bulls count for nothing - ever. A bull is still on-board, so it counts as an on-board miss. If it sticks anywhere in the cork or board, it is on-board and OK.' }
  },
  {
    test: q => hasAny(q, ['off board', 'off-board', 'off the board']),
    response: { title: 'Off the board', matchedRule: 'off_the_board', answer: 'Off the board literally means off the board. If the dart sticks anywhere in the cork or board, it is on-board. Max damage on any hole is triple bogey.' }
  },
  {
    test: q => hasAny(q, ['eagle']),
    response: { title: 'Eagle', matchedRule: 'eagle', answer: 'Eagle is both darts hitting DOUBLE or TRIPLE of the target number.' }
  },
  {
    test: q => hasAny(q, ['birdie']),
    response: { title: 'Birdie', matchedRule: 'birdie', answer: 'Birdie is one dart hitting DOUBLE/TRIPLE target plus one SINGLE target hit.' }
  }
];

function hasAny(text, words) {
  return words.some(word => text.includes(word));
}

export function answerRuleQuestion(question) {
  const q = question.toLowerCase().replace(/2nd/g, 'second').replace(/1st/g, 'first');
  return patterns.find(pattern => pattern.test(q))?.response ?? fallback;
}

const fallback = {
  title: 'Official rule check',
  matchedRule: 'general_rules',
  answer: 'Play holes 1-18. The hole number is the target. Each player throws exactly two darts. Score each hole against par. Bulls count for nothing, but a bull is still an on-board miss.'
};

const rules = [
  { keywords: ['single', 'off'], response: { title: 'Single target + off-board', matchedRule: 'single_target_off_board', answer: 'One SINGLE target hit plus one off-board dart is DOUBLE BOGEY.' } },
  { keywords: ['double', 'triple', 'off'], response: { title: 'Double/triple + off-board', matchedRule: 'double_triple_off_board', answer: 'One DOUBLE/TRIPLE target plus one off-board dart is BOGEY.' } },
  { keywords: ['double', 'triple', 'miss'], response: { title: 'Double/triple + on-board miss', matchedRule: 'double_triple_on_board_miss', answer: 'One DOUBLE/TRIPLE target plus one on-board miss is PAR.' } },
  { keywords: ['no target'], response: { title: 'No target hits', matchedRule: 'no_target_hits', answer: 'No target hits with both darts on-board is DOUBLE BOGEY. No target hits with at least one off-board dart is TRIPLE BOGEY.' } },
  { keywords: ['tie', 'tied', 'tiebreak', 'closest'], response: { title: 'Tie-break', matchedRule: 'tie_break', answer: 'After 18 holes, if players are tied, each tied player throws one dart. Closest to the bullseye wins.' } },
  { keywords: ['bull', 'bullseye', 'cork'], response: { title: 'Bulls and cork', matchedRule: 'bulls_count_for_nothing', answer: 'Bulls count for nothing - ever. A bull is still on-board, so it counts as an on-board miss. If it sticks anywhere in the cork or board, it is on-board and OK.' } },
  { keywords: ['off'], response: { title: 'Off the board', matchedRule: 'off_the_board', answer: 'Off the board literally means off the board. If the dart sticks anywhere in the cork or board, it is on-board. Max damage on any hole is triple bogey.' } },
  { keywords: ['eagle'], response: { title: 'Eagle', matchedRule: 'eagle', answer: 'Eagle is both darts hitting DOUBLE or TRIPLE of the target number.' } },
  { keywords: ['birdie'], response: { title: 'Birdie', matchedRule: 'birdie', answer: 'Birdie is one dart hitting DOUBLE/TRIPLE target plus one SINGLE target hit.' } }
];

export function answerRuleQuestion(question) {
  const q = question.toLowerCase();
  const exactMatches = rules.filter(rule => rule.keywords.every(keyword => q.includes(keyword)));
  if (exactMatches.length) {
    return exactMatches.sort((a, b) => b.keywords.length - a.keywords.length)[0].response;
  }
  const partial = rules.find(rule => rule.keywords.some(keyword => q.includes(keyword)));
  return partial ? partial.response : fallback;
}

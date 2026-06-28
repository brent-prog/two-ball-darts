export const scoreResults = [
  { key: 'eagle', label: 'Eagle', score: -2, strokes: 1, description: 'Both darts hit DOUBLE or TRIPLE of the target number.' },
  { key: 'birdie', label: 'Birdie', score: -1, strokes: 2, description: 'One dart hits DOUBLE/TRIPLE target + one SINGLE target hit.' },
  { key: 'par', label: 'Par', score: 0, strokes: 3, description: 'Two SINGLE target hits, OR one DOUBLE/TRIPLE target + one on-board miss.' },
  { key: 'bogey', label: 'Bogey', score: 1, strokes: 4, description: 'One SINGLE target hit + one on-board miss, OR one DOUBLE/TRIPLE target + one off-board dart.' },
  { key: 'double_bogey', label: 'Double Bogey', score: 2, strokes: 5, description: 'No target hits with both darts on-board, OR one SINGLE target hit + one off-board dart.' },
  { key: 'triple_bogey', label: 'Triple Bogey', score: 3, strokes: 6, description: 'No target hits + at least one off-board dart.' }
];

export const holes = Array.from({ length: 18 }, (_, index) => index + 1);
export const totalPar = 54;

'use client';

import { useEffect } from 'react';

const RESULT_CLASSES = [
  ['result-eagle', /^Eagle\s+-2$/i],
  ['result-birdie', /^Birdie\s+-1$/i],
  ['result-par', /^Par\s+(E|0)$/i],
  ['result-bogey', /^Bogey\s+\+1$/i],
  ['result-double-bogey', /^Double Bogey\s+\+2$/i],
  ['result-triple-bogey', /^Triple Bogey\s+\+3$/i]
];

const RESULT_CLASS_NAMES = RESULT_CLASSES.map(([name]) => name);

export default function ScoringActionLabelEnhancer() {
  useEffect(() => {
    const refresh = () => {
      document.querySelectorAll('.tbd-player-score-row').forEach(row => {
        const button = row.querySelector(':scope > button.button');
        const status = row.querySelector('.tbd-hole-status')?.textContent?.replace(/\s+/g, ' ').trim() || '';

        row.classList.remove(...RESULT_CLASS_NAMES);

        for (const [className, pattern] of RESULT_CLASSES) {
          if (pattern.test(status)) {
            row.classList.add(className);
            break;
          }
        }

        if (button) {
          button.textContent = row.classList.contains('scored') ? 'EDIT' : 'ADD';
        }
      });
    };

    refresh();

    const handleClick = event => {
      if (!event.target.closest('.tbd-score-modal-card, .tbd-player-score-row, .tbd-player-name-input')) return;
      window.setTimeout(refresh, 0);
      window.setTimeout(refresh, 120);
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  return null;
}

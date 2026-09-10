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
    function refresh() {
      document.querySelectorAll('.tbd-player-score-row').forEach(row => {
        const button = row.querySelector(':scope > button.button');
        if (!button) return;

        const current = button.textContent?.replace(/\s+/g, ' ').trim() || '';
        row.classList.remove(...RESULT_CLASS_NAMES);

        if (/^Add Score$/i.test(current) || /^Add$/i.test(current)) {
          button.textContent = 'ADD';
          return;
        }

        let matched = false;
        for (const [className, pattern] of RESULT_CLASSES) {
          if (pattern.test(current)) {
            row.classList.add(className);
            matched = true;
            break;
          }
        }

        /* Previous compact labels may already be present after a render. */
        if (!matched) {
          const status = row.querySelector('.tbd-hole-status')?.textContent?.replace(/\s+/g, ' ').trim() || '';
          for (const [className, pattern] of RESULT_CLASSES) {
            if (pattern.test(status)) {
              row.classList.add(className);
              matched = true;
              break;
            }
          }
        }

        if (matched) button.textContent = 'EDIT';
      });
    }

    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => observer.disconnect();
  }, []);

  return null;
}

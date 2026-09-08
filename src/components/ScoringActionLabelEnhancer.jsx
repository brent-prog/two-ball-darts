'use client';

import { useEffect } from 'react';

const LABELS = [
  [/^Add Score$/i, 'Add'],
  [/^Eagle\s+-2$/i, 'EAG -2'],
  [/^Birdie\s+-1$/i, 'BRD -1'],
  [/^Par\s+(E|0)$/i, 'PAR 0'],
  [/^Bogey\s+\+1$/i, 'BOG +1'],
  [/^Double Bogey\s+\+2$/i, 'DBG +2'],
  [/^Triple Bogey\s+\+3$/i, 'TBG +3']
];

function compactLabel(value) {
  const text = value?.replace(/\s+/g, ' ').trim() || '';
  for (const [pattern, label] of LABELS) {
    if (pattern.test(text)) return label;
  }
  return null;
}

export default function ScoringActionLabelEnhancer() {
  useEffect(() => {
    function refresh() {
      document.querySelectorAll('.tbd-player-score-row > button.button').forEach(button => {
        const current = button.textContent?.trim() || '';
        const next = compactLabel(current);
        if (next && current !== next) button.textContent = next;
      });
    }

    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => observer.disconnect();
  }, []);

  return null;
}

'use client';

import { useEffect } from 'react';

function getText(node) {
  return String(node?.textContent || '').replace(/\s+/g, ' ').trim();
}

function updateScoreButtons() {
  document.querySelectorAll('.tbd-player-score-row').forEach(row => {
    const button = row.querySelector(':scope > button');
    if (!button) return;

    if (!row.classList.contains('scored')) {
      if (getText(button) !== 'Add Score') button.textContent = 'Add Score';
      return;
    }

    const status = getText(row.querySelector('.tbd-hole-status'));
    if (!status || status === 'No score yet') return;

    if (getText(button) !== status) {
      button.textContent = status;
      button.setAttribute('aria-label', `Edit ${status}`);
      button.title = `Edit ${status}`;
    }
  });
}

export default function ScoreButtonLabelEnhancer() {
  useEffect(() => {
    updateScoreButtons();

    const intervalId = window.setInterval(updateScoreButtons, 500);
    document.addEventListener('click', updateScoreButtons, true);
    document.addEventListener('change', updateScoreButtons, true);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('click', updateScoreButtons, true);
      document.removeEventListener('change', updateScoreButtons, true);
    };
  }, []);

  return null;
}

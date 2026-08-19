'use client';

import { useEffect } from 'react';

function getActiveHoleNumber() {
  const heading = document.querySelector('.active-hole-panel h3');
  const match = heading?.textContent.trim().match(/hole\s+(\d+)/i);
  return match ? Number(match[1]) : 1;
}

function getButtonText(button) {
  return button?.textContent?.trim() || '';
}

function currentHoleIsActuallyComplete() {
  const cards = [...document.querySelectorAll('.active-hole-panel .player-score-grid .player-hole-card')];
  if (!cards.length) return false;

  return cards.every(card => Boolean(card.querySelector('.score-buttons button.selected')));
}

export default function AutoAdvanceGuardEnhancer() {
  useEffect(() => {
    let recentScoreHole = null;
    let recentScoreTime = 0;

    function markRecentScore(event) {
      const target = event.target;
      const scoreModal = target.closest?.('.tbd-score-modal');
      if (!scoreModal) return;

      const scoreButton = target.closest?.('[data-score-index], .tbd-apply-dart-result');
      if (!scoreButton) return;

      recentScoreHole = getActiveHoleNumber();
      recentScoreTime = Date.now();
    }

    function guardAutoAdvance(event) {
      const button = event.target.closest?.('button');
      if (!button) return;

      const text = getButtonText(button);
      const isHolePicker = Boolean(button.closest('.hole-picker'));
      const isNextHoleButton = text === 'Next Hole';
      if (!isHolePicker && !isNextHoleButton) return;

      const currentHole = getActiveHoleNumber();
      const targetHole = Number(text);
      const isNextHoleClick = isNextHoleButton || (Number.isFinite(targetHole) && targetHole === currentHole + 1);
      if (!isNextHoleClick) return;

      const isRecentAutoAdvanceWindow = recentScoreHole === currentHole && Date.now() - recentScoreTime < 1400;
      if (!isRecentAutoAdvanceWindow) return;

      if (currentHoleIsActuallyComplete()) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
    }

    document.addEventListener('click', markRecentScore, true);
    document.addEventListener('click', guardAutoAdvance, true);

    return () => {
      document.removeEventListener('click', markRecentScore, true);
      document.removeEventListener('click', guardAutoAdvance, true);
    };
  }, []);

  return null;
}

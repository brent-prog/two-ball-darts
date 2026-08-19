'use client';

import { useEffect } from 'react';

const SCORE_MEMORY_KEY = 'tbdCompactScoreMemory';

function getScoreMemory() {
  try {
    return JSON.parse(window.localStorage.getItem(SCORE_MEMORY_KEY) || '{}');
  } catch {
    return {};
  }
}

function hasAnyRecordedScore() {
  return Object.keys(getScoreMemory()).length > 0;
}

function resetUnstartedBadges() {
  const hasScores = hasAnyRecordedScore();

  document.querySelectorAll('.active-hole-panel .tbd-player-total-score').forEach(badge => {
    if (hasScores) {
      badge.classList.remove('is-empty-round');
      return;
    }

    badge.textContent = '-';
    badge.classList.remove('is-leader', 'is-under', 'is-even', 'is-over');
    badge.classList.add('is-empty-round');
  });
}

export default function ScoreBadgeCleanupEnhancer() {
  useEffect(() => {
    resetUnstartedBadges();

    const intervalId = window.setInterval(resetUnstartedBadges, 500);
    document.addEventListener('click', resetUnstartedBadges, true);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('click', resetUnstartedBadges, true);
    };
  }, []);

  return null;
}

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

function clearScoreMemory() {
  try {
    window.localStorage.removeItem(SCORE_MEMORY_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function hasAnyRecordedScore() {
  return Object.keys(getScoreMemory()).length > 0;
}

function visibleRowsAreAllUnscored() {
  const rows = [...document.querySelectorAll('.active-hole-panel .tbd-player-score-row')];
  if (!rows.length) return false;

  return rows.every(row => {
    const status = row.querySelector('.tbd-hole-status')?.textContent?.trim() || '';
    return status === 'No score yet';
  });
}

function resetBadge(badge) {
  badge.textContent = '-';
  badge.classList.remove('is-leader', 'is-under', 'is-even', 'is-over');
  badge.classList.add('is-empty-round');
}

function resetUnstartedBadges() {
  const visibleRoundIsEmpty = visibleRowsAreAllUnscored();

  if (visibleRoundIsEmpty && hasAnyRecordedScore()) {
    clearScoreMemory();
  }

  const hasScores = hasAnyRecordedScore();

  document.querySelectorAll('.active-hole-panel .tbd-player-total-score').forEach(badge => {
    if (visibleRoundIsEmpty || !hasScores) {
      resetBadge(badge);
      return;
    }

    badge.classList.remove('is-empty-round');
  });
}

export default function ScoreBadgeCleanupEnhancer() {
  useEffect(() => {
    resetUnstartedBadges();

    const intervalId = window.setInterval(resetUnstartedBadges, 300);
    document.addEventListener('click', resetUnstartedBadges, true);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('click', resetUnstartedBadges, true);
    };
  }, []);

  return null;
}

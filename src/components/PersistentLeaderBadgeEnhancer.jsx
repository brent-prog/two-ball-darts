'use client';

import { useEffect } from 'react';

function parseScore(text) {
  const value = String(text || '').trim();
  if (!value || value === '-') return null;
  if (value === 'E') return 0;
  const parsed = Number(value.replace('+', ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function refreshLeaderBadges() {
  const rows = [...document.querySelectorAll('.tbd-player-score-row')];
  if (!rows.length) return;

  const parsedRows = rows.map(row => {
    const badge = row.querySelector('.tbd-player-total-score');
    return { row, badge, score: parseScore(badge?.textContent) };
  });

  parsedRows.forEach(item => item.badge?.classList.remove('is-leader'));

  const scoredRows = parsedRows.filter(item => item.badge && item.score !== null);
  if (!scoredRows.length) return;

  const bestScore = Math.min(...scoredRows.map(item => item.score));

  scoredRows.forEach(item => {
    if (item.score === bestScore) item.badge.classList.add('is-leader');
  });
}

export default function PersistentLeaderBadgeEnhancer() {
  useEffect(() => {
    refreshLeaderBadges();

    const observer = new MutationObserver(refreshLeaderBadges);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true });

    document.addEventListener('click', refreshLeaderBadges, true);
    document.addEventListener('change', refreshLeaderBadges, true);

    return () => {
      observer.disconnect();
      document.removeEventListener('click', refreshLeaderBadges, true);
      document.removeEventListener('change', refreshLeaderBadges, true);
    };
  }, []);

  return null;
}

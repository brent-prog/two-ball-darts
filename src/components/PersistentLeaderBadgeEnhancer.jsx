'use client';

import { useEffect } from 'react';

function parseScore(text) {
  const value = String(text || '').trim();
  if (!value || value === '-') return null;
  if (value === 'E') return 0;
  const parsed = Number(value.replace('+', ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function setLeaderState(badge, shouldBeLeader) {
  if (!badge) return;
  if (shouldBeLeader && !badge.classList.contains('is-leader')) {
    badge.classList.add('is-leader');
    return;
  }
  if (!shouldBeLeader && badge.classList.contains('is-leader')) {
    badge.classList.remove('is-leader');
  }
}

function refreshLeaderBadges() {
  const rows = [...document.querySelectorAll('.tbd-player-score-row')];
  if (!rows.length) return;

  const parsedRows = rows.map(row => {
    const badge = row.querySelector('.tbd-player-total-score');
    return { badge, score: parseScore(badge?.textContent) };
  });

  const scoredRows = parsedRows.filter(item => item.badge && item.score !== null);

  if (!scoredRows.length) {
    parsedRows.forEach(item => setLeaderState(item.badge, false));
    return;
  }

  const bestScore = Math.min(...scoredRows.map(item => item.score));

  parsedRows.forEach(item => {
    setLeaderState(item.badge, item.score !== null && item.score === bestScore);
  });
}

export default function PersistentLeaderBadgeEnhancer() {
  useEffect(() => {
    let frameId = null;

    function scheduleRefresh() {
      if (frameId) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        refreshLeaderBadges();
      });
    }

    scheduleRefresh();

    const observer = new MutationObserver(scheduleRefresh);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    document.addEventListener('click', scheduleRefresh, true);
    document.addEventListener('change', scheduleRefresh, true);

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      observer.disconnect();
      document.removeEventListener('click', scheduleRefresh, true);
      document.removeEventListener('change', scheduleRefresh, true);
    };
  }, []);

  return null;
}

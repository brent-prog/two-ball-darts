'use client';

import { useEffect } from 'react';

const SCORE_MEMORY_KEY = 'tbdCompactScoreMemory';

function getActiveHoleNumber() {
  const heading = document.querySelector('.active-hole-panel h3');
  const match = heading?.textContent.trim().match(/hole\s+(\d+)/i);
  return match ? Number(match[1]) : 1;
}

function getScoreMemory() {
  try {
    return JSON.parse(window.localStorage.getItem(SCORE_MEMORY_KEY) || '{}');
  } catch {
    return {};
  }
}

function getPlayerCount() {
  return document.querySelectorAll('.active-hole-panel .tbd-player-score-row').length;
}

function scoreKey(playerIndex, holeNumber) {
  return `p${playerIndex}-h${holeNumber}`;
}

function getHonoursIndex() {
  const currentHole = getActiveHoleNumber();
  const playerCount = getPlayerCount();
  if (currentHole <= 1 || playerCount < 1) return null;

  const memory = getScoreMemory();
  let honoursIndex = null;

  for (let hole = 2; hole <= currentHole; hole += 1) {
    const priorHole = hole - 1;
    const scores = Array.from({ length: playerCount }, (_, playerIndex) => memory[scoreKey(playerIndex, priorHole)]);

    if (scores.some(score => typeof score !== 'number')) break;

    const bestScore = Math.min(...scores);
    const bestPlayers = scores
      .map((score, index) => ({ score, index }))
      .filter(player => player.score === bestScore)
      .map(player => player.index);

    if (bestPlayers.length === 1) {
      honoursIndex = bestPlayers[0];
      continue;
    }

    if (honoursIndex !== null && bestPlayers.includes(honoursIndex)) {
      continue;
    }
  }

  return honoursIndex;
}

function clearHonoursBadges(exceptIndex = null) {
  document.querySelectorAll('.active-hole-panel .tbd-player-score-row').forEach(row => {
    const rowIndex = Number(row.dataset.playerIndex);
    if (exceptIndex !== null && rowIndex === exceptIndex) return;

    row.classList.remove('has-honours');
    row.querySelector('.tbd-honours-chip')?.remove();
  });
}

function applyHonoursBadge() {
  const honoursIndex = getHonoursIndex();

  if (honoursIndex === null) {
    clearHonoursBadges();
    return;
  }

  const row = document.querySelector(`.active-hole-panel .tbd-player-score-row[data-player-index="${honoursIndex}"]`);
  const nameLine = row?.querySelector('.tbd-player-name-line');
  if (!row || !nameLine) return;

  clearHonoursBadges(honoursIndex);

  row.classList.add('has-honours');

  if (nameLine.querySelector('.tbd-honours-chip')) return;

  const chip = document.createElement('span');
  chip.className = 'tbd-honours-chip';
  chip.textContent = 'H';
  chip.setAttribute('aria-label', 'Honours');

  nameLine.appendChild(chip);
}

export default function HonoursEnhancer() {
  useEffect(() => {
    applyHonoursBadge();

    const intervalId = window.setInterval(applyHonoursBadge, 1500);
    document.addEventListener('click', applyHonoursBadge, true);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('click', applyHonoursBadge, true);
    };
  }, []);

  return null;
}

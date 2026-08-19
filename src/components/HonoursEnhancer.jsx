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

function applyHonoursClass() {
  const honoursIndex = getHonoursIndex();

  document.querySelectorAll('.active-hole-panel .tbd-player-score-row').forEach(row => {
    const rowIndex = Number(row.dataset.playerIndex);
    const shouldHaveHonours = honoursIndex !== null && rowIndex === honoursIndex;

    row.classList.toggle('has-honours', shouldHaveHonours);
    row.querySelector('.tbd-honours-chip')?.remove();
  });
}

export default function HonoursEnhancer() {
  useEffect(() => {
    applyHonoursClass();

    const intervalId = window.setInterval(applyHonoursClass, 250);
    document.addEventListener('click', applyHonoursClass, true);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('click', applyHonoursClass, true);
    };
  }, []);

  return null;
}

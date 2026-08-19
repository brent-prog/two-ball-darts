'use client';

import { useEffect } from 'react';

const SCORE_MEMORY_KEY = 'tbdCompactScoreMemory';

function getText(node) {
  return String(node?.textContent || '').replace(/\s+/g, ' ').trim();
}

function getActiveHoleNumber() {
  const heading = document.querySelector('.active-hole-panel h3');
  const match = getText(heading).match(/hole\s+(\d+)/i);
  return match ? Number(match[1]) : null;
}

function getScoreMemory() {
  try {
    return JSON.parse(window.localStorage.getItem(SCORE_MEMORY_KEY) || '{}');
  } catch {
    return {};
  }
}

function setScoreMemory(memory) {
  try {
    window.localStorage.setItem(SCORE_MEMORY_KEY, JSON.stringify(memory));
  } catch {
    // Ignore storage failures.
  }
}

function scoreKey(playerIndex, holeNumber) {
  return `p${playerIndex}-h${holeNumber}`;
}

function removeUnconfirmedActiveHoleMemory() {
  const activeHole = getActiveHoleNumber();
  if (!activeHole) return;

  const cards = [...document.querySelectorAll('.active-hole-panel .player-score-grid .player-hole-card')];
  if (!cards.length) return;

  const memory = getScoreMemory();
  let changed = false;

  cards.forEach((card, playerIndex) => {
    const selected = card.querySelector('.score-buttons button.selected');
    if (selected) return;

    const key = scoreKey(playerIndex, activeHole);
    if (Object.prototype.hasOwnProperty.call(memory, key)) {
      delete memory[key];
      changed = true;
    }
  });

  if (changed) setScoreMemory(memory);
}

export default function CompactScoreStateGuardEnhancer() {
  useEffect(() => {
    function scheduleGuard() {
      window.setTimeout(removeUnconfirmedActiveHoleMemory, 80);
      window.setTimeout(removeUnconfirmedActiveHoleMemory, 260);
    }

    removeUnconfirmedActiveHoleMemory();
    document.addEventListener('click', scheduleGuard, true);
    document.addEventListener('change', scheduleGuard, true);

    const intervalId = window.setInterval(removeUnconfirmedActiveHoleMemory, 900);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('click', scheduleGuard, true);
      document.removeEventListener('change', scheduleGuard, true);
    };
  }, []);

  return null;
}

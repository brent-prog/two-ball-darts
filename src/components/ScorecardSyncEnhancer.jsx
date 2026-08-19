'use client';

import { useEffect } from 'react';

function getText(node) {
  return String(node?.textContent || '').replace(/\s+/g, ' ').trim();
}

function getActiveHoleNumber() {
  const heading = document.querySelector('.active-hole-panel h3');
  const match = getText(heading).match(/hole\s+(\d+)/i);
  return match ? Number(match[1]) : null;
}

function getScorecardCell(playerIndex, holeNumber) {
  const tables = [...document.querySelectorAll('.scorecard-table')];

  for (const table of tables) {
    const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
    const headers = [...(headerRow?.querySelectorAll('th,td') || [])].map(getText);
    const holeColumnIndex = headers.findIndex(label => label === String(holeNumber));
    if (holeColumnIndex < 0) continue;

    const playerRows = [...table.querySelectorAll('tbody tr')].filter(row => {
      if (row.classList.contains('par-row')) return false;
      const firstCell = getText(row.querySelector('th,td')).toLowerCase();
      return firstCell && firstCell !== 'par';
    });

    const row = playerRows[playerIndex];
    const cells = [...(row?.querySelectorAll('th,td') || [])];
    const cell = cells[holeColumnIndex];
    if (cell) return cell;
  }

  return null;
}

function scorecardCellHasScore(playerIndex, holeNumber) {
  const cell = getScorecardCell(playerIndex, holeNumber);
  if (!cell) return false;
  if (cell.querySelector('.score-symbol')) return true;
  return getText(cell) !== '';
}

function getSelectedSourceButton(card) {
  return card.querySelector('.score-buttons button.selected');
}

function scoreKey(playerIndex, holeNumber) {
  return `p${playerIndex}-h${holeNumber}`;
}

export default function ScorecardSyncEnhancer() {
  useEffect(() => {
    const retryCounts = new Map();

    function syncActiveHoleScorecard() {
      const holeNumber = getActiveHoleNumber();
      if (!holeNumber) return;

      const cards = [...document.querySelectorAll('.active-hole-panel .player-score-grid .player-hole-card')];
      if (!cards.length) return;

      cards.forEach((card, playerIndex) => {
        const selectedButton = getSelectedSourceButton(card);
        if (!selectedButton) return;
        if (scorecardCellHasScore(playerIndex, holeNumber)) return;

        const key = scoreKey(playerIndex, holeNumber);
        const retries = retryCounts.get(key) || 0;
        if (retries >= 2) return;

        retryCounts.set(key, retries + 1);
        window.setTimeout(() => {
          if (scorecardCellHasScore(playerIndex, holeNumber)) return;
          selectedButton.click();
        }, 80);
      });
    }

    const intervalId = window.setInterval(syncActiveHoleScorecard, 180);
    document.addEventListener('click', syncActiveHoleScorecard, true);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('click', syncActiveHoleScorecard, true);
    };
  }, []);

  return null;
}

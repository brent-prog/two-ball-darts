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

function scoreValueFromText(scoreText) {
  const text = String(scoreText || '').trim();
  if (!text || text === 'E') return 0;
  const value = Number.parseInt(text.replace('+', ''), 10);
  return Number.isFinite(value) ? value : 0;
}

function strokesFromScore(scoreValue) {
  return Math.max(1, Math.min(6, scoreValue + 3));
}

function scoreClassFromValue(scoreValue) {
  if (scoreValue <= -2) return 'eagle';
  if (scoreValue === -1) return 'birdie';
  if (scoreValue === 0) return 'par';
  if (scoreValue === 1) return 'bogey';
  if (scoreValue === 2) return 'double-bogey';
  return 'triple-bogey';
}

function formatScore(scoreValue) {
  if (scoreValue === 0) return 'E';
  return scoreValue > 0 ? `+${scoreValue}` : String(scoreValue);
}

function getScorecardTable() {
  return [...document.querySelectorAll('.scorecard-table')].find(table => {
    const style = window.getComputedStyle(table);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
}

function getHoleColumnIndexes(table) {
  const headerRow = table?.querySelector('thead tr') || table?.querySelector('tr');
  const labels = [...(headerRow?.querySelectorAll('th,td') || [])].map(getText);
  return labels.reduce((indexes, label, index) => {
    if (/^\d+$/.test(label)) indexes[Number(label)] = index;
    return indexes;
  }, {});
}

function getPlayerRows(table) {
  return [...(table?.querySelectorAll('tbody tr') || [])].filter(row => {
    if (row.classList.contains('par-row')) return false;
    const label = getText(row.querySelector('th,td')).toLowerCase();
    return label && label !== 'par';
  });
}

function selectedScoreForCard(card) {
  const selected = card.querySelector('.score-buttons button.selected');
  if (!selected) return null;

  const scoreText = getText(selected.querySelector('strong'));
  if (!scoreText) return null;

  return scoreValueFromText(scoreText);
}

function paintScoreCell(cell, scoreValue) {
  const strokes = strokesFromScore(scoreValue);
  const scoreClass = scoreClassFromValue(scoreValue);
  cell.innerHTML = `<span class="score-symbol ${scoreClass}">${strokes}</span>`;
}

function updateRowTotal(row) {
  const cells = [...row.querySelectorAll('th,td')];
  const totalCell = row.querySelector('.total-score') || cells[1];
  if (!totalCell) return;

  const scoreCells = cells.filter(cell => cell.querySelector('.score-symbol'));
  const total = scoreCells.reduce((sum, cell) => {
    const symbol = cell.querySelector('.score-symbol');
    const strokes = Number.parseInt(getText(symbol), 10);
    if (!Number.isFinite(strokes)) return sum;
    return sum + (strokes - 3);
  }, 0);

  totalCell.textContent = formatScore(total);
}

function syncVisibleScorecard() {
  const table = getScorecardTable();
  const activeHole = getActiveHoleNumber();
  if (!table || !activeHole) return;

  const holeColumns = getHoleColumnIndexes(table);
  const activeColumnIndex = holeColumns[activeHole];
  if (typeof activeColumnIndex !== 'number') return;

  const playerRows = getPlayerRows(table);
  const cards = [...document.querySelectorAll('.active-hole-panel .player-score-grid .player-hole-card')];
  if (!cards.length || !playerRows.length) return;

  cards.forEach((card, playerIndex) => {
    const scoreValue = selectedScoreForCard(card);
    if (scoreValue === null) return;

    const row = playerRows[playerIndex];
    const cells = [...(row?.querySelectorAll('th,td') || [])];
    const cell = cells[activeColumnIndex];
    if (!cell) return;

    paintScoreCell(cell, scoreValue);
    updateRowTotal(row);
  });
}

export default function ScorecardVisualSyncEnhancer() {
  useEffect(() => {
    function scheduleSync() {
      window.setTimeout(syncVisibleScorecard, 60);
      window.setTimeout(syncVisibleScorecard, 240);
    }

    syncVisibleScorecard();
    document.addEventListener('click', scheduleSync, true);
    document.addEventListener('change', scheduleSync, true);

    return () => {
      document.removeEventListener('click', scheduleSync, true);
      document.removeEventListener('change', scheduleSync, true);
    };
  }, []);

  return null;
}

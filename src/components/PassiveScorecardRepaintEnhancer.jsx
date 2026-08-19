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

function scoreTextToNumber(value) {
  const text = String(value || '').trim();
  if (!text || text === 'E') return 0;
  const parsed = Number.parseInt(text.replace('+', ''), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatScore(value) {
  if (!value) return 'E';
  return value > 0 ? `+${value}` : String(value);
}

function symbolClass(score) {
  if (score === -2) return 'eagle';
  if (score === -1) return 'birdie';
  if (score === 1) return 'bogey';
  if (score === 2) return 'double-bogey';
  if (score === 3) return 'triple-bogey';
  return 'par';
}

function symbolStyle(score) {
  const base = 'display:inline-grid;place-items:center;min-width:34px;height:34px;padding:0 6px;color:#102017;font-weight:900;line-height:1;background:rgba(255,255,255,.08);';
  if (score === -2) return `${base}border:4px double #102017;border-radius:999px;`;
  if (score === -1) return `${base}border:3px solid #102017;border-radius:999px;`;
  if (score === 1) return `${base}border:3px solid #102017;border-radius:2px;`;
  if (score === 2) return `${base}border:4px double #102017;border-radius:2px;`;
  if (score === 3) return `${base}border:3px solid #102017;border-radius:2px;box-shadow:0 0 0 3px #102017 inset;`;
  return base;
}

function getVisibleScorecardTable() {
  const tables = [...document.querySelectorAll('.scorecard-table')];
  return tables.find(table => table.offsetParent !== null) || null;
}

function getHeaderLabels(table) {
  const headerRow = table?.querySelector('thead tr') || table?.querySelector('tr');
  return [...(headerRow?.querySelectorAll('th,td') || [])].map(getText);
}

function getPlayerRows(table) {
  return [...(table?.querySelectorAll('tbody tr') || [])].filter(row => {
    if (row.classList.contains('par-row')) return false;
    const firstCell = getText(row.querySelector('th,td')).toLowerCase();
    return firstCell && firstCell !== 'par';
  });
}

function getSelectedScores() {
  const cards = [...document.querySelectorAll('.active-hole-panel .player-score-grid .player-hole-card')];

  return cards.map(card => {
    const selected = card.querySelector('.score-buttons button.selected');
    if (!selected) return null;

    const strongScore = getText(selected.querySelector('strong'));
    const score = scoreTextToNumber(strongScore);
    const strokes = score + 3;
    return { score, strokes };
  });
}

function cellScoreValue(cell) {
  const symbol = cell.querySelector('.score-symbol') || cell;
  const classes = [...(symbol.classList || [])].join(' ').toLowerCase();
  const text = getText(symbol).toLowerCase();

  if (!text) return null;
  if (classes.includes('eagle')) return -2;
  if (classes.includes('birdie')) return -1;
  if (classes.includes('triple-bogey')) return 3;
  if (classes.includes('double-bogey')) return 2;
  if (classes.includes('bogey')) return 1;
  if (classes.includes('par')) return 0;

  const strokeCount = Number(text);
  if (Number.isFinite(strokeCount) && strokeCount >= 1 && strokeCount <= 6) return strokeCount - 3;

  const signed = text.match(/[+-]?\d+/);
  return signed ? Number(signed[0]) : null;
}

function repaintTotal(row, headers) {
  const cells = [...row.querySelectorAll('th,td')];
  const total = cells.reduce((sum, cell, index) => {
    const hole = Number(headers[index]);
    if (!Number.isInteger(hole) || hole < 1 || hole > 18) return sum;
    const value = cellScoreValue(cell);
    return typeof value === 'number' ? sum + value : sum;
  }, 0);

  const totalIndex = headers.findIndex(label => label.toLowerCase() === 'score');
  const totalCell = totalIndex >= 0 ? cells[totalIndex] : row.querySelector('.total-score');
  if (!totalCell) return;

  totalCell.textContent = formatScore(total);
  totalCell.classList.add('total-score');
}

function repaintVisibleScorecard() {
  const holeNumber = getActiveHoleNumber();
  const table = getVisibleScorecardTable();
  if (!holeNumber || !table) return;

  const headers = getHeaderLabels(table);
  const holeIndex = headers.findIndex(label => label === String(holeNumber));
  if (holeIndex < 0) return;

  const rows = getPlayerRows(table);
  const selectedScores = getSelectedScores();

  rows.forEach((row, playerIndex) => {
    const selected = selectedScores[playerIndex];
    if (!selected) return;

    const cells = [...row.querySelectorAll('th,td')];
    const cell = cells[holeIndex];
    if (!cell) return;

    const alreadyPainted = cell.querySelector('.score-symbol') || getText(cell);
    if (!alreadyPainted) {
      cell.innerHTML = `<span class="score-symbol ${symbolClass(selected.score)}" style="${symbolStyle(selected.score)}">${selected.strokes}</span>`;
    }

    repaintTotal(row, headers);
  });
}

export default function PassiveScorecardRepaintEnhancer() {
  useEffect(() => {
    const intervalId = window.setInterval(repaintVisibleScorecard, 300);
    document.addEventListener('click', repaintVisibleScorecard, true);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('click', repaintVisibleScorecard, true);
    };
  }, []);

  return null;
}

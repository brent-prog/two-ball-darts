'use client';

import { useEffect } from 'react';

const resultMeta = [
  { pattern: /Eagle\s*-2/i, strokes: '1', score: -2 },
  { pattern: /Birdie\s*-1/i, strokes: '2', score: -1 },
  { pattern: /^Par\b/i, strokes: '3', score: 0 },
  { pattern: /^Bogey\s*\+1/i, strokes: '4', score: 1 },
  { pattern: /Double Bogey\s*\+2/i, strokes: '5', score: 2 },
  { pattern: /Triple Bogey\s*\+3/i, strokes: '6', score: 3 }
];

function text(node) {
  return node?.textContent?.replace(/\s+/g, ' ').trim() || '';
}

function activeHole() {
  const current = [...document.querySelectorAll('#scorecard strong')].find(node => /^Hole \d+ of 18$/i.test(text(node)));
  const match = text(current).match(/Hole (\d+) of 18/i);
  return match ? Number(match[1]) : null;
}

function metaForRow(row) {
  const labels = [...row.querySelectorAll('button,strong,span')].map(text).filter(Boolean);
  for (const meta of resultMeta) {
    if (labels.some(label => meta.pattern.test(label))) return meta;
  }
  return null;
}

function symbolStyle(score) {
  const base = {
    display: 'inline-grid',
    placeItems: 'center',
    minWidth: '34px',
    height: '34px',
    padding: '0 6px',
    color: '#102017',
    fontWeight: '900',
    lineHeight: '1',
    background: 'rgba(255,255,255,.08)'
  };
  if (score === -2) return { ...base, border: '4px double #102017', borderRadius: '999px' };
  if (score === -1) return { ...base, border: '3px solid #102017', borderRadius: '999px' };
  if (score === 1) return { ...base, border: '3px solid #102017', borderRadius: '2px' };
  if (score === 2) return { ...base, border: '4px double #102017', borderRadius: '2px' };
  if (score === 3) return { ...base, border: '3px solid #102017', borderRadius: '2px', boxShadow: '0 0 0 3px #102017 inset' };
  return base;
}

function classifyTotalCell(cell) {
  if (!cell) return;
  cell.classList.remove('is-under', 'is-even', 'is-over');
  const raw = text(cell);
  const score = raw.toUpperCase() === 'E' ? 0 : Number(raw.replace('+', ''));
  if (!Number.isFinite(score)) return;
  if (score < 0) cell.classList.add('is-under');
  else if (score > 0) cell.classList.add('is-over');
  else cell.classList.add('is-even');
}

function syncVisibleScorecard() {
  const hole = activeHole();
  const liveRows = [...document.querySelectorAll('.tbd-live-score-list > *')];
  const table = document.querySelector('#scorecard .scorecard-table');
  if (!hole || !liveRows.length || !table) return;

  const scoreRows = [...table.querySelectorAll('tbody tr')];
  if (scoreRows.length !== liveRows.length) return;

  scoreRows.forEach(row => classifyTotalCell(row.querySelector('td.total-score')));

  liveRows.forEach((liveRow, index) => {
    const meta = metaForRow(liveRow);
    const cells = [...scoreRows[index].querySelectorAll('td')];
    const cell = cells[hole]; // score total is td[0], hole 1 is td[1]
    if (!cell) return;

    if (!meta) {
      cell.innerHTML = '';
      return;
    }

    let symbol = cell.querySelector('[data-tbd-live-score-symbol]');
    if (!symbol) {
      cell.innerHTML = '';
      symbol = document.createElement('span');
      symbol.setAttribute('data-tbd-live-score-symbol', 'true');
      cell.appendChild(symbol);
    }
    symbol.className = `score-symbol ${meta.score < 0 ? (meta.score === -2 ? 'eagle' : 'birdie') : meta.score === 0 ? 'par' : meta.score === 1 ? 'bogey' : meta.score === 2 ? 'double-bogey' : 'triple-bogey'}`;
    symbol.textContent = meta.strokes;
    Object.assign(symbol.style, symbolStyle(meta.score));
  });
}

export default function LiveScorecardSyncEnhancer() {
  useEffect(() => {
    let frame = null;
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        syncVisibleScorecard();
      });
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    document.addEventListener('click', schedule, true);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('click', schedule, true);
    };
  }, []);

  return null;
}

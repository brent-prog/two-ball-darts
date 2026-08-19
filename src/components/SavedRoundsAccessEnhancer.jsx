'use client';

import { useEffect } from 'react';

const SCORE_MEMORY_KEY = 'tbdCompactScoreMemory';
const LOCAL_SAVED_ROUNDS_KEY = 'tbdLocalSavedRounds';

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function getText(node) {
  return normalizeText(node?.textContent || '');
}

function fmt(value) {
  if (!value) return 'E';
  return value > 0 ? `+${value}` : String(value);
}

function scoreLabelFromValue(value) {
  if (value === -2) return 'eagle';
  if (value === -1) return 'birdie';
  if (value === 1) return 'bogey';
  if (value === 2) return 'double bogey';
  if (value === 3) return 'triple bogey';
  return 'par';
}

function scoreValueFromCell(cell) {
  const symbol = cell.querySelector('.score-symbol') || cell;
  const classes = [...(symbol.classList || [])].join(' ').toLowerCase();
  const text = getText(symbol).toLowerCase();

  if (!text) return null;
  if (classes.includes('eagle') || text.includes('eagle')) return -2;
  if (classes.includes('birdie') || text.includes('birdie')) return -1;
  if (classes.includes('triple-bogey') || classes.includes('triple_bogey') || text.includes('triple bogey')) return 3;
  if (classes.includes('double-bogey') || classes.includes('double_bogey') || text.includes('double bogey')) return 2;
  if (classes.includes('bogey') || text.includes('bogey')) return 1;
  if (classes.includes('par') || text === 'par') return 0;

  const signed = text.match(/[+-]\d+/);
  if (signed) return Number(signed[0]);

  const strokes = text.match(/^\d+$/);
  if (strokes) {
    const strokeCount = Number(strokes[0]);
    if (strokeCount >= 1 && strokeCount <= 6) return strokeCount - 3;
  }

  return null;
}

function getSavedRounds() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LOCAL_SAVED_ROUNDS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setSavedRounds(rounds) {
  try {
    window.localStorage.setItem(LOCAL_SAVED_ROUNDS_KEY, JSON.stringify(rounds));
  } catch {
    // Ignore storage failures.
  }
}

function getScorecardTable() {
  const tables = [...document.querySelectorAll('.scorecard-table')];
  return tables.find(table => table.offsetParent !== null) || tables[0] || null;
}

function getHeaderLabels(table) {
  const headerRow = table?.querySelector('thead tr') || table?.querySelector('tr');
  return [...(headerRow?.querySelectorAll('th,td') || [])].map(cell => getText(cell));
}

function parseScorecardTable(table) {
  if (!table) return [];

  const headers = getHeaderLabels(table);
  const rows = [...table.querySelectorAll('tbody tr')].filter(row => {
    if (row.classList.contains('par-row')) return false;
    const name = getText(row.querySelector('th,td')).toLowerCase();
    return name && name !== 'par';
  });

  return rows.map((row, index) => {
    const cells = [...row.querySelectorAll('th,td')];
    const name = getText(cells[0]) || `Player ${index + 1}`;
    const scores = {};

    cells.forEach((cell, cellIndex) => {
      const hole = Number(headers[cellIndex]);
      if (!Number.isInteger(hole) || hole < 1 || hole > 18) return;
      const value = scoreValueFromCell(cell);
      if (typeof value === 'number') scores[hole] = value;
    });

    return { name, scores };
  });
}

function roundIsComplete(players) {
  return players.length > 0 && players.every(player => Object.keys(player.scores).length >= 18);
}

function getResumeHole(players) {
  for (let hole = 1; hole <= 18; hole += 1) {
    if (!players.every(player => typeof player.scores[hole] === 'number')) return hole;
  }
  return 18;
}

function roundSignature(players) {
  return JSON.stringify(players.map(player => [player.name, player.scores]));
}

function captureVisibleRound() {
  const table = getScorecardTable();
  const players = parseScorecardTable(table);
  if (!players.length || players.every(player => Object.keys(player.scores).length === 0)) return null;

  const savedText = [...document.querySelectorAll('p, div, span')]
    .map(node => getText(node))
    .find(text => /^Round saved as/i.test(text));

  const complete = roundIsComplete(players);
  const label = complete ? 'Official 18' : 'Incomplete round';
  const createdAt = new Date().toISOString();
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return {
    id,
    label,
    complete,
    createdAt,
    note: savedText || `Captured ${label}`,
    players,
    signature: roundSignature(players)
  };
}

function captureIfNeeded() {
  const captured = captureVisibleRound();
  if (!captured) return;

  const rounds = getSavedRounds();
  if (rounds.some(round => round.signature === captured.signature)) return;

  setSavedRounds([captured, ...rounds].slice(0, 20));
}

function setCompactScoreMemory(players) {
  const memory = {};
  players.forEach((player, playerIndex) => {
    Object.entries(player.scores).forEach(([hole, value]) => {
      memory[`p${playerIndex}-h${hole}`] = value;
    });
  });

  try {
    window.localStorage.setItem(SCORE_MEMORY_KEY, JSON.stringify(memory));
  } catch {
    // Ignore storage failures.
  }
}

function clearCompactScoreMemory() {
  try {
    window.localStorage.removeItem(SCORE_MEMORY_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function findButtonByText(text) {
  return [...document.querySelectorAll('button')].find(button => getText(button) === text);
}

function updateReactInput(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function clickHole(hole) {
  const button = [...document.querySelectorAll('.hole-picker button')].find(item => getText(item) === String(hole));
  button?.click();
}

function applyScoresForHole(players, hole) {
  const cards = [...document.querySelectorAll('.active-hole-panel .player-score-grid .player-hole-card')];
  players.forEach((player, playerIndex) => {
    const value = player.scores[hole];
    if (typeof value !== 'number') return;

    const label = scoreLabelFromValue(value);
    const button = [...(cards[playerIndex]?.querySelectorAll('.score-buttons button') || [])]
      .find(scoreButton => getText(scoreButton).toLowerCase().includes(label));
    button?.click();
  });
}

function restoreHoleSequence(players, holes, index, resumeHole) {
  if (index >= holes.length) {
    setCompactScoreMemory(players);
    window.setTimeout(() => clickHole(resumeHole), 180);
    return;
  }

  const hole = holes[index];
  clickHole(hole);
  window.setTimeout(() => {
    applyScoresForHole(players, hole);
    window.setTimeout(() => restoreHoleSequence(players, holes, index + 1, resumeHole), 140);
  }, 140);
}

function resumeRound(round) {
  closeSavedRoundsModal();

  const players = round.players || [];
  const holes = [...new Set(players.flatMap(player => Object.keys(player.scores || {}).map(Number)))]
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const resumeHole = getResumeHole(players);

  window.setTimeout(() => {
    clearCompactScoreMemory();
    findButtonByText('Reset')?.click();

    window.setTimeout(() => {
      const cards = [...document.querySelectorAll('.active-hole-panel .player-score-grid .player-hole-card')];
      players.forEach((player, index) => {
        const input = cards[index]?.querySelector('input');
        if (input) updateReactInput(input, player.name);
      });

      restoreHoleSequence(players, holes, 0, resumeHole);
    }, 250);
  }, 100);
}

function totalScore(player) {
  return Object.values(player.scores || {}).reduce((sum, value) => sum + Number(value || 0), 0);
}

function renderRoundTable(round) {
  const holeHeaders = Array.from({ length: 18 }, (_, index) => index + 1);
  const rows = (round.players || []).map(player => `
    <tr>
      <th>${escapeHtml(player.name)}</th>
      <td><strong>${escapeHtml(fmt(totalScore(player)))}</strong></td>
      ${holeHeaders.map(hole => {
        const value = player.scores?.[hole];
        return `<td>${typeof value === 'number' ? escapeHtml(fmt(value)) : ''}</td>`;
      }).join('')}
    </tr>
  `).join('');

  return `
    <div class="tbd-saved-round-table-wrap">
      <table class="scorecard-table tbd-local-saved-table">
        <thead><tr><th>Player</th><th>Score</th>${holeHeaders.map(hole => `<th>${hole}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function closeSavedRoundsModal() {
  document.querySelector('.tbd-saved-rounds-modal')?.remove();
}

function showSavedRoundsModal() {
  captureIfNeeded();
  const rounds = getSavedRounds();

  if (!rounds.length) {
    window.alert('No saved rounds found on this browser yet. Save a round first, then try again.');
    return;
  }

  closeSavedRoundsModal();

  const modal = document.createElement('div');
  modal.className = 'tbd-saved-rounds-modal';
  modal.innerHTML = `
    <div class="tbd-saved-rounds-card">
      <div class="tbd-saved-rounds-head">
        <div>
          <p class="eyebrow">Round history</p>
          <h2>Saved Rounds</h2>
        </div>
        <button type="button" class="button secondary tbd-close-saved-rounds">Close</button>
      </div>
      <div class="tbd-saved-rounds-list">
        ${rounds.map((round, index) => `
          <section class="tbd-saved-round-item" data-round-index="${index}">
            <div class="tbd-saved-round-title-row">
              <div>
                <h3>${escapeHtml(round.label || 'Saved round')}</h3>
                <p>${escapeHtml(new Date(round.createdAt || Date.now()).toLocaleString())}</p>
                <p>${escapeHtml((round.players || []).map(player => player.name).join(', '))}</p>
              </div>
              <div class="tbd-saved-round-actions">
                ${round.complete ? '' : '<button type="button" class="button primary tbd-resume-local-round">Resume</button>'}
                <button type="button" class="button secondary tbd-toggle-local-round">View</button>
              </div>
            </div>
            <div class="tbd-local-round-detail" hidden>${renderRoundTable(round)}</div>
          </section>
        `).join('')}
      </div>
    </div>
  `;

  modal.querySelector('.tbd-close-saved-rounds')?.addEventListener('click', closeSavedRoundsModal);
  modal.addEventListener('click', event => {
    if (event.target === modal) closeSavedRoundsModal();
  });

  modal.querySelectorAll('.tbd-toggle-local-round').forEach(button => {
    button.addEventListener('click', event => {
      const item = event.target.closest('.tbd-saved-round-item');
      const detail = item?.querySelector('.tbd-local-round-detail');
      if (!detail) return;
      detail.hidden = !detail.hidden;
      event.target.textContent = detail.hidden ? 'View' : 'Hide';
    });
  });

  modal.querySelectorAll('.tbd-resume-local-round').forEach(button => {
    button.addEventListener('click', event => {
      const item = event.target.closest('.tbd-saved-round-item');
      const index = Number(item?.dataset.roundIndex);
      const round = rounds[index];
      if (round) resumeRound(round);
    });
  });

  document.body.appendChild(modal);
}

function makeButton(location) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `button secondary tbd-saved-rounds-access tbd-saved-rounds-${location}`;
  button.textContent = 'Saved Rounds';
  button.addEventListener('click', showSavedRoundsModal);
  return button;
}

function findHeaderActionsTarget() {
  const header = document.querySelector('header');
  if (!header) return null;

  const candidates = [
    header.querySelector('.hero-actions'),
    header.querySelector('.actions'),
    header.querySelector('.button-row'),
    header.querySelector('nav')
  ].filter(Boolean);

  const existingActionArea = candidates.find(candidate => candidate.querySelector('button, a'));
  if (existingActionArea) return existingActionArea;

  let row = header.querySelector('.tbd-header-actions-row');
  if (!row) {
    row = document.createElement('div');
    row.className = 'tbd-header-actions-row';
    header.appendChild(row);
  }

  return row;
}

function addHeaderButton() {
  const existing = document.querySelector('.tbd-saved-rounds-header');
  const target = findHeaderActionsTarget();
  if (!target) return;

  if (existing) {
    if (existing.parentNode !== target) target.appendChild(existing);
    return;
  }

  target.appendChild(makeButton('header'));
}

function addFooterButton() {
  if (document.querySelector('.tbd-saved-rounds-footer')) return;

  const footer = document.querySelector('footer');
  if (!footer) return;

  let target = footer.querySelector('.tbd-footer-actions-row');
  if (!target) {
    target = document.createElement('div');
    target.className = 'tbd-footer-actions-row';
    footer.appendChild(target);
  }

  target.appendChild(makeButton('footer'));
}

function refreshSavedRoundsAccess() {
  captureIfNeeded();
  addHeaderButton();
  addFooterButton();
}

export default function SavedRoundsAccessEnhancer() {
  useEffect(() => {
    refreshSavedRoundsAccess();

    const intervalId = window.setInterval(refreshSavedRoundsAccess, 1000);
    document.addEventListener('click', refreshSavedRoundsAccess, true);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('click', refreshSavedRoundsAccess, true);
    };
  }, []);

  return null;
}

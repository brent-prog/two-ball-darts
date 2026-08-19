'use client';

import { useEffect } from 'react';

const SCORE_MEMORY_KEY = 'tbdCompactScoreMemory';

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function getText(node) {
  return normalizeText(node?.textContent || '');
}

function isOwnButton(button) {
  return button?.classList?.contains('tbd-saved-rounds-access');
}

function getCandidateSavedRoundsControls() {
  return [...document.querySelectorAll('button, a')].filter(control => {
    if (isOwnButton(control)) return false;
    if (control.closest('.tbd-score-modal')) return false;

    const text = getText(control).toLowerCase();
    const href = String(control.getAttribute('href') || '').toLowerCase();
    const aria = String(control.getAttribute('aria-label') || '').toLowerCase();
    const combined = `${text} ${href} ${aria}`;

    return (
      combined.includes('saved round') ||
      combined.includes('saved rounds') ||
      combined.includes('round history') ||
      combined.includes('history') ||
      combined.includes('view rounds') ||
      combined.includes('load round')
    );
  });
}

function openSavedRounds() {
  const controls = getCandidateSavedRoundsControls();
  const control = controls.find(button => !button.disabled);

  if (control) {
    control.style.display = '';
    control.removeAttribute('aria-hidden');
    control.click();
    return;
  }

  window.alert('Saved rounds are not available yet. Save a round first, then try again.');
}

function makeButton(location) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `button secondary tbd-saved-rounds-access tbd-saved-rounds-${location}`;
  button.textContent = 'Saved Rounds';
  button.addEventListener('click', openSavedRounds);
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

function scoreValueFromCell(cell) {
  const symbol = cell.querySelector('.score-symbol') || cell;
  const classes = [...(symbol.classList || [])].join(' ').toLowerCase();
  const text = getText(symbol).toLowerCase();

  if (!text) return null;
  if (classes.includes('eagle') || text.includes('eagle')) return -2;
  if (classes.includes('birdie') || text.includes('birdie')) return -1;
  if (classes.includes('double-bogey') || classes.includes('double_bogey') || text.includes('double bogey')) return 2;
  if (classes.includes('triple-bogey') || classes.includes('triple_bogey') || text.includes('triple bogey')) return 3;
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

function scoreKeyFromValue(value) {
  if (value === -2) return 'eagle';
  if (value === -1) return 'birdie';
  if (value === 1) return 'bogey';
  if (value === 2) return 'double bogey';
  if (value === 3) return 'triple bogey';
  return 'par';
}

function clearCurrentCompactMemory() {
  try {
    window.localStorage.removeItem(SCORE_MEMORY_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function setCompactScoreMemoryFromPlayers(players) {
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

function findButtonByText(text) {
  return [...document.querySelectorAll('button')].find(button => getText(button) === text);
}

function updateReactInput(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function getSavedRoundTable(card) {
  return card.querySelector('.scorecard-table');
}

function getSavedHeaderLabels(table) {
  const headerRow = table?.querySelector('thead tr') || table?.querySelector('tr');
  return [...(headerRow?.querySelectorAll('th,td') || [])].map(cell => getText(cell));
}

function getSavedRoundRows(card) {
  const table = getSavedRoundTable(card);
  if (!table) return [];

  return [...table.querySelectorAll('tbody tr')].filter(row => {
    if (row.classList.contains('par-row')) return false;
    const firstCell = getText(row.querySelector('th,td')).toLowerCase();
    return firstCell && firstCell !== 'par';
  });
}

function parseSavedRound(card) {
  const table = getSavedRoundTable(card);
  const headers = getSavedHeaderLabels(table);
  const rows = getSavedRoundRows(card);

  return rows.map((row, playerIndex) => {
    const cells = [...row.querySelectorAll('th,td')];
    const name = getText(cells[0]) || `Player ${playerIndex + 1}`;
    const scores = {};

    cells.forEach((cell, index) => {
      const header = headers[index];
      const hole = Number(header);
      if (!Number.isInteger(hole) || hole < 1 || hole > 18) return;

      const value = scoreValueFromCell(cell);
      if (typeof value !== 'number') return;
      scores[hole] = value;
    });

    return { name, scores };
  });
}

function getScoredHoles(players) {
  const holes = new Set();
  players.forEach(player => {
    Object.keys(player.scores).forEach(hole => holes.add(Number(hole)));
  });
  return [...holes].filter(Number.isFinite).sort((a, b) => a - b);
}

function getResumeHole(players) {
  for (let hole = 1; hole <= 18; hole += 1) {
    const isComplete = players.every(player => typeof player.scores[hole] === 'number');
    if (!isComplete) return hole;
  }

  return 18;
}

function clickHole(hole) {
  const holeButton = [...document.querySelectorAll('.hole-picker button')].find(button => getText(button) === String(hole));
  holeButton?.click();
}

function applyScoresForHole(players, hole) {
  const holeCards = [...document.querySelectorAll('.active-hole-panel .player-score-grid .player-hole-card')];

  players.forEach((player, playerIndex) => {
    const value = player.scores[hole];
    if (typeof value !== 'number') return;

    const label = scoreKeyFromValue(value);
    const button = [...(holeCards[playerIndex]?.querySelectorAll('.score-buttons button') || [])]
      .find(scoreButton => getText(scoreButton).toLowerCase().includes(label));
    button?.click();
  });
}

function restoreScoredHolesSequentially(players, holes, index, resumeHole) {
  if (index >= holes.length) {
    setCompactScoreMemoryFromPlayers(players);
    window.setTimeout(() => clickHole(resumeHole), 180);
    return;
  }

  const hole = holes[index];
  clickHole(hole);

  window.setTimeout(() => {
    applyScoresForHole(players, hole);
    window.setTimeout(() => restoreScoredHolesSequentially(players, holes, index + 1, resumeHole), 140);
  }, 140);
}

function resumeSavedRound(card) {
  const players = parseSavedRound(card);
  if (!players.length) {
    window.alert('Could not read this saved round.');
    return;
  }

  const scoredHoles = getScoredHoles(players);
  const resumeHole = getResumeHole(players);

  const closeButton = [...card.querySelectorAll('button')].find(button => getText(button) === 'Close');
  closeButton?.click();

  window.setTimeout(() => {
    clearCurrentCompactMemory();
    findButtonByText('Reset')?.click();

    window.setTimeout(() => {
      const sourceCards = [...document.querySelectorAll('.active-hole-panel .player-score-grid .player-hole-card')];

      players.forEach((player, index) => {
        const sourceInput = sourceCards[index]?.querySelector('input');
        if (sourceInput) updateReactInput(sourceInput, player.name);
      });

      restoreScoredHolesSequentially(players, scoredHoles, 0, resumeHole);
    }, 250);
  }, 100);
}

function isSavedRoundView(card) {
  const text = getText(card).toLowerCase();
  return text.includes('viewing saved round') && Boolean(card.querySelector('.scorecard-table'));
}

function isIncompleteSavedRound(card) {
  if (!isSavedRoundView(card)) return false;

  const text = getText(card).toLowerCase();
  if (text.includes('incomplete round')) return true;
  if (text.includes('in progress')) return true;

  const players = parseSavedRound(card);
  return players.length > 0 && getResumeHole(players) < 18;
}

function addResumeButtons() {
  document.querySelectorAll('.card').forEach(card => {
    if (card.dataset.resumeSavedRoundReady === 'true') return;
    if (!isIncompleteSavedRound(card)) return;

    const closeButton = [...card.querySelectorAll('button')].find(button => getText(button) === 'Close');
    const resumeButton = document.createElement('button');
    resumeButton.type = 'button';
    resumeButton.className = 'button primary tbd-resume-saved-round';
    resumeButton.textContent = 'Resume Round';
    resumeButton.addEventListener('click', () => resumeSavedRound(card));

    if (closeButton?.parentNode) {
      closeButton.parentNode.insertBefore(resumeButton, closeButton);
    } else {
      card.appendChild(resumeButton);
    }

    card.dataset.resumeSavedRoundReady = 'true';
  });
}

function refreshSavedRoundsAccess() {
  addHeaderButton();
  addFooterButton();
  addResumeButtons();
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

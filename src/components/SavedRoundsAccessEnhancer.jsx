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

function scoreTextToNumber(text) {
  const cleaned = normalizeText(text);
  if (!cleaned || cleaned === 'E') return 0;
  const match = cleaned.match(/[+-]?\d+/);
  return match ? Number(match[0]) : 0;
}

function scoreKeyFromValue(value) {
  if (value === -2) return 'eagle';
  if (value === -1) return 'birdie';
  if (value === 1) return 'bogey';
  if (value === 2) return 'double_bogey';
  if (value === 3) return 'triple_bogey';
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

function getSavedRoundRows(card) {
  const table = card.querySelector('.scorecard-table');
  if (!table) return [];

  return [...table.querySelectorAll('tbody tr')].filter(row => !row.classList.contains('par-row'));
}

function parseSavedRound(card) {
  const rows = getSavedRoundRows(card);

  return rows.map((row, playerIndex) => {
    const cells = [...row.querySelectorAll('th,td')];
    const name = normalizeText(cells[0]?.textContent) || `Player ${playerIndex + 1}`;
    const scores = {};

    cells.slice(1, 19).forEach((cell, index) => {
      const text = normalizeText(cell.textContent);
      if (!text) return;

      const value = scoreTextToNumber(text);
      scores[index + 1] = value;
    });

    return { name, scores };
  });
}

function resumeSavedRound(card) {
  const players = parseSavedRound(card);
  if (!players.length) {
    window.alert('Could not read this saved round.');
    return;
  }

  const closeButton = [...card.querySelectorAll('button')].find(button => getText(button) === 'Close');
  closeButton?.click();

  window.setTimeout(() => {
    clearCurrentCompactMemory();
    setCompactScoreMemoryFromPlayers(players);

    findButtonByText('Reset')?.click();

    window.setTimeout(() => {
      const sourceCards = [...document.querySelectorAll('.active-hole-panel .player-score-grid .player-hole-card')];

      players.forEach((player, index) => {
        const sourceInput = sourceCards[index]?.querySelector('input');
        if (sourceInput) updateReactInput(sourceInput, player.name);
      });

      Object.entries(players[0]?.scores || {}).forEach(([hole]) => {
        const holeButton = [...document.querySelectorAll('.hole-picker button')].find(button => getText(button) === String(hole));
        holeButton?.click();

        window.setTimeout(() => {
          const holeCards = [...document.querySelectorAll('.active-hole-panel .player-score-grid .player-hole-card')];
          players.forEach((player, playerIndex) => {
            const value = player.scores[hole];
            if (typeof value !== 'number') return;

            const key = scoreKeyFromValue(value);
            const button = [...(holeCards[playerIndex]?.querySelectorAll('.score-buttons button') || [])]
              .find(scoreButton => scoreButton.textContent.toLowerCase().includes(key.replace('_', ' ')));
            button?.click();
          });
        }, 50);
      });

      const nextHole = Math.min(18, Math.max(1, Math.max(...players.map(player => Object.keys(player.scores).length)) + 1));
      window.setTimeout(() => {
        const holeButton = [...document.querySelectorAll('.hole-picker button')].find(button => getText(button) === String(nextHole));
        holeButton?.click();
      }, 500);
    }, 150);
  }, 100);
}

function addResumeButtons() {
  document.querySelectorAll('.card').forEach(card => {
    if (card.dataset.resumeSavedRoundReady === 'true') return;
    if (!getText(card).includes('Incomplete round')) return;
    if (!card.querySelector('.scorecard-table')) return;

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

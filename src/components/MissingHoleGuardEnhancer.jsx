'use client';

import { useEffect } from 'react';

function text(node) {
  return node?.textContent?.replace(/\s+/g, ' ').trim() || '';
}

function currentHoleNumber() {
  const label = [...document.querySelectorAll('strong')].find(node => /^Hole \d+ of 18$/i.test(text(node)));
  const match = text(label).match(/Hole (\d+) of 18/i);
  return match ? Number(match[1]) : null;
}

function currentHoleMissingPlayers() {
  const list = document.querySelector('.tbd-live-score-list');
  if (!list) return [];
  const rows = [...list.children];
  return rows.filter(row => /No score yet/i.test(text(row))).map(row => {
    const input = row.querySelector('input[title="Saved player profile"]');
    if (input?.value) return input.value;
    const button = [...row.querySelectorAll('button')].find(btn => !/Add Score|Birdie|Eagle|Bogey|Par/i.test(text(btn)));
    return text(button) || 'A player';
  });
}

function ensureWarning(message) {
  const scorecard = document.querySelector('#scorecard');
  if (!scorecard) return;
  let warning = scorecard.querySelector('[data-tbd-missing-hole-warning]');
  if (!warning) {
    warning = document.createElement('div');
    warning.setAttribute('data-tbd-missing-hole-warning', 'true');
    Object.assign(warning.style, {
      marginTop: '12px',
      border: '2px solid rgba(208,169,72,.72)',
      borderRadius: '14px',
      padding: '12px 14px',
      background: 'rgba(208,169,72,.12)',
      color: '#fff4d6',
      fontWeight: '800',
      lineHeight: '1.4'
    });
    scorecard.appendChild(warning);
  }
  warning.textContent = message;
  warning.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearWarning() {
  document.querySelector('[data-tbd-missing-hole-warning]')?.remove();
}

function inspectScorecardForMissingHoles() {
  const table = document.querySelector('.scorecard-table');
  if (!table) return [];
  const rows = [...table.querySelectorAll('tbody tr')];
  if (!rows.length) return [];
  const missing = new Set();
  rows.forEach(row => {
    const cells = [...row.querySelectorAll('td')];
    cells.slice(1, 19).forEach((cell, index) => {
      if (!text(cell)) missing.add(index + 1);
    });
  });
  return [...missing].sort((a, b) => a - b);
}

export default function MissingHoleGuardEnhancer() {
  useEffect(() => {
    const clickGuard = event => {
      const button = event.target?.closest?.('button');
      if (!button || text(button) !== 'Next Hole') return;
      const hole = currentHoleNumber();
      if (!hole) return;
      const missingPlayers = currentHoleMissingPlayers();
      if (!missingPlayers.length) {
        clearWarning();
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      const names = missingPlayers.join(', ');
      ensureWarning(`Hole ${hole} is incomplete. Add a score for ${names} before moving to the next hole.`);
    };

    const validateRoundComplete = () => {
      const completeCard = [...document.querySelectorAll('#scorecard strong')].find(node => text(node) === 'Round complete');
      if (!completeCard) return;

      const scorecardToggle = [...document.querySelectorAll('#scorecard button')].find(button => text(button) === 'Show Scorecard');
      let openedForCheck = false;
      if (scorecardToggle) {
        scorecardToggle.click();
        openedForCheck = true;
      }

      window.setTimeout(() => {
        const missing = inspectScorecardForMissingHoles();
        if (missing.length) {
          const card = completeCard.parentElement;
          if (card) {
            const title = card.querySelector('strong');
            const detail = card.querySelector('span');
            if (title) title.textContent = 'Round incomplete';
            if (detail) detail.textContent = `Missing score${missing.length === 1 ? '' : 's'} on hole${missing.length === 1 ? '' : 's'} ${missing.join(', ')}.`;
          }
          ensureWarning(`You still have unscored hole${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}. Finish ${missing.length === 1 ? 'it' : 'them'} before the round can be complete.`);
        }

        if (openedForCheck) {
          const hide = [...document.querySelectorAll('#scorecard button')].find(button => text(button) === 'Hide Scorecard');
          hide?.click();
        }
      }, 0);
    };

    document.addEventListener('click', clickGuard, true);
    const interval = window.setInterval(validateRoundComplete, 500);

    return () => {
      document.removeEventListener('click', clickGuard, true);
      window.clearInterval(interval);
      clearWarning();
    };
  }, []);

  return null;
}

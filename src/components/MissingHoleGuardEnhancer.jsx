'use client';

import { useEffect, useRef } from 'react';

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
    const input = row.querySelector('input[title="Saved player profile"], input[title="Guest player"]');
    if (input?.value) return input.value;
    const button = [...row.querySelectorAll('button')].find(btn => !/Add Score|Birdie|Eagle|Bogey|Par/i.test(text(btn)));
    return text(button) || 'A player';
  });
}

function ensureWarning(message, kind = 'current', hole = null) {
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
  warning.dataset.tbdMissingHoleKind = kind;
  if (hole) warning.dataset.tbdMissingHoleNumber = String(hole);
  else delete warning.dataset.tbdMissingHoleNumber;
  warning.textContent = message;
  warning.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearWarning() {
  document.querySelector('[data-tbd-missing-hole-warning]')?.remove();
}

function scorecardTable() {
  return document.querySelector('#scorecard .scorecard-table');
}

function missingScoresThroughHole(maxHole) {
  const table = scorecardTable();
  if (!table || !maxHole) return [];
  const rows = [...table.querySelectorAll('tbody tr')];
  const missing = [];

  rows.forEach(row => {
    const playerName = text(row.querySelector('th')) || 'Player';
    const cells = [...row.querySelectorAll('td')];
    const holes = [];
    cells.slice(1, Math.min(maxHole, 18) + 1).forEach((cell, index) => {
      if (!text(cell)) holes.push(index + 1);
    });
    if (holes.length) missing.push({ playerName, holes });
  });

  return missing;
}

function missingMessage(missing) {
  if (!missing.length) return '';
  return missing.map(item => `${item.playerName} ${item.holes.length === 1 ? 'is missing Hole' : 'is missing Holes'} ${item.holes.join(', ')}`).join('. ') + '. Complete those scores before continuing.';
}

function withVisibleScorecard(callback) {
  const show = [...document.querySelectorAll('#scorecard button')].find(button => text(button) === 'Show Scorecard');
  const openedForCheck = Boolean(show);
  if (show) show.click();

  window.setTimeout(() => {
    callback();
    if (openedForCheck) {
      const hide = [...document.querySelectorAll('#scorecard button')].find(button => text(button) === 'Hide Scorecard');
      hide?.click();
    }
  }, 0);
}

export default function MissingHoleGuardEnhancer() {
  const lastPlayerCountRef = useRef(0);

  useEffect(() => {
    function checkPastHoleGaps({ announce = false, blockEvent = null } = {}) {
      const hole = currentHoleNumber();
      if (!hole || hole <= 1) return false;

      let found = false;
      withVisibleScorecard(() => {
        const missing = missingScoresThroughHole(hole - 1);
        if (missing.length) {
          found = true;
          if (blockEvent) {
            blockEvent.preventDefault();
            blockEvent.stopPropagation();
            blockEvent.stopImmediatePropagation?.();
          }
          ensureWarning(missingMessage(missing), 'past');
        } else {
          const warning = document.querySelector('[data-tbd-missing-hole-warning]');
          if (warning?.dataset.tbdMissingHoleKind === 'past') clearWarning();
        }
      });
      return found;
    }

    const clickGuard = event => {
      const button = event.target?.closest?.('button');
      if (!button || text(button) !== 'Next Hole') return;
      const hole = currentHoleNumber();
      if (!hole) return;

      const missingPlayers = currentHoleMissingPlayers();
      if (missingPlayers.length) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        ensureWarning(`Hole ${hole} is incomplete. Add a score for ${missingPlayers.join(', ')} before moving to the next hole.`, 'current', hole);
        return;
      }

      if (hole > 1) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        withVisibleScorecard(() => {
          const missing = missingScoresThroughHole(hole - 1);
          if (missing.length) {
            ensureWarning(missingMessage(missing), 'past');
            return;
          }
          clearWarning();
          button.click();
        });
        return;
      }

      clearWarning();
    };

    function validateWarningsAndNewPlayers() {
      const list = document.querySelector('.tbd-live-score-list');
      const playerCount = list?.children?.length ?? 0;
      const hole = currentHoleNumber();

      if (playerCount > lastPlayerCountRef.current && lastPlayerCountRef.current > 0 && hole > 1) {
        window.setTimeout(() => {
          withVisibleScorecard(() => {
            const missing = missingScoresThroughHole(hole - 1);
            if (missing.length) ensureWarning(missingMessage(missing), 'past');
          });
        }, 80);
      }
      if (playerCount) lastPlayerCountRef.current = playerCount;

      const warning = document.querySelector('[data-tbd-missing-hole-warning]');
      if (!warning) return;

      if (warning.dataset.tbdMissingHoleKind === 'current') {
        const warningHole = Number(warning.dataset.tbdMissingHoleNumber || 0);
        if (warningHole === hole && currentHoleMissingPlayers().length === 0) clearWarning();
        return;
      }

      if (warning.dataset.tbdMissingHoleKind === 'past' && hole > 1) {
        withVisibleScorecard(() => {
          if (!missingScoresThroughHole(hole - 1).length) clearWarning();
        });
      }
    }

    const validateRoundComplete = () => {
      const completeCard = [...document.querySelectorAll('#scorecard strong')].find(node => text(node) === 'Round complete');
      if (!completeCard) return;

      withVisibleScorecard(() => {
        const missing = missingScoresThroughHole(18);
        if (missing.length) {
          const card = completeCard.parentElement;
          if (card) {
            const title = card.querySelector('strong');
            const detail = card.querySelector('span');
            if (title) title.textContent = 'Round incomplete';
            if (detail) detail.textContent = 'One or more players still have unscored holes.';
          }
          ensureWarning(missingMessage(missing), 'past');
        }
      });
    };

    document.addEventListener('click', clickGuard, true);
    const interval = window.setInterval(() => {
      validateWarningsAndNewPlayers();
      validateRoundComplete();
    }, 450);

    return () => {
      document.removeEventListener('click', clickGuard, true);
      window.clearInterval(interval);
      clearWarning();
    };
  }, []);

  return null;
}

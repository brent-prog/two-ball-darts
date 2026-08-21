'use client';

import { useEffect } from 'react';

function getText(node) {
  return String(node?.textContent || '').replace(/\s+/g, ' ').trim();
}

function isMobileViewport() {
  return window.matchMedia('(max-width: 760px)').matches;
}

function hasRoundScores() {
  return Boolean(
    document.querySelector('.score-symbol')
    || document.querySelector('.score-buttons button.selected')
    || document.querySelector('.tbd-player-score-row.scored')
  );
}

function findButtonByTexts(texts) {
  return [...document.querySelectorAll('button')].find(button => texts.includes(getText(button)));
}

function isScoringActive() {
  return Boolean(document.querySelector('.active-hole-panel'));
}

function replaceTextNodeValue(node) {
  let value = node.nodeValue || '';
  const original = value;

  value = value.replaceAll('LIVE MODE', 'SCORING MODE');
  value = value.replaceAll('Live Mode', 'Scoring Mode');
  value = value.replaceAll('LIVE ROUND', 'SCORING MODE');
  value = value.replaceAll('Live Round', 'Scoring Mode');
  value = value.replaceAll('Exit Live Mode', 'Exit Scoring');
  value = value.replaceAll('Enter Live Mode', hasRoundScores() ? 'Resume Scoring' : 'Start New Round');

  if (value !== original) node.nodeValue = value;
}

function renameScoringLanguage() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach(replaceTextNodeValue);

  document.querySelectorAll('button').forEach(button => {
    const text = getText(button);
    if (text === 'Start New Round' && hasRoundScores() && !isScoringActive()) button.textContent = 'Resume Scoring';
  });
}

function clickRealAction(action) {
  const textMap = {
    exit: ['Exit Scoring', 'Exit Live Mode'],
    addPlayer: ['Add player', 'Add Player'],
    reset: ['Reset'],
    save: ['Save round', 'Save Round']
  };

  const button = findButtonByTexts(textMap[action] || []);
  if (button) button.click();
}

function closeMenu(menu) {
  menu?.classList.remove('is-open');
  const button = menu?.querySelector('.tbd-scoring-menu-trigger');
  button?.setAttribute('aria-expanded', 'false');
}

function createMenu() {
  const menu = document.createElement('div');
  menu.className = 'tbd-scoring-mode-menu';
  menu.innerHTML = `
    <button type="button" class="tbd-scoring-menu-trigger" aria-expanded="false" aria-label="Scoring menu">☰</button>
    <div class="tbd-scoring-menu-panel">
      <button type="button" data-menu-action="addPlayer">Add Player</button>
      <button type="button" data-menu-action="save">Save Round</button>
      <button type="button" data-menu-action="reset">Reset Round</button>
      <button type="button" data-menu-action="exit">Exit Scoring</button>
    </div>
  `;

  menu.querySelector('.tbd-scoring-menu-trigger')?.addEventListener('click', event => {
    event.stopPropagation();
    const isOpen = menu.classList.toggle('is-open');
    event.currentTarget.setAttribute('aria-expanded', String(isOpen));
  });

  menu.querySelectorAll('[data-menu-action]').forEach(button => {
    button.addEventListener('click', event => {
      const action = event.currentTarget.dataset.menuAction;
      closeMenu(menu);
      window.setTimeout(() => clickRealAction(action), 0);
    });
  });

  return menu;
}

function getMenuAnchor() {
  const previousButton = findButtonByTexts(['Previous Hole']);
  if (previousButton?.parentElement) return previousButton.parentElement;

  const nextButton = findButtonByTexts(['Next Hole', 'NEXT HOLE']);
  if (nextButton?.parentElement) return nextButton.parentElement;

  const activePanel = document.querySelector('.active-hole-panel');
  return activePanel?.parentElement || activePanel || null;
}

function ensureScoringMenu() {
  if (!isScoringActive()) {
    document.querySelector('.tbd-scoring-mode-menu')?.remove();
    document.body.classList.remove('tbd-scoring-menu-active');
    document.querySelectorAll('.tbd-scoring-nav-actions').forEach(node => node.classList.remove('tbd-scoring-nav-actions'));
    return;
  }

  const anchor = getMenuAnchor();
  if (!anchor) return;

  anchor.classList.add('tbd-scoring-nav-actions');

  let menu = document.querySelector('.tbd-scoring-mode-menu');
  if (!menu) menu = createMenu();

  const trigger = menu.querySelector('.tbd-scoring-menu-trigger');
  if (trigger && getText(trigger) !== '☰') trigger.textContent = '☰';

  if (menu.parentElement !== anchor) {
    anchor.insertBefore(menu, anchor.firstElementChild);
  }

  document.body.classList.toggle('tbd-scoring-menu-active', isMobileViewport());
}

function markUtilityButtons() {
  const labels = ['Exit Scoring', 'Exit Live Mode', 'Add player', 'Add Player', 'Reset', 'Save round', 'Save Round'];
  document.querySelectorAll('button').forEach(button => {
    if (button.closest('.tbd-scoring-mode-menu')) return;
    if (labels.includes(getText(button))) button.classList.add('tbd-scoring-menu-hidden-action');
  });
}

export default function ScoringModeMenuEnhancer() {
  useEffect(() => {
    function refresh() {
      renameScoringLanguage();
      ensureScoringMenu();
      markUtilityButtons();
    }

    function closeOpenMenus(event) {
      if (!event.target.closest('.tbd-scoring-mode-menu')) {
        closeMenu(document.querySelector('.tbd-scoring-mode-menu'));
      }
    }

    refresh();
    const intervalId = window.setInterval(refresh, 350);
    document.addEventListener('click', refresh, true);
    document.addEventListener('click', closeOpenMenus);
    window.addEventListener('resize', refresh);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('click', refresh, true);
      document.removeEventListener('click', closeOpenMenus);
      window.removeEventListener('resize', refresh);
    };
  }, []);

  return null;
}

'use client';

import { useEffect } from 'react';

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function getText(node) {
  return normalizeText(node?.textContent || '');
}

function hideElement(element) {
  if (!element) return;
  element.style.display = 'none';
  element.setAttribute('aria-hidden', 'true');
}

function hideActionControl(control) {
  if (!control || control.closest('.tbd-score-modal')) return;

  const menuItem = control.closest('li, .menu-item, .nav-item');
  hideElement(menuItem || control);
}

function renameLiveModeButton() {
  document.querySelectorAll('button, a').forEach(control => {
    if (getText(control) === 'Enter Live Mode') {
      control.textContent = 'Start New Round';
    }
  });
}

function hideOldActionButtons() {
  document.querySelectorAll('button, a').forEach(control => {
    const text = getText(control);
    const href = control.getAttribute('href') || '';
    const ariaLabel = normalizeText(control.getAttribute('aria-label') || '');
    const combined = `${text} ${ariaLabel} ${href}`.toLowerCase();

    if (text === 'Start Scoring') hideActionControl(control);
    if (text === 'Score by Darts') hideActionControl(control);
    if (combined.includes('score by darts')) hideActionControl(control);
    if (combined.includes('start scoring')) hideActionControl(control);
  });
}

function removeHiddenScorecardMessage() {
  document.querySelectorAll('p, div, span').forEach(element => {
    if (getText(element) === 'Scorecard is hidden during live scoring to keep entry fast.') {
      element.remove();
    }
  });
}

function hideOldScoreByDartsSection() {
  document.querySelectorAll('.card, section, article').forEach(element => {
    if (element.closest('.tbd-score-modal')) return;

    const headings = [...element.querySelectorAll('.eyebrow, h2, h3')].map(getText);
    const hasScoreByDartsHeading = headings.some(text => text === 'Score by Darts' || text === 'Score By Darts');
    const hasOldDartControls = [...element.querySelectorAll('select option')]
      .some(option => ['Single target', 'Double / triple target', 'Safe on-board miss', 'Hazard / off-board miss'].includes(getText(option)));

    if (hasScoreByDartsHeading && hasOldDartControls) {
      hideElement(element);
    }
  });
}

function refreshStructuralCleanup() {
  renameLiveModeButton();
  hideOldActionButtons();
  removeHiddenScorecardMessage();
  hideOldScoreByDartsSection();
}

export default function StructuralCleanupEnhancer() {
  useEffect(() => {
    refreshStructuralCleanup();

    const intervalId = window.setInterval(refreshStructuralCleanup, 750);
    document.addEventListener('click', refreshStructuralCleanup, true);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('click', refreshStructuralCleanup, true);
    };
  }, []);

  return null;
}

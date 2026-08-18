'use client';

import { useEffect } from 'react';

function getText(node) {
  return node?.textContent?.trim() || '';
}

function hideElement(element) {
  if (!element) return;
  element.style.display = 'none';
  element.setAttribute('aria-hidden', 'true');
}

function renameLiveModeButton() {
  document.querySelectorAll('button').forEach(button => {
    if (getText(button) === 'Enter Live Mode') {
      button.textContent = 'Start New Round';
    }
  });
}

function hideOldActionButtons() {
  document.querySelectorAll('button').forEach(button => {
    const text = getText(button);
    if (text === 'Start Scoring') hideElement(button);
    if (text === 'Score by Darts') hideElement(button);
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
  hideOldScoreByDartsSection();
}

export default function StructuralCleanupEnhancer() {
  useEffect(() => {
    refreshStructuralCleanup();

    const intervalId = window.setInterval(refreshStructuralCleanup, 1000);
    document.addEventListener('click', refreshStructuralCleanup, true);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('click', refreshStructuralCleanup, true);
    };
  }, []);

  return null;
}

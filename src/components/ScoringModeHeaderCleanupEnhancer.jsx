'use client';

import { useEffect } from 'react';

function getText(node) {
  return String(node?.textContent || '').replace(/\s+/g, ' ').trim();
}

function isMobileViewport() {
  return window.matchMedia('(max-width: 760px)').matches;
}

function isInstructionText(text) {
  return text.toLowerCase() === "choose the current hole, score each player's two darts, then move to the next hole.";
}

function cleanupScoringHeader() {
  const scoringPanelExists = Boolean(document.querySelector('.active-hole-panel'));
  if (!scoringPanelExists || !isMobileViewport()) return;

  document.querySelectorAll('p, h1, h2, h3, .eyebrow').forEach(node => {
    const text = getText(node);

    if (['LIVE MODE', 'Live Mode', 'LIVE ROUND', 'Live Round'].includes(text)) {
      node.textContent = 'SCORING MODE';
      return;
    }

    if (isInstructionText(text)) {
      node.dataset.tbdScoringInstructionHidden = 'true';
      node.style.display = 'none';
    }
  });
}

export default function ScoringModeHeaderCleanupEnhancer() {
  useEffect(() => {
    cleanupScoringHeader();

    const intervalId = window.setInterval(cleanupScoringHeader, 500);
    document.addEventListener('click', cleanupScoringHeader, true);
    window.addEventListener('resize', cleanupScoringHeader);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('click', cleanupScoringHeader, true);
      window.removeEventListener('resize', cleanupScoringHeader);
    };
  }, []);

  return null;
}

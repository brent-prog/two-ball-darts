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

  document.querySelectorAll('*').forEach(node => {
    if (node.children.length > 0) return;

    const text = getText(node);
    if (!text || text.length > 90) return;

    if (text === 'LIVE MODE' || text === 'Live Mode' || text === 'LIVE ROUND' || text === 'Live Round') {
      node.textContent = text === text.toUpperCase() ? 'SCORING MODE' : 'Scoring Mode';
      return;
    }

    if (text.includes('Live Mode')) {
      node.textContent = text.replaceAll('Live Mode', 'Scoring Mode');
      return;
    }

    if (text.includes('LIVE MODE')) {
      node.textContent = text.replaceAll('LIVE MODE', 'SCORING MODE');
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

    const intervalId = window.setInterval(cleanupScoringHeader, 350);
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

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

function replaceLiveModeTextNodes(root = document.body) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const replacements = [];

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const value = String(node.nodeValue || '');
    if (/\bLIVE MODE\b/.test(value) || /\bLive Mode\b/.test(value)) {
      replacements.push(node);
    }
  }

  replacements.forEach(node => {
    node.nodeValue = String(node.nodeValue || '')
      .replace(/LIVE MODE/g, 'SCORING MODE')
      .replace(/Live Mode/g, 'Scoring Mode');
  });
}

function hideInstructionCopy() {
  document.querySelectorAll('*').forEach(node => {
    if (node.children.length > 0) return;

    const text = getText(node);
    if (!text || text.length > 120) return;

    if (text === 'LIVE MODE' || text === 'Live Mode' || text === 'LIVE ROUND' || text === 'Live Round') {
      node.textContent = text === text.toUpperCase() ? 'SCORING MODE' : 'Scoring Mode';
      return;
    }

    if (isInstructionText(text)) {
      node.dataset.tbdScoringInstructionHidden = 'true';
      node.style.display = 'none';
    }
  });
}

function labelScoredActionButtons() {
  document.querySelectorAll('.tbd-player-score-row.scored').forEach(row => {
    const statusText = getText(row.querySelector('.tbd-hole-status'));
    const actionButton = [...row.querySelectorAll('button')]
      .find(button => ['Edit Score', 'Add Score'].includes(getText(button)) || button.classList.contains('tbd-score-result-action'));

    if (!statusText || statusText === 'No score yet' || !actionButton) return;

    actionButton.dataset.tbdOriginalAction = actionButton.dataset.tbdOriginalAction || 'Edit Score';
    actionButton.textContent = statusText;
    actionButton.classList.add('tbd-score-result-action');
  });

  document.querySelectorAll('.tbd-player-score-row:not(.scored) button.tbd-score-result-action').forEach(button => {
    button.textContent = 'Add Score';
    button.classList.remove('tbd-score-result-action');
  });
}

function cleanupScoringHeader() {
  const scoringPanelExists = Boolean(document.querySelector('.active-hole-panel'));
  if (!scoringPanelExists || !isMobileViewport()) return;

  replaceLiveModeTextNodes();
  hideInstructionCopy();
  labelScoredActionButtons();
}

export default function ScoringModeHeaderCleanupEnhancer() {
  useEffect(() => {
    cleanupScoringHeader();

    const intervalId = window.setInterval(cleanupScoringHeader, 350);
    document.addEventListener('click', cleanupScoringHeader, true);
    document.addEventListener('change', cleanupScoringHeader, true);
    window.addEventListener('resize', cleanupScoringHeader);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('click', cleanupScoringHeader, true);
      document.removeEventListener('change', cleanupScoringHeader, true);
      window.removeEventListener('resize', cleanupScoringHeader);
    };
  }, []);

  return null;
}

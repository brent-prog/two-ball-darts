'use client';

import { useEffect } from 'react';

function textOf(node) {
  return String(node?.textContent || '').replace(/\s+/g, ' ').trim();
}

function findButton(label) {
  return [...document.querySelectorAll('button')].find(button => textOf(button) === label);
}

function findButtonMatching(pattern) {
  return [...document.querySelectorAll('button')].find(button => pattern.test(textOf(button)));
}

function isScoringMode() {
  return Boolean(document.querySelector('[aria-label="Scoring menu"]'));
}

function isRoundComplete() {
  const panel = document.querySelector('.active-hole-panel');
  if (!panel) return false;
  const heading = textOf(panel.querySelector('h3'));
  const completeLabel = [...panel.querySelectorAll('strong')].some(node => textOf(node) === 'Round complete');
  return /^Hole\s+18$/i.test(heading) && completeLabel;
}

function isSavedScorecardClose(button) {
  if (!button || textOf(button) !== 'Close') return false;
  const modal = button.closest('[style*="position: fixed"]');
  if (!modal) return false;
  return [...modal.querySelectorAll('p')].some(node => textOf(node) === 'Viewing saved round');
}

function exitScoringToHome() {
  if (!isScoringMode()) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  const exitButton = findButton('Exit Scoring');
  if (exitButton) {
    exitButton.click();
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 120);
    return;
  }

  const menuButton = document.querySelector('[aria-label="Scoring menu"]');
  if (!menuButton) return;
  menuButton.click();
  window.setTimeout(exitScoringToHome, 80);
}

function resetCompletedRoundAndReturnHome() {
  if (!isScoringMode()) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  const menuButton = document.querySelector('[aria-label="Scoring menu"]');
  if (!menuButton) {
    exitScoringToHome();
    return;
  }

  menuButton.click();
  window.setTimeout(() => {
    const resetButton = findButton('Reset Round');
    if (resetButton) resetButton.click();
    window.setTimeout(exitScoringToHome, 100);
  }, 80);
}

function triggerNativeSave() {
  const saveButton = findButtonMatching(/^(Save round|Save changes)$/i);
  if (saveButton && !saveButton.disabled) {
    saveButton.click();
    return true;
  }

  const menuButton = document.querySelector('[aria-label="Scoring menu"]');
  if (!menuButton) return false;
  menuButton.click();

  window.setTimeout(() => {
    const menuSaveButton = findButtonMatching(/^(Save round|Save changes)$/i);
    if (menuSaveButton && !menuSaveButton.disabled) menuSaveButton.click();
  }, 80);

  return true;
}

export default function RoundCompletionSaveEnhancer() {
  useEffect(() => {
    let autoSaveTriggered = false;
    let frameId = null;

    function refresh() {
      frameId = null;

      const scoring = isScoringMode();
      const complete = scoring && isRoundComplete();

      if (!scoring || !complete) autoSaveTriggered = false;

      if (complete && !autoSaveTriggered) {
        autoSaveTriggered = triggerNativeSave();
      }
    }

    function scheduleRefresh() {
      if (frameId) return;
      frameId = window.requestAnimationFrame(refresh);
    }

    function handleClick(event) {
      const button = event.target?.closest?.('button');
      if (isScoringMode() && isSavedScorecardClose(button)) {
        window.setTimeout(resetCompletedRoundAndReturnHome, 80);
      }
      scheduleRefresh();
    }

    scheduleRefresh();

    const observer = new MutationObserver(scheduleRefresh);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['disabled'] });

    document.addEventListener('click', handleClick, true);

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      observer.disconnect();
      document.removeEventListener('click', handleClick, true);
    };
  }, []);

  return null;
}

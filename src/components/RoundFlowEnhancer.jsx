'use client';

import { useEffect } from 'react';

function findButtonByText(text) {
  return [...document.querySelectorAll('button')].find(button => button.textContent.trim() === text);
}

function goToHoleOne() {
  window.setTimeout(() => {
    const holeOne = [...document.querySelectorAll('.hole-picker button')].find(button => button.textContent.trim() === '1');
    holeOne?.click();
  }, 0);
}

function updateHazardOptions() {
  document.querySelectorAll('option').forEach(option => {
    const text = option.textContent.trim();
    if (text === 'On-board miss / bull') option.textContent = 'Safe on-board miss';
    if (text === 'Off the board') option.textContent = 'Hazard / off-board miss';
  });
}

function updateHazardRulesCopy() {
  document.querySelectorAll('.rule-answer p').forEach(paragraph => {
    const text = paragraph.textContent.trim();
    if (!text.startsWith('Local rulings:')) return;

    paragraph.innerHTML = '<strong>Hazards:</strong> Red bull, green bull, 19, 20, and any dart completely off the board are hazards. A hazard counts the same as a complete board miss. Only the active hole number is a target. Every other board number is a miss. Safe on-board misses still count as on-board, but hazards do not. Worst possible score on any hole is triple bogey.';
  });
}

function updateHowToPlayCopy() {
  const quickStartHeading = [...document.querySelectorAll('.eyebrow')].find(node => node.textContent.trim() === 'Quick start');
  const card = quickStartHeading?.closest('.card');
  if (!card) return;

  card.querySelectorAll('span').forEach(span => {
    const text = span.textContent.trim();
    if (text === 'Two singles OR double/triple target + on-board miss') span.textContent = 'Two singles OR double/triple target + safe on-board miss';
    if (text === 'Single target + on-board miss OR double/triple target + off board') span.textContent = 'Single target + safe on-board miss OR double/triple target + hazard';
    if (text === 'No target hits with both darts on-board OR single target + off board') span.textContent = 'No target hits with both darts safe on-board OR single target + hazard';
    if (text === 'No target hits + at least one off-board dart') span.textContent = 'No target hits + at least one hazard';
  });

  const orderedList = card.querySelector('ol');
  if (!orderedList || card.dataset.hazardsQuickStartReady === 'true') return;

  const hazardItem = document.createElement('li');
  hazardItem.textContent = 'Hazards are red bull, green bull, 19, 20, or completely off the board. Hazards count like a complete board miss.';
  orderedList.insertBefore(hazardItem, orderedList.children[4] ?? null);
  card.dataset.hazardsQuickStartReady = 'true';
}

function updateFooterCopy() {
  document.querySelectorAll('footer p').forEach(paragraph => {
    const text = paragraph.textContent.trim();
    if (text === '18 holes. Two darts per hole. Bulls count for nothing - ever.') {
      paragraph.textContent = '18 holes. Two darts per hole. Bulls, 19s, and 20s are hazards.';
    }
  });
}

function updateLiveScorecardDefault() {
  document.querySelectorAll('p').forEach(paragraph => {
    if (paragraph.textContent.trim() === 'Scorecard is hidden during live scoring to keep entry fast.') {
      paragraph.style.display = 'none';
    }
  });

  if (document.body.dataset.liveScorecardDefaultReady === 'true') return;

  const showScorecardButton = findButtonByText('Show Scorecard');
  if (!showScorecardButton) return;

  document.body.dataset.liveScorecardDefaultReady = 'true';
  showScorecardButton.click();
}

function refreshEnhancements() {
  updateHazardOptions();
  updateHazardRulesCopy();
  updateHowToPlayCopy();
  updateFooterCopy();
  updateLiveScorecardDefault();
}

export default function RoundFlowEnhancer() {
  useEffect(() => {
    function startNewRound() {
      const closeButton = findButtonByText('Close');
      closeButton?.click();

      window.setTimeout(() => {
        const resetButton = findButtonByText('Reset');
        resetButton?.click();
        goToHoleOne();
      }, 0);
    }

    function addStartNewRoundButton() {
      const savedRoundHeading = [...document.querySelectorAll('.eyebrow')].find(node => node.textContent.trim() === 'Viewing saved round');
      const card = savedRoundHeading?.closest('.card');
      if (!card || card.dataset.startNewRoundReady === 'true') return;

      const closeButton = [...card.querySelectorAll('button')].find(button => button.textContent.trim() === 'Close');
      if (!closeButton) return;

      const buttonRow = document.createElement('div');
      buttonRow.style.display = 'flex';
      buttonRow.style.gap = '10px';
      buttonRow.style.flexWrap = 'wrap';
      buttonRow.style.justifyContent = 'flex-end';

      const startButton = document.createElement('button');
      startButton.type = 'button';
      startButton.className = 'button secondary';
      startButton.textContent = 'Start New Round';
      startButton.addEventListener('click', startNewRound);

      closeButton.parentNode?.insertBefore(buttonRow, closeButton);
      buttonRow.appendChild(startButton);
      buttonRow.appendChild(closeButton);
      card.dataset.startNewRoundReady = 'true';
    }

    function handleClick(event) {
      const button = event.target.closest('button');
      if (!button) return;

      const buttonText = button.textContent.trim();

      if (buttonText === 'Reset') {
        goToHoleOne();
      }

      if (buttonText === 'Hide Scorecard') {
        document.body.dataset.liveScorecardDefaultReady = 'true';
      }

      window.setTimeout(() => {
        addStartNewRoundButton();
        refreshEnhancements();
      }, 0);
    }

    addStartNewRoundButton();
    refreshEnhancements();

    const intervalId = window.setInterval(() => {
      addStartNewRoundButton();
      refreshEnhancements();
    }, 750);

    document.addEventListener('click', handleClick, true);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('click', handleClick, true);
    };
  }, []);

  return null;
}

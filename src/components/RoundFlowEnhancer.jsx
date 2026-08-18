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

function refreshEnhancements() {
  updateHazardOptions();
  updateHazardRulesCopy();
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

      if (button.textContent.trim() === 'Reset') {
        goToHoleOne();
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

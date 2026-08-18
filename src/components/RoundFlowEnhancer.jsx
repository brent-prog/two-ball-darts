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

function updateHazardLanguage() {
  document.querySelectorAll('option').forEach(option => {
    if (option.textContent.trim() === 'On-board miss / bull') option.textContent = 'Safe on-board miss';
    if (option.textContent.trim() === 'Off the board') option.textContent = 'Hazard / off-board miss';
  });

  document.querySelectorAll('.rule-answer p').forEach(paragraph => {
    paragraph.textContent = paragraph.textContent
      .replaceAll('one on-board miss', 'one safe on-board miss')
      .replaceAll('plus one on-board miss', 'plus one safe on-board miss')
      .replaceAll('one off-board dart', 'one hazard/off-board miss')
      .replaceAll('at least one off-board dart', 'at least one hazard/off-board miss')
      .replaceAll('Bulls count for nothing - ever. A bull is still an on-board miss.', 'Bulls, 19s, and 20s are hazards. Treat them the same as a complete board miss.');
  });
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

      window.setTimeout(updateHazardLanguage, 0);
    }

    addStartNewRoundButton();
    updateHazardLanguage();
    const observer = new MutationObserver(() => {
      addStartNewRoundButton();
      updateHazardLanguage();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('click', handleClick, true);

    return () => {
      observer.disconnect();
      document.removeEventListener('click', handleClick, true);
    };
  }, []);

  return null;
}

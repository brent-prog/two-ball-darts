'use client';

import { useEffect } from 'react';

function getActiveHoleNumber() {
  const heading = document.querySelector('.active-hole-panel h3');
  const match = heading?.textContent?.trim()?.match(/hole\s+(\d+)/i);
  return match ? Number(match[1]) : 1;
}

function findVisibleButton(text) {
  return [...document.querySelectorAll('button')].find(button => {
    if (button.textContent.trim() !== text) return false;
    const style = window.getComputedStyle(button);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
}

function goToNextHole() {
  const currentHole = getActiveHoleNumber();
  if (currentHole >= 18) return;

  const nextHole = String(currentHole + 1);
  const nextPickerButton = [...document.querySelectorAll('.hole-picker button')]
    .find(button => button.textContent.trim() === nextHole);

  if (nextPickerButton) {
    nextPickerButton.click();
    return;
  }

  const existingNext = findVisibleButton('Next Hole');
  if (existingNext && !existingNext.classList.contains('tbd-next-hole-action')) {
    existingNext.click();
  }
}

function ensureNextHoleButton() {
  const previousButton = findVisibleButton('Previous Hole');
  if (!previousButton) return;

  let nextButton = document.querySelector('.tbd-next-hole-action');
  if (!nextButton) {
    nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.className = 'tbd-next-hole-action';
    nextButton.textContent = 'Next Hole';
    nextButton.addEventListener('click', goToNextHole);
    previousButton.insertAdjacentElement('afterend', nextButton);
  }

  const currentHole = getActiveHoleNumber();
  nextButton.disabled = currentHole >= 18;
  nextButton.style.display = '';
}

export default function NextHoleNavEnhancer() {
  useEffect(() => {
    ensureNextHoleButton();

    const intervalId = window.setInterval(ensureNextHoleButton, 600);
    document.addEventListener('click', ensureNextHoleButton, true);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('click', ensureNextHoleButton, true);
    };
  }, []);

  return null;
}

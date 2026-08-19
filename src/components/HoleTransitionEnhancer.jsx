'use client';

import { useEffect } from 'react';

function getActiveHoleNumber() {
  const heading = document.querySelector('.active-hole-panel h3');
  const match = heading?.textContent?.trim()?.match(/hole\s+(\d+)/i);
  return match ? Number(match[1]) : null;
}

function triggerHoleTransition() {
  const panel = document.querySelector('.active-hole-panel');
  if (!panel) return;

  panel.classList.remove('tbd-hole-advancing');
  document.body.classList.remove('tbd-hole-advancing-page');

  window.requestAnimationFrame(() => {
    panel.classList.add('tbd-hole-advancing');
    document.body.classList.add('tbd-hole-advancing-page');

    window.setTimeout(() => {
      panel.classList.remove('tbd-hole-advancing');
      document.body.classList.remove('tbd-hole-advancing-page');
    }, 720);
  });
}

export default function HoleTransitionEnhancer() {
  useEffect(() => {
    let previousHole = getActiveHoleNumber();

    const intervalId = window.setInterval(() => {
      const currentHole = getActiveHoleNumber();
      if (!currentHole) return;

      if (previousHole !== null && currentHole !== previousHole) {
        triggerHoleTransition();
      }

      previousHole = currentHole;
    }, 120);

    return () => window.clearInterval(intervalId);
  }, []);

  return null;
}

'use client';

import { useEffect } from 'react';

function refresh() {
  const scorecard = document.querySelector('#scorecard');
  if (!scorecard) return;

  const eyebrow = scorecard.querySelector('.eyebrow');
  const mode = eyebrow?.textContent?.trim().toLowerCase();

  if (mode === 'live round') {
    scorecard.style.display = 'none';
    scorecard.setAttribute('aria-hidden', 'true');
  } else {
    scorecard.style.display = '';
    scorecard.removeAttribute('aria-hidden');
  }
}

export default function HomeLiveRoundCleanup() {
  useEffect(() => {
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    document.addEventListener('click', refresh, true);

    return () => {
      observer.disconnect();
      document.removeEventListener('click', refresh, true);
      const scorecard = document.querySelector('#scorecard');
      if (scorecard) {
        scorecard.style.display = '';
        scorecard.removeAttribute('aria-hidden');
      }
    };
  }, []);

  return null;
}

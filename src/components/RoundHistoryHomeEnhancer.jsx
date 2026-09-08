'use client';

import { useEffect } from 'react';

function text(node) {
  return node?.textContent?.replace(/\s+/g, ' ').trim() || '';
}

export default function RoundHistoryHomeEnhancer() {
  useEffect(() => {
    function cleanupLegacyHistory() {
      [...document.querySelectorAll('.hero-actions button')].forEach(button => {
        if (text(button) === 'Saved Rounds') button.style.display = 'none';
      });

      [...document.querySelectorAll('section.card')].forEach(section => {
        if (section.hasAttribute('data-tbd-round-history-host')) return;
        const heading = section.querySelector('h2');
        const eyebrow = section.querySelector('.eyebrow');
        const isLegacySavedRounds = text(heading).toLowerCase() === 'saved rounds' || text(eyebrow).toLowerCase() === 'supabase history';
        if (isLegacySavedRounds) section.style.setProperty('display', 'none', 'important');
      });
    }

    cleanupLegacyHistory();
    const observer = new MutationObserver(cleanupLegacyHistory);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}

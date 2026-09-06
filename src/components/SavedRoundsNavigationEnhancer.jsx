'use client';

import { useEffect } from 'react';

export default function SavedRoundsNavigationEnhancer() {
  useEffect(() => {
    const handler = event => {
      const button = event.target?.closest?.('button');
      if (!button || button.textContent?.trim() !== 'Saved Rounds') return;

      window.setTimeout(() => {
        const heading = [...document.querySelectorAll('h2')].find(node => node.textContent?.trim().toLowerCase() === 'saved rounds');
        const section = heading?.closest?.('section');
        if (!section) return;
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    };

    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  return null;
}

'use client';

import { useEffect } from 'react';

export default function MainAccountButtonEnhancer() {
  useEffect(() => {
    const addButton = () => {
      if (document.querySelector('[data-tbd-account]')) return;
      const playersButton = document.querySelector('[data-tbd-player-profiles]');
      const savedRoundsButton = [...document.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Saved Rounds');
      const anchor = playersButton || savedRoundsButton;
      if (!anchor?.parentElement) return;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'button secondary';
      button.textContent = 'My Profile';
      button.setAttribute('data-tbd-account', 'true');
      anchor.insertAdjacentElement('afterend', button);
    };

    addButton();
    const observer = new MutationObserver(addButton);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}

'use client';

import { useEffect } from 'react';

function addButton() {
  if (document.querySelector('[data-tbd-player-profiles]')) return;
  const savedButton = [...document.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Saved Rounds');
  if (!savedButton) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button secondary';
  button.dataset.tbdPlayerProfiles = 'true';
  button.textContent = 'Player Profiles';
  savedButton.insertAdjacentElement('afterend', button);
}

export default function MainPlayerProfilesButtonEnhancer() {
  useEffect(() => {
    addButton();
    const observer = new MutationObserver(addButton);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return null;
}

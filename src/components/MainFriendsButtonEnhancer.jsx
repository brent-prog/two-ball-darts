'use client';

import { useEffect } from 'react';

function addButton() {
  if (document.querySelector('[data-tbd-friends]')) return;
  const profileButton = document.querySelector('[data-tbd-player-profiles]');
  if (!profileButton) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button secondary';
  button.dataset.tbdFriends = 'true';
  button.textContent = 'Friends';
  profileButton.insertAdjacentElement('afterend', button);
}

export default function MainFriendsButtonEnhancer() {
  useEffect(() => {
    addButton();
    const observer = new MutationObserver(addButton);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return null;
}

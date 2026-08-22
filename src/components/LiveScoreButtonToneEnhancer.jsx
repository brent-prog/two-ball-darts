'use client';

import { useEffect } from 'react';

const toneClasses = [
  'is-eagle',
  'is-birdie',
  'is-par',
  'is-bogey',
  'is-double-bogey',
  'is-triple-bogey'
];

function applyTone(button) {
  if (!button) return;
  toneClasses.forEach(className => button.classList.remove(className));
  const label = String(button.textContent || '').trim().toLowerCase();
  if (label.startsWith('eagle')) button.classList.add('is-eagle');
  else if (label.startsWith('birdie')) button.classList.add('is-birdie');
  else if (label.startsWith('par')) button.classList.add('is-par');
  else if (label.startsWith('double bogey')) button.classList.add('is-double-bogey');
  else if (label.startsWith('triple bogey')) button.classList.add('is-triple-bogey');
  else if (label.startsWith('bogey')) button.classList.add('is-bogey');
}

function refresh() {
  document.querySelectorAll('.tbd-player-score-row.scored > button').forEach(applyTone);
}

export default function LiveScoreButtonToneEnhancer() {
  useEffect(() => {
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);
  return null;
}

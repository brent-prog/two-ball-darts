'use client';

import { useEffect } from 'react';

function nearTop() {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}

export default function StartupPositionGuardEnhancer() {
  useEffect(() => {
    let userInteracted = false;

    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const originalHash = window.location.hash;

    if (originalHash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    nearTop();
    window.setTimeout(nearTop, 60);
    window.setTimeout(nearTop, 250);
    window.setTimeout(nearTop, 700);

    function markInteraction(event) {
      if (event?.isTrusted === false) return;
      userInteracted = true;
    }

    function preventEarlyAutoScroll() {
      if (userInteracted) return;
      if (window.scrollY > 24) nearTop();
    }

    document.addEventListener('pointerdown', markInteraction, true);
    document.addEventListener('keydown', markInteraction, true);
    window.addEventListener('scroll', preventEarlyAutoScroll, true);

    return () => {
      document.removeEventListener('pointerdown', markInteraction, true);
      document.removeEventListener('keydown', markInteraction, true);
      window.removeEventListener('scroll', preventEarlyAutoScroll, true);
    };
  }, []);

  return null;
}

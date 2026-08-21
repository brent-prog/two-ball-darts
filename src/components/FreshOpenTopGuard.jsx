'use client';

import { useEffect } from 'react';

export default function FreshOpenTopGuard() {
  useEffect(() => {
    let userInteracted = false;
    let cancelled = false;

    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    function scrollTop() {
      if (cancelled || userInteracted) return;
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }

    function markInteraction(event) {
      if (event?.isTrusted === false) return;
      userInteracted = true;
    }

    document.addEventListener('pointerdown', markInteraction, true);
    document.addEventListener('keydown', markInteraction, true);

    scrollTop();
    window.requestAnimationFrame(scrollTop);
    window.setTimeout(scrollTop, 75);
    window.setTimeout(scrollTop, 250);
    window.setTimeout(scrollTop, 650);

    return () => {
      cancelled = true;
      document.removeEventListener('pointerdown', markInteraction, true);
      document.removeEventListener('keydown', markInteraction, true);
    };
  }, []);

  return null;
}

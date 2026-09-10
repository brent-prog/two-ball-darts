'use client';

import { useEffect } from 'react';

export default function OffBoardDartOptionEnhancer() {
  useEffect(() => {
    const sync = () => {
      document.querySelectorAll('.tbd-custom-dart-options').forEach(group => {
        group.querySelectorAll('.tbd-custom-dart-option').forEach(button => {
          const label = button.textContent?.trim();

          if (label === 'Safe Miss') {
            button.textContent = 'On-Board Miss';
            button.classList.remove('is-neutral');
            button.classList.add('is-onboard-miss');
          }

          if (label === 'Hazard') {
            button.classList.remove('is-red');
            button.classList.add('is-hazard');
          }

          if (label === 'Off Board Miss') {
            button.remove();
          }
        });
      });
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}

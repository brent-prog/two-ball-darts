'use client';

import { useEffect } from 'react';

export default function OffBoardDartOptionEnhancer() {
  useEffect(() => {
    const installGroup = group => {
      if (group.dataset.tbdOffboardInstalled === '1') return;

      const hazard = [...group.querySelectorAll('.tbd-custom-dart-option')]
        .find(button => button.textContent?.trim() === 'Hazard');
      if (!hazard) return;

      group.dataset.tbdOffboardInstalled = '1';
      hazard.dataset.tbdRole = 'hazard';
      hazard.classList.remove('is-red');
      hazard.classList.add('is-hazard');

      const offboard = document.createElement('button');
      offboard.type = 'button';
      offboard.className = 'tbd-custom-dart-option is-offboard';
      offboard.dataset.tbdRole = 'offboard';
      offboard.textContent = 'Off Board Miss';

      offboard.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        hazard.click();
        window.requestAnimationFrame(() => {
          group.querySelectorAll('.tbd-custom-dart-option').forEach(button => button.classList.remove('is-selected'));
          offboard.classList.add('is-selected');
        });
      });

      hazard.addEventListener('click', () => {
        window.requestAnimationFrame(() => {
          offboard.classList.remove('is-selected');
        });
      });

      group.appendChild(offboard);
    };

    const install = () => {
      document.querySelectorAll('.tbd-custom-dart-options').forEach(installGroup);
    };

    install();
    const observer = new MutationObserver(install);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}

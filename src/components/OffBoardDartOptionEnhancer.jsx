'use client';

import { useEffect } from 'react';

export default function OffBoardDartOptionEnhancer() {
  useEffect(() => {
    const syncGroup = group => {
      const buttons = [...group.querySelectorAll('.tbd-custom-dart-option')];
      const hazard = buttons.find(button => button.dataset.tbdRole === 'hazard' || button.textContent?.trim() === 'Hazard');
      if (!hazard) return;

      hazard.dataset.tbdRole = 'hazard';
      hazard.classList.remove('is-red');
      hazard.classList.add('is-hazard');

      let offboard = group.querySelector('.tbd-custom-dart-option.is-offboard');
      if (!offboard) {
        offboard = hazard.cloneNode(true);
        offboard.textContent = 'Off Board Miss';
        offboard.dataset.tbdRole = 'offboard';
        offboard.classList.remove('is-selected', 'is-hazard', 'is-red');
        offboard.classList.add('is-offboard');
        group.appendChild(offboard);

        offboard.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          group.dataset.tbdLastChoice = 'offboard';
          hazard.click();
          window.requestAnimationFrame(() => syncGroup(group));
        });
      }

      if (!hazard.dataset.tbdChoiceBound) {
        hazard.dataset.tbdChoiceBound = '1';
        hazard.addEventListener('click', () => {
          group.dataset.tbdLastChoice = 'hazard';
          window.requestAnimationFrame(() => syncGroup(group));
        });
      }

      buttons.filter(button => button !== hazard).forEach(button => {
        if (button.dataset.tbdRole === 'offboard' || button.dataset.tbdOtherBound) return;
        button.dataset.tbdOtherBound = '1';
        button.addEventListener('click', () => {
          group.dataset.tbdLastChoice = '';
          window.requestAnimationFrame(() => syncGroup(group));
        });
      });

      const hazardSelected = hazard.classList.contains('is-selected');
      const offboardSelected = hazardSelected && group.dataset.tbdLastChoice === 'offboard';
      offboard.classList.toggle('is-selected', offboardSelected);
      hazard.classList.toggle('is-selected', hazardSelected && !offboardSelected);
    };

    const sync = () => {
      document.querySelectorAll('.tbd-custom-dart-options').forEach(syncGroup);
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return null;
}

'use client';

import { useEffect } from 'react';

const OPTIONS = [
  { value: 'power', label: 'Double / Triple', tone: 'green' },
  { value: 'single', label: 'Single', tone: 'gold' },
  { value: 'safe', label: 'Safe Miss', tone: 'neutral' },
  { value: 'hazard', label: 'Hazard', tone: 'red' }
];

function setSelectValue(select, value) {
  if (!select) return;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set;
  setter?.call(select, value);
  select.dispatchEvent(new Event('input', { bubbles: true }));
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function buildPicker(label, select) {
  const picker = document.createElement('div');
  picker.className = 'tbd-custom-dart-picker';
  picker.dataset.dartPickerFor = label;

  const heading = document.createElement('div');
  heading.className = 'tbd-custom-dart-picker-heading';
  heading.textContent = label;
  picker.appendChild(heading);

  const grid = document.createElement('div');
  grid.className = 'tbd-custom-dart-options';

  OPTIONS.forEach(option => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `tbd-custom-dart-option is-${option.tone}`;
    button.textContent = option.label;
    button.dataset.dartValue = option.value;
    button.addEventListener('click', () => {
      setSelectValue(select, option.value);
      syncPickerState(picker, select.value);
    });
    grid.appendChild(button);
  });

  picker.appendChild(grid);
  syncPickerState(picker, select.value);
  return picker;
}

function syncPickerState(picker, value) {
  picker.querySelectorAll('.tbd-custom-dart-option').forEach(button => {
    button.classList.toggle('is-selected', button.dataset.dartValue === value);
  });
}

function enhanceDartSelectors() {
  const card = document.querySelector('.tbd-score-modal-card');
  if (!card) return;

  const selects = [...card.querySelectorAll('.tbd-dart-select-grid select')];
  if (selects.length < 2) return;

  const grid = card.querySelector('.tbd-dart-select-grid');
  if (!grid || grid.dataset.tbdCustomPickerReady === 'true') {
    const pickers = [...card.querySelectorAll('.tbd-custom-dart-picker')];
    pickers.forEach((picker, index) => syncPickerState(picker, selects[index]?.value || ''));
    return;
  }

  grid.dataset.tbdCustomPickerReady = 'true';
  grid.classList.add('has-custom-dart-pickers');

  selects.forEach((select, index) => {
    const nativeLabel = select.closest('label');
    nativeLabel?.classList.add('tbd-native-dart-select-hidden');

    const picker = buildPicker(index === 0 ? 'Dart 1' : 'Dart 2', select);
    grid.appendChild(picker);

    select.addEventListener('change', () => syncPickerState(picker, select.value));
  });
}

export default function DartPickerEnhancer() {
  useEffect(() => {
    enhanceDartSelectors();

    const observer = new MutationObserver(enhanceDartSelectors);
    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('click', enhanceDartSelectors, true);

    return () => {
      observer.disconnect();
      document.removeEventListener('click', enhanceDartSelectors, true);
    };
  }, []);

  return null;
}

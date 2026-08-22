'use client';

import { useEffect } from 'react';

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function textOf(node) {
  return normalizeText(node?.textContent || '');
}

function findButton(label) {
  return [...document.querySelectorAll('button')].find(button => textOf(button) === label);
}

function findNativeSavedRoundsButton() {
  return [...document.querySelectorAll('button')].find(button => {
    return textOf(button) === 'Saved Rounds' && !button.classList.contains('tbd-saved-rounds-access');
  });
}

function findSavedRoundsSection() {
  return [...document.querySelectorAll('section.card')].find(section => {
    const heading = section.querySelector('h2');
    return textOf(heading).toLowerCase() === 'saved rounds';
  });
}

function openNativeSavedRounds() {
  const nativeButton = findNativeSavedRoundsButton();
  if (nativeButton) {
    nativeButton.click();
    window.setTimeout(() => {
      findSavedRoundsSection()?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return;
  }

  const exitButton = findButton('Exit Scoring') || findButton('Exit Scoring Mode');
  if (exitButton) {
    exitButton.click();
    window.setTimeout(openNativeSavedRounds, 160);
  }
}

function makeAccessButton(location) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `button secondary tbd-saved-rounds-access tbd-saved-rounds-${location}`;
  button.textContent = 'Saved Rounds';
  button.addEventListener('click', openNativeSavedRounds);
  return button;
}

function ensureHeaderAccess() {
  const shell = document.querySelector('.app-shell');
  if (!shell || shell.querySelector('.tbd-saved-rounds-header-wrap')) return;

  const wrap = document.createElement('div');
  wrap.className = 'tbd-saved-rounds-header-wrap';
  wrap.style.display = 'flex';
  wrap.style.justifyContent = 'flex-end';
  wrap.style.marginBottom = '10px';
  wrap.appendChild(makeAccessButton('header'));
  shell.prepend(wrap);
}

function ensureFooterAccess() {
  const footer = document.querySelector('footer');
  if (!footer || footer.querySelector('.tbd-saved-rounds-footer')) return;

  const wrap = document.createElement('div');
  wrap.className = 'tbd-saved-rounds-footer-wrap';
  wrap.style.display = 'flex';
  wrap.style.justifyContent = 'center';
  wrap.style.marginTop = '16px';
  wrap.appendChild(makeAccessButton('footer'));
  footer.appendChild(wrap);
}

function refreshAccess() {
  ensureHeaderAccess();
  ensureFooterAccess();
}

export default function SavedRoundsAccessEnhancer() {
  useEffect(() => {
    refreshAccess();

    const observer = new MutationObserver(refreshAccess);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}

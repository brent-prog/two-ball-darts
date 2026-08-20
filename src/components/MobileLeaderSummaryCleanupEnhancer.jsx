'use client';

import { useEffect } from 'react';

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function isMobileViewport() {
  return window.matchMedia('(max-width: 760px)').matches;
}

function hasLeaderSummaryText(element) {
  const text = normalizeText(element.textContent);
  return text.includes('leader')
    && text.includes('score')
    && text.includes('strokes')
    && text.includes('hole')
    && !text.includes('live round')
    && !text.includes('live mode');
}

function isUnsafeContainer(element) {
  const tag = element.tagName?.toLowerCase();
  if (['html', 'body', 'main', 'header', 'footer'].includes(tag)) return true;
  if (element.id === '__next') return true;
  return false;
}

function getVisibleArea(element) {
  const rect = element.getBoundingClientRect();
  return Math.max(0, rect.width) * Math.max(0, rect.height);
}

function findSmallestLeaderSummaryCard() {
  const candidates = [...document.querySelectorAll('section, article, div, aside')]
    .filter(element => !isUnsafeContainer(element))
    .filter(element => hasLeaderSummaryText(element))
    .filter(element => !normalizeText(element.textContent).includes('choose the current hole'))
    .map(element => ({ element, area: getVisibleArea(element), textLength: normalizeText(element.textContent).length }))
    .filter(candidate => candidate.area > 0)
    .sort((a, b) => a.area - b.area || a.textLength - b.textLength);

  return candidates[0]?.element || null;
}

function resetPreviouslyHidden() {
  document.querySelectorAll('[data-tbd-mobile-leader-hidden="true"]').forEach(element => {
    element.style.display = '';
    delete element.dataset.tbdMobileLeaderHidden;
  });
}

function hideMobileLeaderSummary() {
  resetPreviouslyHidden();

  if (!isMobileViewport()) return;

  const card = findSmallestLeaderSummaryCard();
  if (!card) return;

  card.dataset.tbdMobileLeaderHidden = 'true';
  card.style.display = 'none';
}

export default function MobileLeaderSummaryCleanupEnhancer() {
  useEffect(() => {
    hideMobileLeaderSummary();

    const intervalId = window.setInterval(hideMobileLeaderSummary, 800);
    window.addEventListener('resize', hideMobileLeaderSummary);
    document.addEventListener('click', hideMobileLeaderSummary, true);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('resize', hideMobileLeaderSummary);
      document.removeEventListener('click', hideMobileLeaderSummary, true);
    };
  }, []);

  return null;
}

'use client';

import { useEffect } from 'react';

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function isMobileViewport() {
  return window.matchMedia('(max-width: 760px)').matches;
}

function isUnsafeContainer(element) {
  const tag = element.tagName?.toLowerCase();
  return ['html', 'body', 'main', 'header', 'footer'].includes(tag) || element.id === '__next';
}

function isVisible(element) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
}

function hasSummaryLabels(element) {
  const text = normalizeText(element.textContent);
  return text.includes('leader')
    && text.includes('score')
    && text.includes('strokes')
    && text.includes('hole')
    && !text.includes('choose the current hole')
    && !text.includes('live round');
}

function looksLikeSummaryCard(element) {
  const rect = element.getBoundingClientRect();
  if (!isVisible(element)) return false;
  if (rect.width < window.innerWidth * 0.65) return false;
  if (rect.height < 260) return false;
  if (rect.height > window.innerHeight * 0.75) return false;
  return hasSummaryLabels(element);
}

function findSummaryCardFromLeaderLabel() {
  const labels = [...document.querySelectorAll('*')]
    .filter(element => normalizeText(element.textContent) === 'leader');

  for (const label of labels) {
    let current = label.parentElement;

    while (current && !isUnsafeContainer(current)) {
      if (looksLikeSummaryCard(current)) return current;
      current = current.parentElement;
    }
  }

  return null;
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

  const card = findSummaryCardFromLeaderLabel();
  if (!card) return;

  card.dataset.tbdMobileLeaderHidden = 'true';
  card.style.display = 'none';
}

export default function MobileLeaderSummaryCleanupEnhancer() {
  useEffect(() => {
    hideMobileLeaderSummary();

    const intervalId = window.setInterval(hideMobileLeaderSummary, 500);
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

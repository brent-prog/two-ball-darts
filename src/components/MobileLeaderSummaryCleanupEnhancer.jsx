'use client';

import { useEffect } from 'react';

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function isMobileViewport() {
  return window.matchMedia('(max-width: 760px)').matches;
}

function cardHasLeaderSummary(card) {
  const text = normalizeText(card.textContent);
  return text.includes('leader')
    && text.includes('score')
    && text.includes('strokes')
    && text.includes('hole')
    && !text.includes('live round')
    && !text.includes('live mode');
}

function hideMobileLeaderSummary() {
  const candidates = [...document.querySelectorAll('section, article, .card, .hero, .panel, header > div')];

  candidates.forEach(candidate => {
    if (!cardHasLeaderSummary(candidate)) return;

    if (isMobileViewport()) {
      candidate.dataset.tbdMobileLeaderHidden = 'true';
      candidate.style.display = 'none';
      return;
    }

    if (candidate.dataset.tbdMobileLeaderHidden === 'true') {
      candidate.style.display = '';
      delete candidate.dataset.tbdMobileLeaderHidden;
    }
  });
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

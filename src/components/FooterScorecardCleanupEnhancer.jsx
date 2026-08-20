'use client';

import { useEffect } from 'react';

function hideFooterScorecardAction() {
  document.querySelectorAll('footer button, footer a').forEach(control => {
    const text = control.textContent?.replace(/\s+/g, ' ').trim().toLowerCase();
    if (text !== 'scorecard') return;
    control.style.display = 'none';
    control.dataset.tbdFooterScorecardHidden = 'true';
  });
}

export default function FooterScorecardCleanupEnhancer() {
  useEffect(() => {
    hideFooterScorecardAction();

    const intervalId = window.setInterval(hideFooterScorecardAction, 1000);
    document.addEventListener('click', hideFooterScorecardAction, true);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('click', hideFooterScorecardAction, true);
    };
  }, []);

  return null;
}

'use client';

import { useEffect } from 'react';

const ATTR = 'data-tbd-scoring-feedback';

function text(node) {
  return node?.textContent?.replace(/\s+/g, ' ').trim() || '';
}

export default function ScoringFeedbackEnhancer() {
  useEffect(() => {
    function refresh() {
      const scorecard = document.querySelector('#scorecard');
      if (!scorecard) return;

      const isScoringMode = [...scorecard.querySelectorAll('.eyebrow')]
        .some(node => text(node).toLowerCase() === 'scoring mode');

      let wrap = scorecard.querySelector(`[${ATTR}]`);

      if (!isScoringMode) {
        wrap?.remove();
        return;
      }

      if (!wrap) {
        wrap = document.createElement('div');
        wrap.setAttribute(ATTR, 'true');
        Object.assign(wrap.style, {
          marginTop: '22px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(208,169,72,.28)',
          display: 'flex',
          justifyContent: 'center'
        });

        const link = document.createElement('a');
        link.href = 'mailto:info@twoballdarts.com?subject=TwoBall%20Darts%20Feedback';
        link.className = 'button secondary';
        link.textContent = 'Feedback / Contact Us';
        link.setAttribute('aria-label', 'Send feedback or contact TwoBall Darts');
        Object.assign(link.style, {
          minHeight: '44px',
          padding: '9px 16px',
          borderRadius: '14px',
          textDecoration: 'none'
        });

        wrap.appendChild(link);
        scorecard.appendChild(wrap);
      }
    }

    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => {
      observer.disconnect();
      document.querySelector(`[${ATTR}]`)?.remove();
    };
  }, []);

  return null;
}

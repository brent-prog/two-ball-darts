'use client';

import { useEffect, useRef } from 'react';

const PAGE_SIZE = 5;

function text(node) {
  return node?.textContent?.trim() || '';
}

function findHistorySection() {
  return [...document.querySelectorAll('section.card')].find(section => {
    const heading = section.querySelector('h2');
    return ['Saved rounds', 'Round History'].includes(text(heading));
  }) || null;
}

export default function RoundHistoryUXEnhancer() {
  const visibleCountRef = useRef(PAGE_SIZE);
  const autoLoadedRef = useRef(false);

  useEffect(() => {
    function removeTopSavedRoundsAction() {
      document.querySelectorAll('.hero-actions button').forEach(button => {
        if (text(button) === 'Saved Rounds') button.remove();
      });
    }

    function refreshHistory() {
      removeTopSavedRoundsAction();

      const section = findHistorySection();
      if (!section) return;

      const eyebrow = section.querySelector('.eyebrow');
      if (eyebrow) eyebrow.remove();

      const heading = section.querySelector('h2');
      if (heading) heading.textContent = 'Round History';

      const headingWrap = section.querySelector('.section-heading');
      const loadButton = headingWrap ? [...headingWrap.querySelectorAll('button')].find(button => text(button) === 'Load') : null;

      if (loadButton && !autoLoadedRef.current) {
        autoLoadedRef.current = true;
        loadButton.style.display = 'none';
        window.setTimeout(() => loadButton.click(), 0);
      } else if (loadButton) {
        loadButton.style.display = 'none';
      }

      const status = section.querySelector('.status-line');
      if (status && /saved round|loading saved rounds|loaded/i.test(text(status))) status.style.display = 'none';

      const list = section.querySelector('.history-list');
      if (!list) return;

      const rows = [...list.querySelectorAll('.history-row')];
      rows.forEach((row, index) => {
        row.style.display = index < visibleCountRef.current ? '' : 'none';
      });

      let loadMore = section.querySelector('[data-tbd-load-more-rounds]');
      const hasMore = rows.length > visibleCountRef.current;

      if (!hasMore) {
        loadMore?.remove();
        return;
      }

      if (!loadMore) {
        loadMore = document.createElement('button');
        loadMore.type = 'button';
        loadMore.className = 'button secondary';
        loadMore.setAttribute('data-tbd-load-more-rounds', 'true');
        loadMore.textContent = 'Load More';
        Object.assign(loadMore.style, {
          width: '100%',
          marginTop: '14px',
          minHeight: '48px',
          borderRadius: '14px'
        });
        loadMore.addEventListener('click', () => {
          visibleCountRef.current += PAGE_SIZE;
          refreshHistory();
        });
        list.insertAdjacentElement('afterend', loadMore);
      }
    }

    refreshHistory();
    const observer = new MutationObserver(refreshHistory);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => observer.disconnect();
  }, []);

  return null;
}

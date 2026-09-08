'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const PAGE_SIZE = 5;
const OWNER_KEY_STORAGE = 'two-ball-darts-owner-key';

function text(node) {
  return node?.textContent?.replace(/\s+/g, ' ').trim() || '';
}

function findHistorySection() {
  return [...document.querySelectorAll('section.card')].find(section => {
    const heading = section.querySelector('h2');
    return text(heading) === 'Saved rounds' || text(heading) === 'Round History';
  }) || null;
}

export default function RoundHistoryHomeEnhancer() {
  const visibleCountRef = useRef(PAGE_SIZE);
  const loadedRef = useRef(false);
  const loadingRef = useRef(false);

  useEffect(() => {
    let intervalId = null;
    let cancelled = false;

    async function syncAccountOwnerKey() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user || typeof window === 'undefined') return;

      let browserOwnerKey = window.localStorage.getItem(OWNER_KEY_STORAGE);
      if (!browserOwnerKey) {
        browserOwnerKey = crypto.randomUUID();
        window.localStorage.setItem(OWNER_KEY_STORAGE, browserOwnerKey);
      }

      const { data: canonicalOwnerKey, error } = await supabase.rpc('sync_my_owner_key', {
        browser_owner_key: browserOwnerKey
      });

      if (!error && canonicalOwnerKey && canonicalOwnerKey !== browserOwnerKey) {
        window.localStorage.setItem(OWNER_KEY_STORAGE, canonicalOwnerKey);
      }
    }

    async function loadHistoryOnce(loadButton) {
      if (loadedRef.current || loadingRef.current || !loadButton) return;
      loadingRef.current = true;
      try {
        await syncAccountOwnerKey();
        if (cancelled) return;
        loadedRef.current = true;
        loadButton.click();
      } finally {
        loadingRef.current = false;
      }
    }

    function applyHistoryPresentation() {
      const topSaved = [...document.querySelectorAll('.hero-actions button')]
        .find(button => text(button) === 'Saved Rounds');
      if (topSaved) topSaved.style.display = 'none';

      const section = findHistorySection();
      if (!section) return;

      const heading = section.querySelector('h2');
      if (heading && text(heading) !== 'Round History') heading.textContent = 'Round History';

      const eyebrow = section.querySelector('.eyebrow');
      if (eyebrow) eyebrow.style.display = 'none';

      const header = section.querySelector('.section-heading');
      const loadButton = header ? [...header.querySelectorAll('button')].find(button => text(button) === 'Load') : null;
      if (loadButton) {
        loadButton.style.display = 'none';
        void loadHistoryOnce(loadButton);
      }

      const status = section.querySelector('.status-line');
      if (status) {
        const value = text(status);
        const routineMessage = /loading saved rounds|saved rounds? loaded|no saved rounds found/i.test(value);
        status.style.display = routineMessage ? 'none' : '';
      }

      const list = section.querySelector('.history-list');
      if (!list) return;
      const rows = [...list.querySelectorAll('.history-row')];

      rows.forEach((row, index) => {
        row.style.display = index < visibleCountRef.current ? '' : 'none';
      });

      let loadMore = section.querySelector('[data-tbd-round-history-more]');
      const hasMore = rows.length > visibleCountRef.current;

      if (!hasMore) {
        if (loadMore) loadMore.style.display = 'none';
        return;
      }

      if (!loadMore) {
        loadMore = document.createElement('button');
        loadMore.type = 'button';
        loadMore.className = 'button secondary';
        loadMore.textContent = 'Load More';
        loadMore.setAttribute('data-tbd-round-history-more', 'true');
        loadMore.style.width = '100%';
        loadMore.style.marginTop = '14px';
        loadMore.style.minHeight = '48px';
        loadMore.style.borderRadius = '14px';
        loadMore.addEventListener('click', () => {
          visibleCountRef.current += PAGE_SIZE;
          applyHistoryPresentation();
        });
        list.insertAdjacentElement('afterend', loadMore);
      }
      loadMore.style.display = '';
    }

    applyHistoryPresentation();
    intervalId = window.setInterval(applyHistoryPresentation, 800);

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      loadedRef.current = false;
      loadingRef.current = false;
      visibleCountRef.current = PAGE_SIZE;
      window.setTimeout(applyHistoryPresentation, 100);
    });

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  return null;
}

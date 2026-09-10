'use client';

import { useEffect } from 'react';

export default function EmptyPlayerSlotEnhancer() {
  useEffect(() => {
    const sync = () => {
      document.querySelectorAll('.tbd-player-score-row').forEach((row, index) => {
        const chooser = row.querySelector('button.tbd-player-name-input');
        if (!chooser) return;

        row.dataset.tbdEmptySlot = '1';
        row.style.setProperty('display', 'block', 'important');
        row.style.setProperty('min-height', '0', 'important');
        row.style.setProperty('padding', '12px 14px', 'important');

        chooser.textContent = 'Choose Player';
        chooser.dataset.tbdSlot = String(index + 1);
        chooser.style.setProperty('display', 'flex', 'important');
        chooser.style.setProperty('align-items', 'center', 'important');
        chooser.style.setProperty('justify-content', 'space-between', 'important');
        chooser.style.setProperty('width', '100%', 'important');
        chooser.style.setProperty('min-height', '50px', 'important');
        chooser.style.setProperty('padding', '0 14px', 'important');
        chooser.style.setProperty('border', '1px solid rgba(244,239,226,.20)', 'important');
        chooser.style.setProperty('border-radius', '12px', 'important');
        chooser.style.setProperty('background', '#0b211a', 'important');
        chooser.style.setProperty('color', '#f4efe2', 'important');
        chooser.style.setProperty('font-size', '1.08rem', 'important');
        chooser.style.setProperty('font-weight', '850', 'important');
        chooser.style.setProperty('line-height', '1', 'important');

        row.querySelectorAll('.tbd-player-total-score, .tbd-honours-chip, .tbd-hole-status').forEach(el => {
          el.style.setProperty('display', 'none', 'important');
        });

        [...row.children].forEach(child => {
          if (child.matches?.('.button') && child !== chooser) child.style.setProperty('display', 'none', 'important');
        });
      });
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}

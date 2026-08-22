'use client';

import { useEffect, useState } from 'react';
import PlayerProfilesModal from '@/components/PlayerProfilesModal';

export default function MainPlayerProfilesAccess() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleClick(event) {
      const button = event.target.closest('[data-tbd-player-profiles]');
      if (!button) return;
      event.preventDefault();
      setOpen(true);
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return <PlayerProfilesModal open={open} onClose={() => setOpen(false)} browseOnly />;
}

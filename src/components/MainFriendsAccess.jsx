'use client';

import { useEffect, useState } from 'react';
import FriendsModal from '@/components/FriendsModal';

export default function MainFriendsAccess() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = event => {
      const trigger = event.target?.closest?.('[data-tbd-friends]');
      if (!trigger) return;
      event.preventDefault();
      setOpen(true);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  return <FriendsModal open={open} onClose={() => setOpen(false)} />;
}

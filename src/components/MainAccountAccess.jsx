'use client';

import { useEffect, useState } from 'react';
import AccountProfileModal from '@/components/AccountProfileModal';

export default function MainAccountAccess() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = event => {
      const trigger = event.target?.closest?.('[data-tbd-account]');
      if (!trigger) return;
      event.preventDefault();
      setOpen(true);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  return <AccountProfileModal open={open} onClose={() => setOpen(false)} />;
}

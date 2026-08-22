'use client';

import { useEffect } from 'react';

const FOOTER_HTML = `
  <div class="tbd-rockpail-footer-inner">
    <img
      src="/rockpail-footer-lockup.svg"
      alt="A RockPail Production - Keep Fun Simple"
      class="tbd-rockpail-footer-logo"
    />
  </div>
`;

function applyFooterBrand() {
  const footer = document.querySelector('main footer');
  if (!footer || footer.dataset.rockpailBranded === 'true') return;
  footer.dataset.rockpailBranded = 'true';
  footer.classList.add('tbd-rockpail-footer');
  footer.innerHTML = FOOTER_HTML;
}

export default function RockPailFooterEnhancer() {
  useEffect(() => {
    applyFooterBrand();
    const observer = new MutationObserver(applyFooterBrand);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}

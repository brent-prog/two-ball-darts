'use client';

import { useEffect } from 'react';

const FOOTER_HTML = `
  <div class="tbd-rockpail-footer-inner">
    <div class="tbd-footer-twoball">
      <img
        src="/two-ball-darts-logo.png"
        alt="Two Ball Darts"
        class="tbd-footer-twoball-logo"
      />
      <p class="tbd-footer-twoball-tagline">No gimmes. Just throw.</p>
    </div>

    <div class="tbd-footer-divider"></div>

    <div class="tbd-footer-rockpail">
      <a href="https://rockpail.com" aria-label="Visit RockPail.com">
        <img
          src="/rockpail-production-white-footer.png"
          alt="A RockPail Production"
          class="tbd-rockpail-footer-logo"
        />
      </a>
      <p class="tbd-footer-rockpail-purpose">KEEP FUN SIMPLE</p>
    </div>
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

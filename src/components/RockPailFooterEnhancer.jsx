'use client';

import { useEffect } from 'react';

const FOOTER_HTML = `
  <div class="tbd-rockpail-footer-inner">
    <div class="tbd-footer-twoball">
      <img
        src="/brand/twoball-logo-tm.svg"
        alt="Two Ball Darts™"
        class="tbd-footer-twoball-logo"
      />
      <p class="tbd-footer-twoball-tagline">No gimmes. Just throw.</p>
    </div>

    <div class="tbd-footer-divider"></div>

    <div class="tbd-footer-partners">
      <a class="tbd-footer-partner-link" href="https://rockpail.com" aria-label="Visit RockPail.com">
        <img
          src="/rockpail-production-white-footer.webp"
          alt="A RockPail Production"
          class="tbd-rockpail-footer-logo"
        />
      </a>
      <a class="tbd-footer-partner-link tbd-footer-kfs-link" href="https://keepfunsimple.com" aria-label="Visit KeepFunSimple.com">
        <img
          src="/keepfunsimple-primary-dark-bone-red.svg"
          alt="Keep Fun Simple™"
          class="tbd-kfs-footer-logo"
        />
      </a>
    </div>
  </div>
  <a class="tbd-footer-contact" href="mailto:info@twoballdarts.com">Contact / Feedback</a>
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

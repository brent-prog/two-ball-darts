'use client';

import { useEffect, useMemo, useState } from 'react';

const IMAGE_AD_WIDTH = 360;
const IMAGE_AD_HEIGHT = 135;

const DEFAULT_CREATIVES = [
  {
    id: 'keep-fun-simple',
    theme: 'kfs',
    logoSrc: '/keepfunsimple-logo-transparent.svg?v=20261002-4',
    logoAlt: 'KeepFunSimple',
    kicker: 'KEEP FUN SIMPLE',
    headline: 'IF YOU’RE PLAYING TWOBALL, YOU’RE ALREADY KFS.',
    body: '',
    cta: 'SHOP THE MERCH',
    href: 'https://keepfunsimple.com'
  },
  {
    id: 'rockpail',
    theme: 'rockpail',
    logoSrc: '/rockpail-yellow-logo.png?v=20261002-1',
    logoAlt: 'RockPail',
    kicker: 'THE GAME THAT STARTED IT.',
    headline: 'KEEP FUN SIMPLE.',
    body: 'Less setup. More throwing.',
    cta: 'ROCKPAIL.COM',
    href: 'https://rockpail.com'
  },
  {
    id: 'tiger-plumbing',
    kind: 'sponsor',
    theme: 'tiger',
    logoSrc: '/tiger-logo.webp?v=20261002-1',
    logoAlt: 'Tiger Plumbing',
    headline: 'A LEAK IS A HAZARD.',
    accentLine: 'YOU DON’T PLAY THROUGH.',
    meta: 'KW / GUELPH • 519-585-1840',
    detail: 'PLUMBING • HEATING • DRAINS • WATER TREATMENT',
    sceneSrc: '/tiger-plumbing-app-banner.webp?v=20261002-responsive',
    href: 'https://www.tigerplumbing.ca/'
  },
  {
    id: 'inflight-institute',
    kind: 'sponsor',
    theme: 'inflight',
    logoSrc: '/inflight-logo.webp?v=20261002-1',
    logoAlt: 'Inflight Institute',
    headline: 'BE PREPARED TO FLY!',
    body: 'ONLINE FLIGHT ATTENDANT TRAINING',
    cta: 'LEARN MORE',
    sceneSrc: '/inflight-institute-app-banner.webp?v=20261002-responsive',
    href: 'https://www.inflightinstitute.com/'
  }
];

export default function GameplayAdSlot({ creatives = DEFAULT_CREATIVES, intervalMs = 9000 }) {
  const available = useMemo(() => creatives.filter(Boolean), [creatives]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (available.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex(current => (current + 1) % available.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [available.length, intervalMs]);

  if (!available.length) return null;

  const creative = available[activeIndex % available.length];

  const content = creative.kind === 'sponsor' ? (
    <>
      <div
        className={`tbd-sponsor-scene tbd-sponsor-scene--${creative.theme}`}
        style={{ '--tbd-sponsor-scene': `url("${creative.sceneSrc}")` }}
        aria-hidden="true"
      />
      <div className="tbd-sponsor-copy">
        <img
          className="tbd-sponsor-logo"
          src={creative.logoSrc}
          alt={creative.logoAlt || ''}
          decoding="async"
        />
        <div className="tbd-sponsor-message">
          <strong>{creative.headline}</strong>
          {creative.accentLine ? <span className="tbd-sponsor-accent">{creative.accentLine}</span> : null}
          {creative.body ? <span className="tbd-sponsor-body">{creative.body}</span> : null}
          {creative.meta ? <span className="tbd-sponsor-meta">{creative.meta}</span> : null}
          {creative.detail ? <span className="tbd-sponsor-detail">{creative.detail}</span> : null}
        </div>
      </div>
      {creative.cta ? <div className="tbd-sponsor-cta">{creative.cta}</div> : null}
    </>
  ) : creative.imageSrc ? (
    <img
      className="tbd-ad-image"
      src={creative.imageSrc}
      alt={creative.imageAlt || ''}
      width={IMAGE_AD_WIDTH}
      height={IMAGE_AD_HEIGHT}
      decoding="async"
    />
  ) : (
    <>
      <div className="tbd-ad-motion" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="tbd-ad-copy">
        {creative.logoSrc ? (
          <img
            className="tbd-ad-brand-logo"
            src={creative.logoSrc}
            alt={creative.logoAlt || ''}
            decoding="async"
          />
        ) : null}
        <div className="tbd-ad-copy-text">
          {creative.theme === 'kfs' ? (
      <span className="tbd-ad-kicker tbd-kfs-wordmark">
        <span>KEEP</span> <em>FUN</em> <span>SIMPLE</span>
      </span>
    ) : (
      <span className="tbd-ad-kicker">{creative.kicker}</span>
    )}
          <strong>{creative.headline}</strong>
          <span className="tbd-ad-body">{creative.body}</span>
        </div>
      </div>
      <div className="tbd-ad-cta">{creative.cta}</div>
    </>
  );

  return (
    <aside className="tbd-gameplay-ad" aria-label="TwoBall promotion">
      <span className="tbd-ad-label">AD</span>
      {creative.href ? (
        <a
          className={[
            'tbd-ad-link',
            creative.imageSrc ? 'tbd-ad-link--image' : '',
            creative.theme === 'kfs' ? 'tbd-ad-link--kfs' : '',
            creative.theme === 'rockpail' ? 'tbd-ad-link--rockpail' : '',
            creative.kind === 'sponsor' ? 'tbd-ad-link--sponsor' : '',
            creative.theme === 'tiger' ? 'tbd-ad-link--tiger' : '',
            creative.theme === 'inflight' ? 'tbd-ad-link--inflight' : ''
          ].filter(Boolean).join(' ')}
          href={creative.href}
          target="_blank"
          rel="noopener noreferrer"
          style={creative.imageSrc ? { '--tbd-ad-image-bg': `url("${creative.imageSrc}")` } : undefined}
        >
          {content}
        </a>
      ) : (
        <div className="tbd-ad-static">{content}</div>
      )}
      <div className="tbd-ad-dots" aria-hidden="true">
        {available.map((item, index) => (
          <span key={item.id || index} className={index === activeIndex ? 'is-active' : ''} />
        ))}
      </div>
    </aside>
  );
}

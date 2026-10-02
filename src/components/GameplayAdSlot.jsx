'use client';

import { useEffect, useMemo, useState } from 'react';

const IMAGE_AD_WIDTH = 360;
const IMAGE_AD_HEIGHT = 135;

const DEFAULT_CREATIVES = [
  {
    id: 'keep-fun-simple',
    theme: 'kfs',
    logoSrc: '/kfs-logo.png?v=20261002-1',
    logoAlt: 'KeepFunSimple',
    kicker: 'KEEP FUN SIMPLE',
    headline: 'GOOD GAMES. BETTER COMPANY.',
    body: 'TwoBall gear, RockPail and more good shit to play.',
    cta: 'KEEPFUNSIMPLE.COM',
    href: 'https://keepfunsimple.com'
  },
  {
    id: 'rockpail',
    kicker: 'A ROCKPAIL PRODUCTION',
    headline: 'KEEP FUN SIMPLE.',
    body: 'Less setup. More throwing.',
    cta: 'ROCKPAIL.COM',
    href: 'https://rockpail.com'
  },
  {
    id: 'tiger-plumbing',
    imageSrc: '/tiger-plumbing-app-banner.webp?v=20260924-1',
    imageAlt: 'Tiger Plumbing - A leak is a hazard. You don’t play through.',
    href: 'https://www.tigerplumbing.ca/'
  },
  {
    id: 'inflight-institute',
    imageSrc: '/inflight-institute-app-banner.webp',
    imageAlt: 'Inflight Institute - Your career could take off from here.',
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

  const content = creative.imageSrc ? (
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
          <span className="tbd-ad-kicker">{creative.kicker}</span>
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
            creative.theme === 'kfs' ? 'tbd-ad-link--kfs' : ''
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

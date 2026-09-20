'use client';

import { useEffect, useMemo, useState } from 'react';

const IMAGE_AD_WIDTH = 360;
const IMAGE_AD_HEIGHT = 135;

const DEFAULT_CREATIVES = [
  {
    id: 'swag',
    kicker: 'TWOBALL SWAG',
    headline: 'LOOK GOOD. MISS BETTER.',
    body: 'Official TwoBall gear is coming.',
    cta: 'COMING SOON',
    href: 'https://twoballdarts.com'
  },
  {
    id: 'rivalry',
    kicker: 'BRAGGING RIGHTS',
    headline: 'THIS SCORE WILL BE REMEMBERED.',
    body: 'Your friends certainly will.',
    cta: 'KEEP PLAYING',
    href: null
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
    imageSrc: '/tiger-plumbing-app-banner.webp',
    imageAlt: 'Tiger Plumbing - A leak is a hazard. You don’t play through.',
    href: 'https://www.tigerplumbing.ca/'
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
        <span className="tbd-ad-kicker">{creative.kicker}</span>
        <strong>{creative.headline}</strong>
        <span className="tbd-ad-body">{creative.body}</span>
      </div>
      <div className="tbd-ad-cta">{creative.cta}</div>
    </>
  );

  return (
    <aside className="tbd-gameplay-ad" aria-label="TwoBall promotion">
      <span className="tbd-ad-label">AD</span>
      {creative.href ? (
        <a
          className={creative.imageSrc ? 'tbd-ad-link tbd-ad-link--image' : 'tbd-ad-link'}
          href={creative.href}
          target="_blank"
          rel="noopener noreferrer"
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

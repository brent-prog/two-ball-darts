# TwoBall Gameplay Banner Ads

This is the locked production contract for all gameplay ads.

## Sponsor construction standard
- **Do not build sponsors as one flattened banner image.**
- Sponsor ads use the same fixed shell as KFS and RockPail.
- Desktop shell height: **96 px**.
- Mobile shell height (<=620 px): **84 px**.
- Logo, headline, supporting copy, phone/location, and CTA are live HTML/CSS elements.
- Only decorative or photographic scene imagery may crop responsively.
- Desktop and mobile preserve the same composition and information hierarchy. Breakpoints may scale type, spacing, and scene proportion only.
- Use the advertiser's exact supplied/official logo. Never generate, redraw, approximate, or invent it.
- Sponsored links open in a new tab with `noopener noreferrer`.
- Existing rotation timing remains unchanged unless explicitly requested.

## Pre-push checklist
1. Confirm the sponsor uses the responsive HTML/CSS construction standard.
2. Confirm advertiser branding/logo is authentic and supplied/official.
3. Confirm the same logo, headline, supporting copy, phone/location, and CTA remain visible on desktop and mobile.
4. Confirm only scene imagery changes crop between breakpoints.
5. Confirm text is readable at phone width.
6. Confirm click-through URL.
7. Replace/add only the intended creative; do not alter scorer behaviour.

## Creative preservation
- Preserve approved creative when fixing resolution, dimensions, logos, contact information, or another technical defect. Do not materially redesign an approved ad unless explicitly requested.

## Logo source of truth
- Use the exact advertiser-supplied or official logo asset. Never generate, redraw, approximate, or invent an advertiser logo.

## Fixed-slot rule
- The rotation must never resize when the creative changes.
- Standard TwoBall promos, Tiger, Inflight, and every future sponsored creative all use the exact same outer shell at a given breakpoint.
- Do not add per-ad height, min-height, max-height, aspect-ratio, or layout exceptions.

## Sponsor scene imagery
- Scene imagery is background/decorative only.
- It may use a wide source image and crop differently by breakpoint.
- Never bake logo, headline, phone/location, or CTA into the scene image as the only copy.
- Do not use blurred duplicate-image side fills.


## KeepFunSimple first-party creative
- The former "TwoBall Swag" card is now a KeepFunSimple store ad.
- Destination: **https://keepfunsimple.com**
- Use the exact approved KeepFunSimple PNG logo copied from `brent-prog/keepfunsimple/public/brand/kfs-logo.png`.
- Do not recreate or approximate the KFS logo.
- The KFS card still uses the same fixed gameplay-ad shell as every other creative.


## RockPail first-party creative
- Keep the approved copy unchanged unless explicitly requested.
- Use the exact RockPail logo asset copied from `brent-prog/rockpail_website/public/Yellow_logo.png`.
- Brand palette source of truth: yellow `#f4ea00`, purple `#23005f`, sand `#f6f4ea`.
- Do not recreate or approximate the RockPail logo.
- RockPail uses the same fixed gameplay-ad shell as every other creative.


## KFS visual treatment source of truth
- KeepFunSimple ad styling must use the live KFS site palette from `brent-prog/keepfunsimple/app/globals.css`: ink `#111111`, paper `#FAF8F2`, bone `#F3E9D7`, oxblood `#B23B2E`, mustard `#F2C230`, lake `#3F8CC9`, plum `#7B5BBF`, teal `#2FB4A8`.
- KFS ads should feel graphic, bright, playful and socially wearable - not corporate, beige, or generic lifestyle advertising.
- Preserve approved ad copy unless explicitly asked to change it.


## Locked responsive-sponsor rule
- Tiger, Inflight, and every future advertiser use structured responsive HTML/CSS, not a flattened banner.
- If a sponsor's desktop and mobile composition differ materially, the implementation is wrong.
- Preserve approved creative copy and advertiser branding when fixing responsive behaviour.

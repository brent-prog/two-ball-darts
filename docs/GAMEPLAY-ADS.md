# TwoBall Gameplay Banner Ads

This is the locked production contract for all sponsored image ads in the gameplay rotation.

## Asset specification
- Source dimensions: **1800 x 200 px**
- Aspect ratio: **8:3**
- Format: **WebP**
- RGB image
- Optimize for mobile display and small file size
- No contact information or other tiny footer copy. The entire banner is clickable, so the advertiser website is the destination for details.
- Keep essential logo, headline, and key message comfortably inside the crop-safe area.
- Use the advertiser's real supplied/official logo and branding. Never generate, redraw, approximate, or invent a company logo.

## App behaviour
- Image ads use the existing GameplayAdSlot rotation.
- **Every gameplay ad uses the same fixed shell.** There is no image-specific slot height.
- Desktop shell height: **96 px**.
- Mobile shell height (<=620 px): **84 px**.
- Sponsored images are purpose-built at 1800 x 200 and render with `object-fit: cover` inside the fixed shell. Keep all critical content inside the central safe zone so the small mobile crop only removes edge background.
- A dimmed full-bleed copy of the image fills any unused side area behind the contained creative.
- An image creative must never change the height of the gameplay card.
- Sponsored links open in a new tab with `noopener noreferrer`.
- Existing rotation timing remains unchanged unless explicitly requested.

## Pre-push checklist
1. Confirm final production asset is exactly 1800 x 200 and remains readable inside the fixed 96 px desktop / 84 px mobile shell.
2. Confirm WebP decodes successfully.
3. Confirm advertiser branding/logo is authentic.
4. Confirm text is readable at phone width.
5. Confirm no unnecessary contact/footer text.
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

## Sponsor creative safe zone
- Sponsor source canvas: **1800 x 200 px** (9:1).
- Keep logos, headlines, phone numbers, location text, and CTAs inside the central **80%** of the canvas.
- The outer 10% on each side is background-only crop allowance for narrower mobile layouts.
- Do not use blurred duplicate-image side fills in the app. The creative itself must supply its own edge background.

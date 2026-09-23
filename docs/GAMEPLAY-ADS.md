# TwoBall Gameplay Banner Ads

This is the locked production contract for all sponsored image ads in the gameplay rotation.

## Asset specification
- Source dimensions: **1080 x 405 px**
- Aspect ratio: **8:3**
- Format: **WebP**
- RGB image
- Optimize for mobile display and small file size
- No contact information or other tiny footer copy. The entire banner is clickable, so the advertiser website is the destination for details.
- Keep essential logo, headline, and key message comfortably inside the crop-safe area.
- Use the advertiser's real supplied/official logo and branding. Never generate, redraw, approximate, or invent a company logo.

## App behaviour
- Image ads use the existing GameplayAdSlot rotation.
- The app reserves an **8:3** slot for image creatives.
- Images fill that slot with `object-fit: cover`.
- Explicit intrinsic dimensions are **360 x 135**.
- An image creative must never change the height of the gameplay card.
- Sponsored links open in a new tab with `noopener noreferrer`.
- Existing rotation timing remains unchanged unless explicitly requested.

## Pre-push checklist
1. Confirm final production asset is exactly 1080 x 405 and the app displays it at 360 x 135.
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

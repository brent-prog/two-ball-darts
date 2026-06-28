# TWO BALL DARTS

**No gimmes. Just throw.**

A golf-inspired darts scoring web app for 18-hole, par-3, two-dart rounds.

## What it does

- Live golf-course paper-style scorecard
- Tap-to-score hole results for multiple players
- Running score relative to par and total strokes
- Deterministic official rule clarification assistant
- Supabase-backed historical score saving
- Brand guidelines and official rules docs

## Stack

- Next.js 14
- TypeScript
- Supabase
- Vercel

## Supabase

Project: `two-ball-darts`  
URL: `https://vgvjlykedwahxknkyhra.supabase.co`

The MVP uses a browser-generated owner key for casual score history. This is suitable for a pub-game MVP, not private competitive accounts. Add Supabase Auth before treating score history as private user data.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Brand

See [`docs/brand-guidelines.md`](docs/brand-guidelines.md).

## Official rules

See [`docs/official-rules.md`](docs/official-rules.md).

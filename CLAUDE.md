# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start Vite dev server on port 8080

# Build
npm run build        # Production build to dist/
npm run build:dev    # Development mode build
npm run preview      # Preview production build

# Code quality
npm run lint         # ESLint with TypeScript rules

# End-to-end tests (Playwright)
npx playwright test                        # Run all tests
npx playwright test tests/verification/   # Run specific test directory
npx playwright test --ui                   # Interactive test UI
```

## Architecture

**FOMO** is a Cyprus-focused event discovery and business promotion platform — a full-stack SPA with mobile support via Capacitor.

**Tech stack:** React 18 + TypeScript, Vite, Tailwind CSS, shadcn-ui (Radix UI), TanStack Query, React Router v6, Supabase (Postgres + Auth + Realtime), Capacitor (Android), Mapbox GL.

**Three user roles with distinct surfaces:**
- **Users** — discover events/businesses, RSVP, scan QR discount offers, messaging
- **Businesses** — create events, manage offers, view analytics, run "Boost" promotions
- **Admins** — manage users/businesses, verification workflows, database monitoring, platform settings

### Source layout

| Path | Purpose |
|------|---------|
| `src/pages/` | ~50 route-level components (one per page) |
| `src/components/` | ~290 reusable UI components, organized by feature |
| `src/hooks/` | ~70 custom hooks — all business logic lives here |
| `src/lib/` | Utility functions |
| `src/utils/` | Analytics, image/video processing, offline sync, PDF generation |
| `src/integrations/supabase/` | Supabase client + auto-generated types |
| `src/contexts/` | React Context providers (language/locale) |
| `src/translations/` | Greek/English i18n strings |
| `src/types/` | TypeScript type definitions |
| `supabase/` | Supabase project configuration and migrations |
| `tests/` | Playwright E2E tests |

### Data flow pattern

All server state goes through **TanStack Query** (`useQuery` / `useMutation`). Custom hooks in `src/hooks/` wrap Supabase queries and expose typed data — pages and components consume hooks, never Supabase directly.

### Path alias

`@/*` maps to `src/*` (configured in `tsconfig.json` and `vite.config.ts`).

### Key configuration

- Vite dev server: port **8080**, CORS headers enabled for FFmpeg WASM (`SharedArrayBuffer` support)
- Capacitor app ID: `cy.com.fomo`, output to `dist/`
- TypeScript: relaxed (`noImplicitAny: false`, no strict null checks, `skipLibCheck: true`)
- Supabase credentials: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY` (in `.env`)

### Notable features

- **Offline sync queue** in `src/utils/` — mutations queued when offline, replayed on reconnect
- **Boost attribution** — promotional visibility system with detailed metrics tracked per-business
- **QR offers** — businesses generate QR codes; users scan to redeem discounts
- **Student verification** — integration for student discount eligibility
- **Multi-language** — Greek/English via context + translation files; UI defaults to Greek for Cyprus market
- **Media generation** — FFmpeg WASM used for in-browser video story generation

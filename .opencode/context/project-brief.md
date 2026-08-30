# Cogni-Test — Project Brief

## Tech Stack & Key Dependencies
- **Language:** TypeScript 6.x (strict mode, ESM)
- **Framework:** SvelteKit 2.63 + Svelte 5.56 (runes-based reactivity)
- **Styling:** Tailwind CSS v4 (via `@tailwindcss/vite`)
- **UI Preprocessing:** mdsvex (`.svx` support) + `vitePreprocess`
- **Build Tool:** Vite 8.x
- **Database:** SQLite via Drizzle ORM 0.45 + drizzle-kit 0.31; libsql client for production
- **Authentication:** better-auth ~1.4
- **Charts:** Chart.js 4.5 + annotation plugin
- **ML/ONNX:** onnxruntime-node 1.26 (age prediction models via git submodule)
- **Push Notifications:** web-push 3.6 + Workbox 7.4 (PWA/service worker)
- **Testing:** Vitest 4.1 with dual projects:
  - Client: Playwright (Chromium headless) for `.svelte.{test,spec}.{js,ts}`
  - Server: Node environment for `src/**/*.{test,spec}.{js,ts}` (excluding `.svelte.` patterns)
- **Formatting/Linting:** Prettier 3.8 (tabs, single quotes, no trailing commas, print width 100) + ESLint 10 + typescript-eslint + eslint-plugin-svelte
- **Dev Extras:** cross-env, vite-plugin-mkcert (HTTPS local dev)

## Architecture Pattern
- **Monolithic full-stack web application** using SvelteKit’s file-based routing and server-side rendering (SSR).
- Each cognitive exercise is a self-contained module under `src/lib/exercises/` with its own types, game logic, results adapter, and Svelte components (About, Playground, Result, ResultsChart).
- Server layer (`src/lib/server/`) encapsulates database schema, controllers, models, push subscription service, and an age-prediction ONNX pipeline.
- A background notification worker runs inside `hooks.server.ts` (interval-based scheduler for web-push notifications).
- Build target selection at runtime: `BUILD=vercel|node|*auto*` switches SvelteKit adapter.

## Directory Structure
| Directory | Purpose |
|-----------|---------|
| `src/routes/` | SvelteKit pages (`+page.svelte`, `+page.server.ts`) |
| `src/lib/exercises/` | Cognitive exercise modules (attention, campimetry, emoji, flanker, letters, memory-match, nback-stream, not-lost, numbers, pictures, raven-matrices, road-trip, word-morphing) |
| `src/lib/components/` | Reusable UI components (NavBar, Modal, Spinner, ProgressBar, charts) |
| `src/lib/client/` | Client-side utilities and shared logic |
| `src/lib/server/` | Server-only code: DB schema, Drizzle controllers/models, web-push, age/ONNX |
| `src/lib/stores/` | Svelte stores (user, notifications) |
| `src/lib/utils/` | Shared utilities (common, db-utils, push) |
| `static/` | Static assets (images, favicons, manifest) |
| `src/service-worker.ts` | Custom service worker (Workbox-based caching) |
| `src/hooks.server.ts` | Server hooks + scheduled notification worker |
| `.opencode/context/` | Project context/documentation for agents |

## Entry Points & Data Flow
- **Dev start:** `npm run dev` → `cross-env DATABASE_URL=file:sqlite.db vite dev`
- **Production start:** `npm run start` → `drizzle-kit push --force && node index.js`
- **Entry file:** `index.js` (Node server for production)
- **SSR/CSR:** SvelteKit handles routing; server loads data in `+page.server.ts`, hydrated on client
- **DB access:** Drizzle ORM via `src/lib/server/db/index.ts`, schema in `schema.ts`, business logic in `controllers/`
- **Web push:** `src/lib/server/webpush.ts` configured with VAPID keys; subscriptions stored in SQLite; `hooks.server.ts` polls `scheduledPushNotifications` every 10s

## Testing & CI
- **Test runner:** Vitest with two projects (client browser via Playwright, server Node)
- **Browser tests:** `@vitest/browser-playwright` + `vitest-browser-svelte`
- **Assertions required:** `expect.requireAssertions` enabled globally
- **CI:** GitHub Actions configuration present in `.github/`
- **Pre-commit workflow:** `format → lint → check → test`

## Observed Patterns & Conventions
- Svelte 5 runes (`$state`, `$derived`, `$effect`) used across components
- `.svelte.ts` / `.svelte.js` for Svelte modules with runes
- Most exercise modules follow a consistent component structure (`About`, `Playground`, `Result`, `ResultsChart`, plus `types.ts` and `results-adapter.ts`), though a few (e.g., `campimetry`, `not-lost`, `road-trip`, `word-morphing`) deviate by having only subsets, `types` directories, or no `results-adapter.ts`.
- Server-side DB code organized as `schema.ts` → `models/` → `controllers/`
- Path aliases via SvelteKit (`$lib`, `$lib/server`, `$lib/client`)
- Environment-driven config: `DATABASE_URL`, `MODE`, `BUILD`, VAPID keys, `ADMIN_PASSWORD`
- Docker Compose with Traefik reverse proxy, Let’s Encrypt TLS, dev/prod profiles
- esbuild drops `console` and `debugger` in PROD builds
- Prettier uses tabs (width 4), single quotes, no trailing commas, print width 100

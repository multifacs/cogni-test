# AGENTS.md

## Monorepo Structure

- **Root** is an npm workspace with two apps: `apps/cogni-test`, `apps/cogni-rhythm`, plus a `traefik` config directory
- Run all package scripts from repo root using `-w` flag (e.g. `npm run dev -w ./apps/cogni-test`)
- Both apps are SvelteKit 5 + Svelte 5 + Tailwind CSS v4 + Drizzle ORM (SQLite)

## Key Commands

### cogni-test (main app)

| Action | Command |
|--------|---------|
| Dev server | `npm run dev -w ./apps/cogni-test` |
| Dev + LAN access | `npm run host -w ./apps/cogni-test` |
| Build | `npm run build -w ./apps/cogni-test` |
| Prod start | `npm run start -w ./apps/cogni-test` |
| Init DB (dev) | `npm run init-db-dev -w ./apps/cogni-test` |
| Init DB (prod) | `npm run init-db -w ./apps/cogni-test` |
| Lint | `npm run lint -w ./apps/cogni-test` |
| Typecheck | `npm run check -w ./apps/cogni-test` |
| Tests | `npm run test -w ./apps/cogni-test` |

### cogni-rhythm

No test runner configured. Has `lint`, `check`, `format`, and drizzle DB commands.

### Before committing

Run in order: `format -> lint -> check -> test`

## Testing

- Uses Vitest with two projects: **client** (browser/Playwright) and **server** (Node)
- Client tests match `src/**/*.svelte.{test,spec}.{js,ts}`, server tests match `src/**/*.{test,spec}.{js,ts}` (excluding `.svelte.` patterns)
- Playwright deps required: `npx playwright install --with-deps`
- Browser tests use `@vitest/browser-playwright` + `vitest-browser-svelte`
- All tests require assertions (`expect.requireAssertions` is enabled)

## Database

- SQLite via Drizzle ORM; schema at `src/lib/server/db/schema.ts` within each app
- Local dev uses `DATABASE_URL=file:sqlite.db` (set automatically by `cross-env` in npm scripts)
- Production uses libsql URLs from environment
- `drizzle-kit push --force` to sync schema (no migration files)

## Build Target Selection

cogni-test's adapter is selected via `BUILD` env var:
- `BUILD=vercel` → adapter-vercel
- `BUILD=node` (default) → adapter-node
- Otherwise → adapter-auto

## Svelte Config Notes

- cogni-test uses **mdsvex** (`.svx` files supported)
- cogni-rhythm does not use mdsvex
- Service workers are NOT auto-registered in either app (`register: false`)
- cogni-test drops `console` and `debugger` in PROD builds via esbuild

## Prettier / Style

- Tabs (width 4), single quotes, no trailing commas, print width 100
- Svelte files parsed as `.svelte`; uses `prettier-plugin-svelte` + `prettier-plugin-tailwindcss`

## Docker / Deploy

- Docker Compose profiles control which services run: `dev`, `prod`, `rhythm-dev`, `rhythm-prod`, `nginx`, `web-db`
- Example: `docker compose --profile dev up -d --build`
- Traefik (v3) acts as reverse proxy on the `cogni-network`; config at `traefik/traefik.yml` and `traefik/dynamic/`
- TLS certificates are configured via the file provider in `traefik/dynamic/tls.yml`; routed from `/root/cogni-test/certs/` on the host
- App services use Docker labels for Traefik routing rules; no custom Dockerfile needed for the reverse proxy
- Secrets loaded from env vars on host (VAPID keys, admin password)

## Existing Skill

A Svelte 5 code-writer skill exists at `.agents/skills/svelte-code-writer/SKILL.md`. It provides `npx @sveltejs/mcp` CLI for docs lookup and autofixer — use when editing `.svelte` or `.svelte.ts/.svelte.js` files.

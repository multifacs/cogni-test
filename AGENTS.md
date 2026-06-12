# AGENTS.md

## Project Structure

- SvelteKit 5 + Svelte 5 + Tailwind CSS v4 + Drizzle ORM (SQLite)

## Key Commands

| Action | Command |
|--------|---------|
| Dev server | `npm run dev` |
| Dev + LAN access | `npm run host` |
| Build | `npm run build` |
| Prod start | `npm run start` |
| Init DB (dev) | `npm run init-db-dev` |
| Init DB (prod) | `npm run init-db` |
| Lint | `npm run lint` |
| Typecheck | `npm run check` |
| Tests | `npm run test` |

### Before committing

Run in order: `format -> lint -> check -> test`

## Testing

- Uses Vitest with two projects: **client** (browser/Playwright) and **server** (Node)
- Client tests match `src/**/*.svelte.{test,spec}.{js,ts}`, server tests match `src/**/*.{test,spec}.{js,ts}` (excluding `.svelte.` patterns)
- Playwright deps required: `npx playwright install --with-deps`
- Browser tests use `@vitest/browser-playwright` + `vitest-browser-svelte`
- All tests require assertions (`expect.requireAssertions` is enabled)

## Database

- SQLite via Drizzle ORM; schema at `src/lib/server/db/schema.ts`
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
- Service workers are NOT auto-registered (`register: false`)
- cogni-test drops `console` and `debugger` in PROD builds via esbuild

## Prettier / Style

- Tabs (width 4), single quotes, no trailing commas, print width 100
- Svelte files parsed as `.svelte`; uses `prettier-plugin-svelte` + `prettier-plugin-tailwindcss`

## Docker / Deploy

- Docker Compose profiles control which services run: `dev`, `prod`, `web-db`
- Example: `docker compose --profile dev up -d --build`
- Traefik (v3) acts as reverse proxy on the `cogni-network` (managed in a separate repo)
- TLS certificates are provisioned on-demand via Let's Encrypt (ACME HTTP challenge); stored in `/root/cogni-test/acme/`
- App services use Docker labels for Traefik routing rules
- Secrets loaded from env vars on host (VAPID keys, admin password)

## Existing Skill

A Svelte 5 code-writer skill exists at `.agents/skills/svelte-code-writer/SKILL.md`. It provides `npx @sveltejs/mcp` CLI for docs lookup and autofixer — use when editing `.svelte` or `.svelte.ts/.svelte.js` files.

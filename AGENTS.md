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
| Tests | `npm run test` | (but tests are kinda useless right now)

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

## Existing Skills

- **Svelte 5 code-writer** at `.agents/skills/svelte-code-writer/SKILL.md` — provides `npx @sveltejs/mcp` CLI for docs lookup and autofixer. Use when editing `.svelte` or `.svelte.ts/.svelte.js` files.
- **Svelte core best practices** at `.agents/skills/svelte-core-bestpractices/SKILL.md` — best-practice guidance for writing Svelte 5 (runes, effects, props, snippets, styling, etc.). References live under `.agents/skills/svelte-core-bestpractices/references/`. Resolve relative paths from the workspace root.
- **Improve** at `.agents/skills/improve/SKILL.md` — codebase audit & planning skill (read-only, never edits source). References live under `.agents/skills/improve/references/` (`audit-playbook.md`, `closing-the-loop.md`, `plan-template.md`). When the skill says to read a reference file by relative path like `references/closing-the-loop.md`, resolve it as `.agents/skills/improve/references/closing-the-loop.md` from the workspace root.

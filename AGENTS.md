## Project Configuration

- **Language**: TypeScript
- **Package Manager**: npm
- **Add-ons**: prettier, eslint, vitest, playwright, tailwindcss, sveltekit-adapter, drizzle, better-auth, mdsvex, ai-tools

---

## Git Submodules

This repo uses a git submodule for ONNX age-prediction models at `src/lib/server/age/models/`. When cloning:

```bash
git clone --recurse-submodules https://github.com/your/sveltekit-repo.git
```

For an already-cloned repo:

```bash
git submodule update --init
```

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available Svelte MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

## Vitest 5 + SSR-экстернализация (находки, 2026-09)

### Суть проблемы

Vitest 5 в browser-режиме затирает `ssr.external`: хук `configEnvironment` заменяет `resolve.external` на node-builtin'ы и ставит `noExternal = true` для всех окружений, кроме `client`. CJS-зависимости инлайнятся в SSR module runner vite (путь `ssrLoadModule` в dev-middleware SvelteKit) без CJS-глобалов → `exports is not defined` в логах тестов. Тесты при этом НЕ падают — это шум, но он маскирует реальные ошибки.

### Как устроен фикс (vite.config.ts)

- `SSR_EXTERNAL_DEPS` — единый список внешних SSR-зависимостей: используется в `ssr.external` (build/dev) и восстанавливается плагином `vitestSsrExternalRestore` (test). Новые CJS runtime-зависимости добавлять ТОЛЬКО сюда.
- `vitestSsrExternalRestore` — test-gated плагин (`apply: 'serve'`): в `configureServer` дописывает список в `server.environments.ssr.config.resolve.external` ПОСЛЕ того, как vitest его затёр, но ДО построения ленивого isExternal-кэша vite (кэш строится при первом ssr-transform).
- Cookie — отдельный случай: test-gated `resolve.alias` `^cookie$` → `src/lib/tests/shims/cookie.mjs` (ESM-шим с fallback: root-копия → вложенная копия kit → громкий throw). Проблемы с cookie в тестах — смотреть туда, а не в `ssr.external`.

### Грабли (не повторять)

1. НЕ добавлять `cookie` в `dependencies` или `ssr.external`: kit требует 0.6.x (`parse`/`serialize`), корневой пакет по semver разрешится в 2.x (там API `parseCookie`) → `require('cookie')` в бандле даст TypeError на проде.
2. В vite записи `ssr.external` имеют приоритет над `noExternal: true`: они становятся runtime `require()` в adapter-node билде и обязаны быть реальными зависимостями из `dependencies` (Dockerfile делает `npm prune --omit=dev`).
3. `test.server.deps.external` в vitest НЕ влияет на путь `ssrLoadModule`/`SSRCompatModuleRunner` — это отдельный резолвер.
4. Источник шума в браузерных тестах: heartbeat `fetch('/api/ping')` в `(app)/+layout.svelte` → загрузка `api/ping/+server.ts` → CJS-цепочка (`short-uuid`). Любой тест, монтирующий layout, триггерит SSR-загрузку роутов.

### Известные открытые вопросы

- Campimetry-тесты падают с "Game did not finish within the click budget" — вероятно, `test.browser.locators.exact: true` по умолчанию в vitest 5. Не чинено. План: изолированный прогон spec-файла с полным логом + A/B с `locators: { exact: false }` в browser-блоке client-проекта.

### Быстрая верификация после изменений vite.config.ts

```bash
npx vitest run --project client    # ноль [vite](ssr) "exports is not defined"
npx vitest run --project server    # зелёный
npm run build                      # зелёный; grep -rn "require('cookie')" .svelte-kit/output/server/ → пусто
```

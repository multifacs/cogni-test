# Deep Improvement Plan: cogni-test

Generated: 2026-06-13

## Executive Summary

SvelteKit 5 cognitive testing PWA with 12+ games, push notifications, admin panel, and Docker deployment. The audit found **3 critical bugs**, **7 high-severity issues**, and numerous medium/low improvements across security, Svelte 5 migration, performance, test coverage, and code quality.

---

## Priority 1: Critical Bugs & Security (Do First)

### 1.1 Memory Leak: Chart.js instances never destroyed
**Severity:** CRITICAL | **Effort:** Small

All 5 `ResultsChart.svelte` files have `chart.destroy()` **commented out** in `onDestroy`:
- `src/lib/tests/math/ResultsChart.svelte:226-229`
- `src/lib/tests/memory/ResultsChart.svelte:200-203`
- `src/lib/tests/stroop/ResultsChart.svelte:230-233`
- `src/lib/tests/swallow/ResultsChart.svelte:205-208`
- `src/lib/tests/campimetry/ResultsChart.svelte:221-224`

**Fix:** Uncomment `chart.destroy()` in every file's `onDestroy` callback. These should also be migrated from `onMount`/`onDestroy` to `$effect` with cleanup return.

### 1.2 Missing `await` in `/api/users` endpoint
**Severity:** CRITICAL | **Effort:** Trivial

`src/routes/api/users/+server.ts:7` — `db.select().from(user).all()` returns a Promise but is never awaited. The response will always be an empty/unresolved Promise object serialized as `{}`.

```ts
// Bug:
const result = db.select().from(user).all();
// Fix:
const result = await db.select().from(user).all();
```

### 1.3 Hardcoded secret in docker-compose.yml
**Severity:** CRITICAL | **Effort:** Trivial

`docker-compose.yml:73` contains `MASTERPASS=2001nikita` in plaintext. This is pushed to the repository and visible to anyone with read access.

**Fix:** Move to an environment variable or Docker secret, replace the value with `${DRIZZLE_GATEWAY_PASSWORD}`, and set it on the host or in GitHub Secrets.

### 1.4 Unauthenticated `/api/users` endpoint exposes all user data
**Severity:** HIGH | **Effort:** Small

`GET /api/users` has zero authentication and returns every user's personal data (names, birthdays, sex). Combined with bug 1.2, it currently returns garbage — but once fixed, it becomes a data breach vector.

**Fix:** Add admin auth check (verify `logged_in_admin` cookie) or remove the endpoint entirely since `admin/db/+page.server.ts` already provides this via server load.

### 1.5 Admin auth weaknesses
**Severity:** HIGH | **Effort:** Medium

Multiple issues in admin authentication:

| Issue | File:Line |
|-------|----------|
| Plain-text password comparison | `(app)/admin/login/+page.server.ts:24` |
| Password echoed back in `fail()` response | `(app)/admin/login/+page.server.ts:25` — `{password, incorrect: true}` leaks the submitted password |
| No `httpOnly` flag on admin cookie | Cookie lacks both `httpOnly` and `sameSite` attributes |
| No expiration on admin cookie | Session persists forever until browser closes |

**Fix:**
- Remove `password` from the `fail()` response object
- Add `httpOnly: true`, `sameSite: 'strict'` to cookie options
- Consider adding a maxAge for the admin session
- The plaintext comparison is acceptable if ADMIN_PASSWORD is long/random enough (it comes from env), but the echoed password must be removed immediately

---

## Priority 2: Svelte 5 Migration Completeness

### 2.1 Replace `createEventDispatcher` with callback props
**Severity:** HIGH | **Effort:** Medium

10 exercise components still use the deprecated Svelte 4 `createEventDispatcher`:

| Component | Event |
|-----------|-------|
| `attention/AttentionGame.svelte` | `on:done` |
| `emoji/EmojiGame.svelte` | `on:done` |
| `flanker/FlankerGame.svelte` | `on:done` |
| `letters/LettersGame.svelte` | `on:done` |
| `numbers/NumbersGame.svelte` | `on:done` |
| `pictures/PicturesGame.svelte` | `on:done` |
| `memory-match/MemoryMatchGame.svelte` | `on:done` |
| `memory-match/StageBoard.svelte` | `on:click` |
| `nback-stream/NBackStreamGame.svelte` | `on:done` |
| `raven-matrices/RavenMatricesGame.svelte` | `on:done` |

And their parent Playground components use the corresponding `on:done` listener syntax.

**Pattern change:**
```svelte
<!-- Before -->
<script>
import { createEventDispatcher } from 'svelte';
const dispatch = createEventDispatcher();
dispatch('done', payload);
</script>

<!-- After -->
<script>
let { onDone } = $props();
onDone(payload);
</script>
```

Parent usage changes from `<Game on:done={handler} />` to `<Game onDone={handler} />`.

### 2.2 Replace `export let` with `$props()`
**Severity:** HIGH | **Effort:** Small-Medium

Files still using legacy props:

- `memory-match/MemoryMatchGame.svelte` — 5 props
- `memory-match/StageBoard.svelte` — ~15 props
- `nback-stream/StreamBoard.svelte` — 1 prop
- `raven-matrices/RavenCell.svelte` — 4 props
- `raven-matrices/RavenMatrixBoard.svelte` — 1 prop
- All exercise `ResultsChart.svelte` files — 1-2 props each

### 2.3 Replace `$:` reactive statements with `$derived` / `$effect`
**Severity:** MEDIUM | **Effort:** Small

6 files still use `$:` statements:
- `memory-match/ResultsChart.svelte` (chart config)
- `nback-stream/Playground.svelte` (phase derivation)
- `nback-stream/ResultsChart.svelte` (parsed results)
- `raven-matrices/RavenMatricesGame.svelte` (timer display)
- `raven-matrices/ResultsChart.svelte` (computed values)
- `memory-match/StageBoard.svelte` (grid computation)

### 2.4 Fix non-reactive state declarations
**Severity:** HIGH | **Effort:** Medium

Many game components declare mutable state with plain `let` instead of `$state()`, meaning UI updates won't trigger re-renders when these variables are reassigned from event handlers. Key examples:

- `NBackStreamGame.svelte`: `domain`, `nBack`, `phase`, `countdown`, `seq`, etc.
- `MemoryMatchGame.svelte`: `cardFlipped`, `matchedPairs`
- `RavenMatricesGame.svelte`: `timeLeft`, `results`
- `NotificationToggle.svelte`: `permission`, `enabled`
- Multiple Playground components

**Note:** Some may "work by accident" because of how Svelte's compiler detects top-level assignments. But they're fragile and should be made explicit with `$state()`.

---

## Priority 3: Performance & Architecture

### 3.1 N+1 query in `getResults()`
**Severity:** HIGH | **Effort:** Medium

`src/lib/server/db/controllers/result.ts:83-96` — For each session row, a separate query fetches attempts. If a user has 20 sessions, this generates 21 queries (1 sessions + 20 attempt queries).

**Fix:** Fetch all sessions first, collect IDs, then do a single batch query for all attempts using `inArray(sessionId, ids)`. Group results client-side by sessionId.

### 3.2 Global Chart.js mutation (`Chart.defaults.color`)
**Severity:** HIGH | **Effort:** Small

All 5 ResultsChart files mutate `Chart.defaults.color = 'white'` at module scope. This globally overrides text color for ALL Chart.js charts in the app, causing unexpected styling side-effects between different chart renderings.

**Fix:** Pass color configuration per-chart via `options.plugins.legend.labels.color` and similar per-instance settings.

### 3.3 Push notification schedule-for-all is O(n) sequential
**Severity:** MEDIUM | **Effort:** Medium

`api/push/schedule-for-all/+server.ts` iterates sequentially through all subscriptions inserting one DB row at a time. With many users this creates unacceptable latency.

**Fix:** Use a batch insert with `db.insert().values(arrayOfRows)` instead of looping individual inserts.

### 3.4 Background worker polling interval too aggressive
**Severity:** LOW | **Effort:** Trivial

The notification scheduler runs every **10 seconds** (`hooks.server.ts:199`). For scheduled notifications that are typically minutes/hours away, this is excessive.

**Fix:** Increase to 60 seconds, or make it configurable. Alternatively, compute the next-scheduled-for timestamp and set a targeted timeout.

### 3.5 Missing database indexes
**Severity:** MEDIUM | **Effort:** Small

Frequently queried columns lack indexes:
- `session.userId` — used in every getResults/getTestSessionCounts query
- `session.testType` — filtered + grouped in analytics
- `pushSubscriptions.endpoint` — looked up by endpoint in subscribe/send/unsubscribe
- `scheduledPushNotifications.scheduledFor` — range queried every 10 seconds by the worker
- `profileSurvey.userId` — joined on every page load in (app) layout

**Fix:** Add indexes on these columns using Drizzle's `index()` API.

---

## Priority 4: Code Quality & Type Safety

### 4.1 Remove debug `console.log` in `postResult()`
**Severity:** LOW | **Effort:** Trivial

`src/lib/server/db/controllers/result.ts:24` — `console.log(short, short.generate)` is clearly a leftover debug statement.

### 4.2 Replace `any` types with proper types
**Severity:** MEDIUM | **Effort:** Small

| Location | Current | Should Be |
|----------|---------|-----------|
| `controllers/result.ts:92` | `// @ts-ignore` | Proper typed map lookup |
| `NBackStreamGame.svelte:26` | `tickTimer: any` | `ReturnType<typeof setInterval>` |
| `swallow/Playground.svelte:18` | `timer: any` | `ReturnType<typeof setInterval>` |
| `munsterberg/Playground.svelte:21` | `timerInterval: any` | `ReturnType<typeof setInterval>` |
| `word-morphing/Result.svelte:13-14` | `any` | Specific result array type |

### 4.3 `$state(Object())` anti-pattern for DOM refs
**Severity:** MEDIUM | **Effort:** Trivial

All ResultsChart files and several Playground components initialize canvas/chart references as `$state(new Object())`. Since `bind:this` doesn't need reactivity, plain `let canvas: HTMLCanvasElement;` suffices.

Affected files: math/memory/stroop/swallow/campimetry ResultsChart + Playground components.

### 4.4 Dead/commented-out code cleanup
**Severity:** LOW | **Effort:** Trivial

- `vite.config.ts:7` — commented-out console.log
- `service-worker.ts:15-16` — commented-out localforage import + log
- `models/tests.ts:78-80` — commented-out `sportsFrequency` field check
- `models/survey.ts:78-80, 212-222` — commented-out sports frequency enum/check
- `models/survey.ts:3` — unused import comment `// import short from 'short-uuid'`

### 4.5 Test variable typos
**Severity:** LOW | **Effort:** Trivial

`word-morphing/components/Result.svelte.spec.ts:7,12` — `mockOrginalShape` → `mockOriginalShape`, `mockOrginalColor` → `mockOriginalColor`.

---

## Priority 5: Testing Infrastructure

### 5.1 Near-zero test coverage
**Severity:** CRITICAL (for reliability) | **Effort:** Large

Only **1 test file exists** in the entire project (`Result.svelte.spec.ts`, 53 lines). Zero server tests, zero E2E tests (Playwright config exists but no `.e2e.ts` files).

**Recommended minimum testing:**
1. **Server unit tests** for controllers (`user.ts`, `result.ts`, `survey.ts`, `test.ts`) — mock Drizzle, verify logic
2. **API endpoint tests** for push subscription CRUD and result posting
3. **Component tests** for core UI: Button, Modal, NavBar, Profile tabs
4. **Integration test** for the login flow (cookie set → redirect → authenticated access)

### 5.2 CI pipeline disabled
**Severity:** HIGH | **Effort:** Trivial

`.github/workflows/ci.yaml:3-6` — push/PR triggers are commented out. Only manual dispatch works, meaning no automated quality gate.

**Fix:** Uncomment the `push` and `pull_request` triggers, or at minimum add them for the `main` branch.

---

## Priority 6: Structural Improvements

### 6.1 Deduplicate campimetry logic
**Severity:** MEDIUM | **Effort:** Medium

Campimetry game logic appears duplicated between `src/lib/exercises/campimetry/` and `src/lib/tests/campimetry/`. Consider extracting shared logic into a common module.

### 6.2 Store vs. Runes inconsistency
**Severity:** LOW | **Effort:** Small

`UserBadge.svelte` uses `derived()` from `svelte/store` for what could be a simple `$derived()` rune. The project has already migrated most state management to runes — finish the job.

### 6.3 Inline encryption keys in scheduled notifications payload
**Severity:** MEDIUM | **Effort:** Medium

`scheduledPushNotifications.payload` stores push subscription encryption keys (`p256dh`, `auth`) as JSON in the payload column. This means keys are stored redundantly (also in `pushSubscriptions` table) and if either table is compromised, push impersonation is possible.

**Fix:** Don't store keys in the payload — look them up from `pushSubscriptions` at send time (the worker already does this at `hooks.server.ts:41-50`).

### 6.4 Verify dominantHand label/options mapping
**Severity:** LOW | **Effort:** Trivial

The route exploration flagged that the `dominantHand` field label/options may appear swapped (label asks about writing hand, but `left` maps to "Правая" and vice versa). Needs verification against actual UI code.

---

## Implementation Order Recommendation

| Phase | Items | Estimated Effort |
|-------|-------|------------------|
| **Phase 1** (Immediate) | 1.1–1.5 (Critical bugs + security) | ~2 hours |
| **Phase 2** (Sprint 1) | 2.1–2.4 (Svelte 5 migration completion) | ~8 hours |
| **Phase 3** (Sprint 2) | 3.1–3.5 (Performance), 4.1–4.5 (Code quality) | ~4 hours |
| **Phase 4** (Sprint 3) | 5.1–5.2 (Testing infra), 6.1–6.4 (Structural) | ~16+ hours |

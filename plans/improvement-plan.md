# Deep Improvement Plan: cogni-test

Generated: 2026-06-15 | Updated from: 2026-06-13 original
Base commit: `67367a9`

## Executive Summary

SvelteKit 5 cognitive testing PWA with 12+ games, push notifications, admin panel, and Docker deployment. The audit found **3 critical bugs**, **7 high-severity issues**, and numerous medium/low improvements across security, Svelte 5 migration, performance, test coverage, and code quality.

### Changes since last review (2026-06-13)

- Plans 010–013 executed: exercise result persistence for campimetry, memory-match, nback-stream, word-morphing
- ONNX age prediction feature added
- Memory-match partially converted to Svelte 5 (`MemoryMatchGame.svelte` → callback props, `Playground.svelte` rewritten) — but `StageBoard.svelte` still legacy
- **No Priority 1–4 findings have been fixed**

---

## Priority 1: Critical Bugs & Security (Do First)

### 1.1 Memory Leak: Chart.js instances never destroyed
**Severity:** CRITICAL | **Effort:** Small | **Status:** NOT FIXED

All 6 `ResultsChart.svelte` files that use Chart.js have `chart.destroy()` **commented out** in `onDestroy`:
- `src/lib/tests/math/ResultsChart.svelte:226-229`
- `src/lib/tests/memory/ResultsChart.svelte:200-203`
- `src/lib/tests/stroop/ResultsChart.svelte:230-233`
- `src/lib/tests/swallow/ResultsChart.svelte:205-208`
- `src/lib/tests/campimetry/ResultsChart.svelte:221-224`
- `src/lib/components/charts/ResultsChart.svelte:289-292`

**Fix:** Uncomment `chart.destroy()` in every file's `onDestroy` callback. These should also be migrated from `onMount`/`onDestroy` to `$effect` with cleanup return.

Note: Exercise ResultsCharts (`nback-stream`, `memory-match`, `raven-matrices`) use pure SVG/HTML — no leak.

### 1.2 Missing `await` in `/api/users` endpoint
**Severity:** CRITICAL | **Effort:** Trivial | **Status:** NOT FIXED

`src/routes/api/users/+server.ts:7` — `db.select().from(user).all()` returns a Promise but is never awaited. The response will always be an empty/unresolved Promise object serialized as `{}`.

```ts
// Bug:
const result = db.select().from(user).all();
// Fix:
const result = await db.select().from(user).all();
```

### 1.3 Hardcoded secret in docker-compose.yml
**Severity:** CRITICAL | **Effort:** Trivial | **Status:** NOT FIXED

`docker-compose.yml:73` contains `MASTERPASS=2001nikita` in plaintext. This is pushed to the repository and visible to anyone with read access.

**Fix:** Move to an environment variable or Docker secret, replace the value with `${DRIZZLE_GATEWAY_PASSWORD}`, and set it on the host or in GitHub Secrets.

### 1.4 Unauthenticated `/api/users` endpoint exposes all user data
**Severity:** HIGH | **Effort:** Small | **Status:** NOT FIXED

`GET /api/users` has zero authentication and returns every user's personal data (names, birthdays, sex). Combined with bug 1.2, it currently returns garbage — but once fixed, it becomes a data breach vector.

**Fix:** Add admin auth check (verify `logged_in_admin` cookie) or remove the endpoint entirely since `admin/db/+page.server.ts` already provides this via server load.

### 1.5 Admin auth weaknesses
**Severity:** HIGH | **Effort:** Medium | **Status:** NOT FIXED

Multiple issues in admin authentication:

| Issue | File:Line |
|-------|----------|
| Password echoed back in `fail()` response | `(app)/admin/login/+page.server.ts:25` — `{password, incorrect: true}` leaks the submitted password |
| No `httpOnly` flag on admin cookie | Cookie only sets `{ path: '/', secure: true }` |
| No `sameSite` on admin cookie | Defaults to browser Lax; should be `strict` |
| No expiration on admin cookie | Session persists forever until browser closes |

**Fix:**
- Remove `password` from the `fail()` response object immediately
- Add `httpOnly: true`, `sameSite: 'strict'` to cookie options
- Consider adding a maxAge for the admin session

---

## Priority 2: Svelte 5 Migration Completeness

### 2.1 Replace `createEventDispatcher` with callback props
**Severity:** MEDIUM-HIGH | **Effort:** Small-Medium | **Status:** PARTIALLY DONE (was HIGH, downgraded)

Since the last review, memory-match's `MemoryMatchGame.svelte` was migrated to callback props. Only **1 file** still uses the deprecated Svelte 4 `createEventDispatcher`:

| Component | Event |
|-----------|-------|
| `memory-match/StageBoard.svelte:2,22,163` | `finished` |

Parent usage of this component (`MemoryMatchGame.svelte`) has been updated; `StageBoard` is the last holdout.

**Pattern change:**
```svelte
<!-- Before -->
<script>
import { createEventDispatcher } from 'svelte';
const dispatch = createEventDispatcher<{ finished: StageResult }>();
dispatch('finished', res);
</script>

<!-- After -->
<script>
let { onFinished }: { onFinished: (res: StageResult) => void } = $props();
onFinished(res);
</script>
```

### 2.2 Replace `export let` with `$props()`
**Severity:** MEDIUM-HIGH | **Effort:** Small-Medium | **Status:** NOT FIXED

8 component files still use legacy prop syntax (~20 total occurrences):

| Component | Props Count |
|-----------|------------|
| `exercises/memory-match/StageBoard.svelte` | ~10 props |
| `exercises/nback-stream/StreamBoard.svelte` | 1 prop |
| `exercises/raven-matrices/RavenCell.svelte` | 4 props |
| `exercises/raven-matrices/RavenMatrixBoard.svelte` | 1 prop |
| `exercises/nback-stream/ResultsChart.svelte` | 1 prop |
| `exercises/memory-match/ResultsChart.svelte` | 1 prop |
| `exercises/raven-matrices/ResultsChart.svelte` | 1 prop |
| `(app)/profile/components/Autocomplete.svelte` | 1 prop |

Note: `export let data` in `+page.svelte` files is valid SvelteKit page syntax — not counted here.

### 2.3 Replace `$:` reactive statements with `$derived` / `$effect`
**Severity:** MEDIUM | **Effort:** Small | **Status:** NOT FIXED

17 occurrences across 5 files still use `$:` statements. All are pure derivations eligible for straightforward `$derived` conversion:

| Component | Count | Purpose |
|-----------|-------|---------|
| `exercises/memory-match/ResultsChart.svelte` | 8 | Sort/format stage rows, aggregations, SVG layout constants |
| `exercises/nback-stream/ResultsChart.svelte` | 5 | Click data derivation, SVG path computation |
| `exercises/raven-matrices/ResultsChart.svelte` | 2 | Result row + summary computation |
| `exercises/memory-match/StageBoard.svelte` | 1 | Board sync |
| `(app)/profile/components/Autocomplete.svelte` | 1 | City filter |

### 2.4 Fix non-reactive state declarations
**Severity:** HIGH | **Effort:** Medium | **Status:** PARTIALLY DONE

Most game components now correctly use `$state()`. However, several files still declare mutable state with plain `let`, meaning UI updates won't trigger re-renders when reassigned from event handlers:

**High impact (UI rendered from these):**

| Component | Variables | Impact |
|-----------|-----------|--------|
| `memory-match/StageBoard.svelte:25,29-33` | `board`, `flips`, `mistakes`, `turnCount`, `firstOpenId`, `lock` | **Critical** — core game state rendered in template |
| `NotificationToggle.svelte:5-6` | `permission`, `enabled` | **Critical** — button icon won't update |
| `(app)/profile/components/Autocomplete.svelte:4,6` | `value`, `isOpen` | **Critical** — dropdown visibility broken |

**Medium impact (game tracking, indirect rendering):**

| Component | Variables |
|-----------|-----------|
| `NBackStreamGame.svelte:29-34` | `seq`, `idx`, `clicks`, `lastClickTs`, `startAt`, `stimShownAt` |
| `tests/munsterberg/Playground.svelte:30-31` | `isDragging`, `isResetting` |
| `tests/swallow/Playground.svelte:19-20` | `phase`, `results` |
| `memory-match/MemoryMatchGame.svelte:55` | `stageStartTs` (internal timing) |
| `memory-match/MemoryMatchGame.svelte:76` | `lockBoard` (declared but never mutated — dead variable, remove) |

---

## Priority 3: Performance & Architecture

### 3.1 N+1 query in `getResults()`
**Severity:** HIGH | **Effort:** Medium | **Status:** NOT FIXED

`src/lib/server/db/controllers/result.ts:116-144` — For each session row, a separate query fetches attempts. If a user has 50 sessions, this generates 51 queries (1 sessions + 50 attempt queries).

`getLastResult()` at line 146 inherits the N+1 problem even though it only needs index `[0]`.

**Fix:** Fetch all sessions first, collect IDs, then do a single batch query for all attempts using `inArray(sessionId, ids)`. Group results client-side by sessionId. Optionally add a dedicated `getLastResult()` that limits to 1 session.

### 3.2 Global Chart.js mutation (`Chart.defaults.color`)
**Severity:** HIGH | **Effort:** Small | **Status:** NOT FIXED

All 6 Chart.js-based ResultsChart files mutate `Chart.defaults.color = 'white'` at module scope. This globally overrides text color for ALL Chart.js charts in the app, causing unexpected styling side-effects between different chart renderings.

| File | Line |
|------|------|
| `components/charts/ResultsChart.svelte` | 49 |
| `tests/swallow/ResultsChart.svelte` | 28 |
| `tests/math/ResultsChart.svelte` | 30 |
| `tests/stroop/ResultsChart.svelte` | 29 |
| `tests/memory/ResultsChart.svelte` | 28 |
| `tests/campimetry/ResultsChart.svelte` | 36 |

**Fix:** Pass color configuration per-chart via `options.plugins.legend.labels.color` and similar per-instance settings.

### 3.3 Push notification schedule-for-all is O(n) sequential
**Severity:** MEDIUM | **Effort:** Medium | **Status:** NOT FIXED

`api/push/schedule-for-all/+server.ts:19-39` iterates sequentially through all subscriptions inserting one DB row at a time. Also includes `console.log(result)` debug output at line 39.

**Fix:** Use a batch insert with `db.insert().values(arrayOfRows)` instead of looping individual inserts. Remove the console.log.

### 3.4 Background worker polling interval too aggressive
**Severity:** LOW | **Effort:** Trivial | **Status:** NOT FIXED

The notification scheduler runs every **10 seconds** (`hooks.server.ts:199`). Comment says "every 3 seconds" but code is `10000ms`. For scheduled notifications typically minutes/hours away, this is excessive.

**Fix:** Increase to 60 seconds. Update the comment to match reality.

### 3.5 Missing database indexes
**Severity:** MEDIUM | **Effort:** Small | **Status:** NOT FIXED

Zero non-primary-key indexes exist in the entire schema. Frequently queried columns lack indexes:

| Column | Table | Queried By |
|--------|-------|------------|
| `session.userId` | `session` | Every getResults/getTestSessionCounts call |
| `session.testType` | `session` | Filtered + grouped in analytics |
| `pushSubscriptions.endpoint` | `push_subscriptions` | Subscribe/send/unsubscribe lookups |
| `scheduledPushNotifications.scheduledFor` | `scheduled_push_notifications` | Range queried every 10s by worker |
| `profileSurvey.userId` | `profile_survey` | Joined on every page load |
| All `_attempt.sessionId` | 12+ attempt tables | N+1 join per session in getResults() |

**Fix:** Add indexes using Drizzle's third-argument table config callback:
```ts
sqliteTable('session', { /* cols */ }, (table) => [
    index('session_user_id_idx').on(table.userId),
    index('session_test_type_idx').on(table.testType),
]);
```

Then run `npm run init-db-dev` to apply schema changes.

---

## Priority 4: Code Quality & Type Safety

### 4.1 Remove debug `console.log` in `postResult()`
**Severity:** LOW | **Effort:** Trivial | **Status:** NOT FIXED

`src/lib/server/db/controllers/result.ts:90` — `console.log(short, short.generate)` is clearly a leftover debug statement.

Also: `api/push/schedule-for-all/+server.ts:39` has `console.log(result)` inside the loop.

### 4.2 Replace `any` types with proper types
**Severity:** MEDIUM | **Effort:** Small-Medium | **Status:** NOT FIXED

Expanded since last review — exercise Playground components also use `any`:

| Location | Current | Should Be |
|----------|---------|-----------|
| `controllers/result.ts:92+` | `// @ts-ignore` × multiple | Proper typed map lookups |
| `tests/swallow/Playground.svelte:18` | `timer: any` | `ReturnType<typeof setInterval>` |
| `tests/munsterberg/Playground.svelte:21` | `timerInterval: any = $state(null)` | `$state<ReturnType<typeof setInterval> \| null>(null)` |
| `exercises/nback-stream/NBackStreamGame.svelte:37` | `tickTimer: any` | `ReturnType<typeof setInterval> \| null` |
| `exercises/word-morphing/Playground.svelte:63,65` | `data: any`, `sendResults: (results: any[]) => void` | Proper types |
| `exercises/campimetry/Playground.svelte:14,16` | `data: any`, `sendResults: (results: any[]) => void` | Proper types |
| `exercises/{attention,emoji,flanker,letters,numbers,pictures,nback-stream,memory-match}/Playground.svelte` | `sendResults: (results: any[]) => void` | Specific result array type |
| `exercises/word-morphing/components/Result.svelte:13-14` | `recalledCombos: any`, `expectedCombos: any` | Specific types |
| `exercises/campimetry/Result.svelte:16,18` | `b: any` × 2 | Campimetry result type |
| `exercises/memory-match/Result.svelte:28,32,36` | `b_raw: any` × 3 | Already cast inline — use proper type directly |
| 6 test ResultsCharts | `@ts-ignore` × 11 | Per-chart typed configs |

### 4.3 `$state({})` for DOM refs
**Severity:** LOW | **Effort:** Trivial | **Status:** MOSTLY RESOLVED

Previously flagged as `$state(new Object())`. Current search shows:
- `exercises/+page.svelte:7` — `let exerciseSessionCounts = $state({})` — valid reactive state, not a DOM ref
- `tests/+page.svelte:11` — `let testSessionCounts = $state({})` — valid reactive state, not a DOM ref

Both are legitimate `$state({})` usage (not DOM ref anti-patterns). Downgrading from original finding.

### 4.4 Dead/commented-out code cleanup
**Severity:** LOW | **Effort:** Trivial | **Status:** PARTIALLY FIXED

| Location | Status |
|----------|--------|
| `vite.config.ts:34` | Still commented-out `// console.log(...)` |
| `models/survey.ts:78-80` | Still commented-out `sportsFrequency` field |
| `models/survey.ts:3` | Check if unused import comment remains |
| `service-worker.ts` | Needs re-check |
| Word-morphing debug | **FIXED** — commit `0db8e7d` removed debug logging |

### 4.5 Test variable typos
**Severity:** LOW | **Effort:** Trivial | **Status:** NOT FIXED

`word-morphing/components/Result.svelte.spec.ts:7,12` — `mockOrginalShape` → `mockOriginalShape`, `mockOrginalColor` → `mockOriginalColor`.

---

## Priority 5: Testing Infrastructure

### 5.1 Near-zero test coverage
**Severity:** CRITICAL (for reliability) | **Effort:** Large | **Status:** NOT FIXED

Only **1 test file exists** in the entire project (`Result.svelte.spec.ts`, ~53 lines). Zero server tests, zero E2E tests (Playwright config exists but no `.e2e.ts` files).

**Recommended minimum testing:**
1. **Server unit tests** for controllers (`user.ts`, `result.ts`, `survey.ts`, `test.ts`) — mock Drizzle, verify logic
2. **API endpoint tests** for push subscription CRUD and result posting
3. **Component tests** for core UI: Button, Modal, NavBar, Profile tabs
4. **Integration test** for the login flow (cookie set → redirect → authenticated access)

### 5.2 CI pipeline disabled
**Severity:** HIGH | **Effort:** Trivial | **Status:** NOT FIXED

`.github/workflows/ci.yaml:3-6` — push/PR triggers are commented out. Only manual dispatch works, meaning no automated quality gate.

**Fix:** Uncomment the `push` and `pull_request` triggers, or at minimum add them for the `main` branch.

---

## Priority 6: Structural Improvements

### 6.1 Deduplicate campimetry logic
**Severity:** MEDIUM | **Effort:** Medium | **Status:** NOT FIXED

Campimetry game logic appears duplicated between `src/lib/exercises/campimetry/` and `src/lib/tests/campimetry/`. Consider extracting shared logic into a common module.

### 6.2 Store vs. Runes inconsistency
**Severity:** LOW | **Effort:** Small | **Status:** NOT FIXED

`UserBadge.svelte:3` imports `derived()` from `svelte/store` for what could be a simple `$derived()` rune. The project has already migrated most state management to runes — finish the job.

### 6.3 Inline encryption keys in scheduled notifications payload
**Severity:** MEDIUM | **Effort:** Medium | **Status:** NOT FIXED

`scheduledPushNotifications.payload` stores push subscription encryption keys (`p256dh`, `auth`) as JSON in the payload column (see `schedule-for-all/+server.ts:22-26`). Keys are stored redundantly (also in `pushSubscriptions` table). If either table is compromised, push impersonation is possible.

**Fix:** Don't store keys in the payload — look them up from `pushSubscriptions` at send time (the worker already does this at `hooks.server.ts:41-50`).

### 6.4 Verify dominantHand label/options mapping — CONFIRMED SWAPPED
**Severity:** MEDIUM | **Effort:** Trivial | **Status:** NOT FIXED — BUG CONFIRMED

`(app)/profile/+page.svelte:526-527`:
```svelte
{ label: 'Правая', value: 'left' },
{ label: 'Левая', value: 'right' }
```

In Russian, "Правая" means "Right hand" and "Левая" means "Left hand". But `value: 'left'` is paired with "Правая" (Right), and `value: 'right'` is paired with "Левая" (Left). The values are swapped relative to their labels.

**Impact:** Users selecting "Right hand" have `"left"` saved to the database, and vice versa. All existing dominantHand data in the database is inverted.

**Fix:** Swap the values: `{ label: 'Правая', value: 'right' }`, `{ label: 'Левая', value: 'left' }`.
Consider whether existing DB records need correction.

---

## New Findings Since Last Review

### 7.1 `lockBoard` declared but never used
**Severity:** LOW | **Effort:** Trivial | **Status:** NEW

`memory-match/MemoryMatchGame.svelte:76` — `let lockBoard = false;` is declared but never mutated or read. Dead variable — remove it.

---

## Implementation Order Recommendation

| Phase | Items | Estimated Effort | Depends On |
|-------|-------|------------------|------------|
| **Phase 1** (Immediate) | 1.1–1.5 (Critical bugs + security) | ~2 hours | — |
| **Phase 2** (Quick wins) | 4.1, 4.5, 6.4, 7.1, 3.4 | ~30 min | — |
| **Phase 3** (Sprint 1) | 2.1–2.4 (Svelte 5 migration completion) | ~6 hours | — |
| **Phase 4** (Sprint 2) | 3.1–3.5 (Performance), 4.2, 4.4 (Code quality) | ~4 hours | — |
| **Phase 5** (Sprint 3) | 5.1–5.2 (Testing infra), 6.1–6.3 (Structural) | ~16+ hours | — |

### Dependency ordering within phases

- **1.2 before 1.4**: Fix the `await` bug first, then decide on auth — otherwise you're securing broken code.
- **2.1 before 2.2 for StageBoard**: `createEventDispatcher` removal forces `$props()` migration anyway — do them together.
- **3.5 (indexes)** should land before or alongside **3.1 (N+1 fix)** — indexes make the N+1 less painful but don't eliminate it.
- **5.2 (CI)** should be enabled before writing substantial tests (finding 5.1) so they actually run automatically.
- **6.4 (dominantHand)**: Data migration needed if records exist. Check production DB before fixing.

### Not audited / limitations

- ONNX age prediction model pipeline (new, complex — deserves its own focused audit)
- Service worker push notification end-to-end flow
- Docker/Traefik deployment configuration beyond the hardcoded secret
- Client-side localforage caching logic in word-morphing

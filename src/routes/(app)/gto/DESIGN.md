# GTO User UI — Design Decisions

## Overview

The user-facing GTO section shows active sessions, guides users through sequential tests, and collects word sequences. It mirrors the admin section's design language but is simpler and more focused.

| Page | Route | Purpose |
|------|-------|---------|
| Session list | `/gto` | Browse active sessions, resume tests, submit words |
| Test play | `/gto/session/[id]/play` | Step through 7 cognitive tests in order |
| Words | `/gto/session/[id]/words` | Submit word sequence after completing tests |

## Layout

### Card-based session list

Sessions are displayed as bordered cards (`rounded-xl border border-gray-700 bg-gray-800/50`) — matching the admin session list aesthetic. Each card contains:

- **Header row**: session name + status pill
- **Progress section**: bar + test breakdown (active) or info banner (paused/completed)
- **Action button**: context-dependent, full-width

### Three-section page structure

Every page follows the app layout from `+layout.svelte`:

```
<section class="banner">   → Title + progress indicator
<main class="main">        → Scrollable content
<section class="low-content"> → Navigation / exit links
```

### Responsive grid

Session cards use `grid-cols-1 xl:grid-cols-2` — single column on most screens, two columns on wide displays.

## Progress Indicators

### Session list page

When tests are in progress (`currentTestIndex > 0`), each session card shows:

1. **Text counter**: "Пройдено тестов: **3 из 7**" + percentage
2. **Progress bar**: blue `h-2` bar with `transition-all duration-500` for smooth animation
3. **Test breakdown**: each of the 7 tests listed with visual status:
   - ✅ Green checkmark — completed
   - ▶ Blue highlight with `ring-1 ring-blue-500/40` — current test
   - Dimmed `opacity-30` — upcoming

Before any tests are started, a simple message is shown instead of the breakdown.

### Play page (banner)

The banner shows a mini progress bar + fraction:

```
Тест 3/7: Тест Мюнстерберга
[████████░░░░░░░░░░░] 3/7
```

This gives constant visual feedback during the test flow without taking up content space.

## Status System

### Status pills

Same component style as admin:

| Status | Background | Dot color | Label |
|--------|-----------|-----------|-------|
| Active | `bg-green-800/60` | `bg-green-400` | Активна |
| Paused | `bg-yellow-800/60` | `bg-yellow-400` | На паузе |

No "completed" pill — completed sessions are filtered out by the server query.

### Info banners

Contextual colored banners replace plain text for state descriptions:

| State | Style | Content |
|-------|-------|---------|
| Paused | `border-yellow-800/40 bg-yellow-900/20 text-yellow-300` | ⏸ Сессия приостановлена |
| All tests done | `border-green-800/40 bg-green-900/20 text-green-300` | ✓ Все тесты пройдены |
| Fully done | `border-gray-700 bg-gray-900/30 text-gray-400` | Ожидайте результатов |

## Disclaimer Modal

Before starting/resuming tests or submitting words, a confirmation modal is shown. The modal content is **centered** (`items-center text-center`).

Key behaviors:
- **Resume**: shows progress count + next test name ("Следующий тест: **3. Тест Мюнстерберга**")
- **Start**: warns about time commitment and test count
- **Words**: warns about one-time submission, no retries

## Action Buttons

Buttons adapt to session state:

| Session state | Button | Color |
|--------------|--------|-------|
| Active, no tests started | Начать тестирование | Blue |
| Active, tests in progress | Продолжить тестирование | Blue |
| Paused + tests done + no words | Заполнить последовательность слов | Yellow |
| Active + tests done + no words | Заполнить последовательность слов | Yellow |

Buttons are full-width (`flex-1`) within the card's action row.

## Empty State

When there are no active sessions:

- Muted document SVG icon (`h-14 w-14 opacity-30`)
- Primary message: "У вас нет активных сессий ГТО-М"
- Secondary hint: "Когда вам назначат сессию, она появится здесь"

## Icons

All inline SVGs, no emoji. Same icon set as admin:

| Icon | Used for |
|------|----------|
| Checkmark | Completed tests in breakdown |
| Document | Empty session list |
| Play triangle (▶) | Current test indicator |

## Data Flow

- `getActiveGtoSessionsForUser()` returns only `active`/`paused` sessions for the logged-in user
- `TEST_ORDER` (7 items) and `testRegistry` from `$lib/tests` provide test metadata (titles, icons)
- Progress is computed client-side from `currentTestIndex` — no extra server queries needed
- `invalidateAll()` on mount keeps the session list fresh

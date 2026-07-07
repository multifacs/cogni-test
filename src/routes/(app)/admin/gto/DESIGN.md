# GTO Admin UI — Design Decisions

## Overview

The GTO admin section has three pages, each following the same design language:

| Page | Route | Purpose |
|------|-------|---------|
| Session list | `/admin/gto` | Browse sessions, create new ones, select participants |
| Session detail | `/admin/gto/[id]` | View/manage a session's participants and metrics |
| Word sets | `/admin/gto/word-sets` | Create, edit, generate, and delete word sets |

## Architecture

### Pages are split by entity, not by action

Word sets were originally embedded as a collapsible section inside the session list page. They were moved to their own route because:

- Word sets are a **standalone entity** reused across sessions — they outlive any single session
- The list page was doing too much (browse sessions + manage word sets + create session + select participants)
- A dedicated page gives room for full CRUD (create, edit, delete) without cluttering the session page
- The session list page now links to word sets via a navigation card (instead of an inline section)

### `invalidateAll()` over `location.reload()`

All mutations (pause/resume/complete session, save metrics, assign word sets, create/edit/delete word sets) use SvelteKit's `invalidateAll()` instead of `location.reload()`. This:

- Preserves client-side state (scroll position, form inputs, expanded cards)
- Avoids a full round-trip and flash
- Is the idiomatic SvelteKit pattern

### Form data over DOM scanning

The original detail page scanned `<tr>` rows with `querySelectorAll` to gather input values, with a `name !== 'wordSetNumber'` exclusion hack. The rewrite:

- Uses `<form>` with named inputs and `FormData` for metric saving
- Uses server actions with explicit `FormData` fields for word set CRUD
- Word set assignment is handled separately with its own submit handler

## Layout

### Card-based, not table-based

The original pages used a single `<table>` with 30+ columns crammed together at `text-xs`. This was a horizontal-scroll nightmare on any screen under ~1400px. The rewrite uses:

- **Session list**: responsive card grid (`grid-cols-1 md:2 xl:3`), each card is a clickable `<a>` linking to the detail page
- **Session detail**: expandable participant cards, with metrics grouped into sub-cards by test type
- **Word sets**: responsive card grid, each card shows words as styled badges

### Three-section page structure

Every page follows the app layout conventions from `+layout.svelte`:

```
<section class="banner">   → Title bar
<main class="main">        → Scrollable content
<section class="low-content"> → Navigation links
```

### Grouped metrics (detail page)

Test results are displayed in a grid of sub-cards with color-coded headers:

| Test | Color |
|------|-------|
| Stroop | Blue |
| Math | Emerald |
| Münsterberg | Amber |
| Campimetry | Rose |
| Memory | Cyan |
| Swallow | Teal |

Editable metrics (balance test, maze, button test, logic, word set) live in their own distinct bordered section, visually separated from read-only metrics.

## Visual Patterns

### Status badges

Session status uses a pill with a dot indicator + text label:

| Status | Background | Dot color | Label |
|--------|-----------|-----------|-------|
| Active | `bg-green-800/60` | `bg-green-400` | Активна |
| Paused | `bg-yellow-800/60` | `bg-yellow-400` | На паузе |
| Completed | `bg-gray-600/60` | `bg-gray-400` | Завершена |

### Accuracy color coding (detail page)

| Range | Color | Tailwind |
|-------|-------|----------|
| ≥ 80% | Green | `text-green-400` |
| 50–79% | Yellow | `text-yellow-400` |
| < 50% | Red | `text-red-400` |

### Word badges

Words are displayed as individual badges with a position number:

```html
<span class="rounded-md bg-gray-700 px-2.5 py-1 text-sm">
  <span class="mr-1 text-xs text-gray-500">1.</span>слово
</span>
```

### Participant selection (session list page)

Users are shown as selectable cards with:

- A custom checkbox (border + checkmark SVG, not a native checkbox)
- Selected cards get `ring-1 ring-indigo-500/50` highlight
- Missing survey fields shown as a red badge with count + tooltip
- Complete profiles get a green ✓ badge

### User search/filter

The participant list supports:

- **Text search** — filters by name, ID, sex, missing field count, GTO ID
- **Recent filter** — checkbox to show only users active in the last 7 days

## Icons

All icons are inline SVGs — no emoji. Key icons:

| Icon | Used for |
|------|----------|
| Pencil (`M13.586 3.586...`) | Edit actions |
| Trash (`M9 2a1 1 0 00-.894...`) | Delete actions |
| Checkmark (`M16.707 5.293...`) | Selected state |
| Chevron right (`M7.293 14.707...`) | Expandable sections, navigation |
| Search (`M8 4a4 4 0 100 8...`) | Search inputs |
| Document (`M19.5 14.25v-2.625...`) | Empty states |

## Empty States

Every list has an empty state with:

- A muted SVG icon (40×40, `opacity-40`)
- A short descriptive message
- Centered layout

## Error Handling

Errors are shown as red alert boxes:

```html
<p class="rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-300">{error}</p>
```

Placed contextually — near the action that caused them (create form, edit form, top of list, etc.).

## Loading States

All mutation buttons show loading text:

- "Сохранение..." / "Создание..." / "Генерация..." / "Удаление..."
- Buttons are `disabled` while loading
- Delete buttons are `disabled` while another delete is in progress

## Controller Functions

Word set CRUD in `src/lib/server/db/controllers/gto.ts`:

| Function | Purpose |
|----------|---------|
| `getWordSets()` | List all word sets ordered by creation date |
| `generateWordSets(count, allWords)` | Create N random sets from a word pool |
| `createWordSet(words)` | Create a single set with exactly 5 words, auto-numbered |
| `updateWordSet(id, words)` | Update the 5 words of an existing set |
| `deleteWordSet(id)` | Delete a set (fails if assigned to participants) |
| `assignWordSet(participantId, wordSetId)` | Assign a set to a participant |

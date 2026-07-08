# GTO Module — Structure & Data Flow

## What is GTO?

GTO-М (ГТО-М) is a cognitive assessment module. An admin creates **sessions**, adds **participants** (authorized users), and each participant goes through a sequence of cognitive tests. After completing tests, participants are assigned a **word set** and tested on word recall. Results are scored and stored per-participant.

## Folder Structure

```
src/routes/(app)/admin/gto/
├── +page.server.ts          # Load: users + sessions. Action: create session
├── +page.svelte             # Session list, session creation form, participant picker
├── DESIGN.md                 # UI design decisions
├── STRUCTURE.md              # This file
├── [id]/
│   ├── +page.server.ts      # Load: session detail + metrics + word sets + survey gtoId map
│   ├── +page.svelte         # Session detail: status controls, participant cards, metrics, word set assignment
│   └── +server.ts           # PATCH endpoint: rename, complete, pause, resume, assignWordSet, updateMetrics
└── word-sets/
    ├── +page.server.ts      # Load: word sets. Actions: create, generate, update, delete
    └── +page.svelte         # Word set management: create/edit/delete/generate

src/routes/(app)/gto/                    # User-facing
├── +page.server.ts                      # Load: active sessions for current user
├── +page.svelte                         # Active sessions list
└── session/[id]/
    ├── play/
    │   ├── +page.server.ts              # Load: session + participant + current test
    │   ├── +page.svelte                 # Test execution UI
    │   └── +server.ts                   # POST: submit test result
    └── words/
        ├── +page.server.ts              # Load: word count for assigned word set (requires wordSetId)
        ├── +page.svelte                 # Word recall input UI
        └── +server.ts                   # POST: submit word answers, auto-score against word set

src/lib/server/db/
├── models/gto.ts                        # Drizzle table definitions
└── controllers/gto.ts                  # All GTO business logic (queries + mutations)
```

## Database Schema

Four tables, all in SQLite via Drizzle ORM:

### `gto_session`
| Column     | Type   | Notes                              |
|------------|--------|------------------------------------|
| id         | text   | PK, short-uuid                     |
| name       | text   | Display name                       |
| type       | text   | `'cognitive-age'` (only value)     |
| status     | text   | `'active'` / `'paused'` / `'completed'` |
| created_at | text   | `CURRENT_TIMESTAMP`                |

### `gto_session_participant`
| Column                | Type    | Notes                                       |
|-----------------------|---------|---------------------------------------------|
| id                    | text    | PK, short-uuid                              |
| gto_session_id        | text    | FK → gto_session.id                         |
| user_id               | text    | FK → user.id                                |
| has_completed_tests   | boolean | Default `false`                             |
| has_submitted_words   | boolean | Default `false`                             |
| current_test_index    | integer | Default `0`                                 |
| word_score            | integer | Nullable, 0–5 (check constraint)            |
| word_set_id           | text    | FK → gto_word_set.id, nullable              |
| created_at            | text    | `CURRENT_TIMESTAMP`                         |

Unique on `(gto_session_id, user_id)` — a user can only be in a session once.

### `gto_editable_metric`
| Column              | Type    | Notes                                    |
|---------------------|---------|------------------------------------------|
| id                  | text    | PK, short-uuid                           |
| participant_id      | text    | FK → gto_session_participant.id, unique   |
| balance_test        | text    | Enum: `'0-15'`/`'15-30'`/`'30-45'`/`'45-60'`/`'60+'` |
| maze_q1             | integer | 0–1                                      |
| maze_q2             | integer | 0–1                                      |
| maze_q3             | integer | 0–1                                      |
| maze_vr_number      | integer |                                          |
| maze_vr_file_name   | text    |                                          |
| button_test_number  | integer | 0–20                                     |
| button_test_file_name| text   |                                          |
| logic               | integer | 0–1                                      |
| word_set_number     | integer |                                          |

One row per participant (unique on `participant_id`).

### `gto_word_set`
| Column      | Type    | Notes                  |
|-------------|---------|------------------------|
| id          | text    | PK, short-uuid         |
| set_number  | integer | Auto-incrementing      |
| word1–word5 | text    | Exactly 5 words        |
| created_at  | text    | `CURRENT_TIMESTAMP`    |

## Data Flow

### 1. Admin creates a session
- **Route**: `POST /admin/gto` (form action `?/create`)
- **Controller**: `createGtoSession(name, type, participantIds)`
- **DB writes**:
  - `INSERT` into `gto_session` (status = `'active'`)
  - `INSERT` into `gto_session_participant` for each user (one row per participant)

### 2. Admin assigns word sets to participants
- **Route**: `PATCH /admin/gto/[id]` (action = `assignWordSet`)
- **Controller**: `assignWordSet(participantId, wordSetId)`
- **DB writes**: `UPDATE gto_session_participant SET word_set_id = ? WHERE id = ?`

### 3. User takes cognitive tests
- **Route**: `GET /gto/session/[id]/play` → `POST /gto/session/[id]/play`
- User walks through test sequence (Stroop, Math, Münsterberg, Campimetry, Memory, Swallow)
- Each test POSTs its result to the play `+server.ts`
- After all tests complete: `UPDATE gto_session_participant SET has_completed_tests = true`

### 4. User recalls words
- **Route**: `GET /gto/session/[id]/words` → `POST /gto/session/[id]/words`
- **Prerequisite**: `participant.wordSetId` must be set (admin must have assigned a word set)
- User sees `wordCount` blank inputs, fills them in, submits
- Server compares submitted words against the assigned `gto_word_set` rows (normalized: lowercase, ё→е)
- **Controller**: `submitWordScore(sessionId, userId, score)`
- **DB writes**: `UPDATE gto_session_participant SET word_score = ?, has_submitted_words = true`

### 5. Admin edits metrics
- **Route**: `PATCH /admin/gto/[id]` (action = `updateMetrics`)
- **Controller**: `updateEditableMetrics(participantId, metrics)`
- **DB writes**: `UPDATE gto_editable_metric SET ... WHERE participant_id = ?`
- Upsert logic: creates the row if it doesn't exist

### 6. Admin manages session lifecycle
- `PATCH /admin/gto/[id]` with action = `complete`/`pause`/`resume`
- **DB writes**: `UPDATE gto_session SET status = ?`

## Controller API Reference

All functions live in `src/lib/server/db/controllers/gto.ts`.

### Session CRUD
| Function | Writes to | Notes |
|----------|-----------|-------|
| `createGtoSession(name, type, participantIds)` | `gto_session` + `gto_session_participant` | Creates session + participant rows in a transaction |
| `getGtoSessions()` | — | Lists all sessions with participant count |
| `getGtoSessionById(id)` | — | Full session detail with participants |
| `updateGtoSessionName(id, name)` | `gto_session` | |
| `completeGtoSession(id)` | `gto_session` | Status → `'completed'` |
| `pauseGtoSession(id)` | `gto_session` | Status → `'paused'` |
| `resumeGtoSession(id)` | `gto_session` | Status → `'active'` |

### Participant operations
| Function | Writes to | Notes |
|----------|-----------|-------|
| `markParticipantTestsCompleted(sessionId, userId)` | `gto_session_participant` | Sets `has_completed_tests = true` |
| `submitWordScore(sessionId, userId, score)` | `gto_session_participant` | Sets `word_score` + `has_submitted_words = true` |
| `assignWordSet(participantId, wordSetId)` | `gto_session_participant` | Sets `word_set_id` |
| `getActiveGtoSessionsForUser(userId)` | — | Returns sessions where user is a participant |
| `getGtoSessionMetrics(sessionId)` | — | Joins test tables + editable metrics per participant |

### Word set CRUD
| Function | Writes to | Notes |
|----------|-----------|-------|
| `getWordSets()` | — | Lists all word sets |
| `createWordSet(words)` | `gto_word_set` | 5 words, auto-increments `set_number` |
| `updateWordSet(id, words)` | `gto_word_set` | Updates the 5 word columns |
| `deleteWordSet(id)` | `gto_word_set` | Fails if any participant references it |
| `generateWordSets(count, allWords)` | `gto_word_set` | Creates `count` random sets from the word pool |
| `getWordSetWords(wordSetId)` | — | Returns `[word1, word2, word3, word4, word5]` |

### Editable metrics
| Function | Writes to | Notes |
|----------|-----------|-------|
| `updateEditableMetrics(participantId, metrics)` | `gto_editable_metric` | Upsert (insert if no row exists) |

## Key Relationships

```
gto_session 1──N gto_session_participant 1──1 gto_editable_metric
                        │
                        └──N──→ gto_word_set (via word_set_id FK)
```

- A **session** has many **participants**
- A **participant** belongs to one **session** and optionally one **word set**
- A **word set** can be shared across many participants (many-to-one)
- **Editable metrics** are a 1:1 extension of a participant row (separate table for admin-editable fields)

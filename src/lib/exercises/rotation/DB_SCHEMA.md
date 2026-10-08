# Mental Rotation — DB Schema

## Design

Rotation uses a single `rotation_attempt` table where **each row = one answered task**.
All rows from one game session share the same `session_id` FK pointing to the `session` table.

Summary metrics (accuracy, total/avg time, timeouts, per-difficulty breakdown) are
**derived at read time** by aggregating all `rotation_attempt` rows with the same
`session_id` — they are not stored as separate columns. This matches the one-attempt-table
pattern used by every other exercise.

## Table: `rotation_attempt`

| Column             | SQLite type | Drizzle type                       | Description                                        |
| ------------------ | ----------- | ---------------------------------- | -------------------------------------------------- |
| `id`               | TEXT (PK)   | `text`                             | Short-UUID primary key                             |
| `task_index`       | INTEGER     | `integer`                          | Task number within the session (1..9)              |
| `difficulty_level` | INTEGER     | `integer`                          | 1 / 2 / 3                                          |
| `grid_size`        | INTEGER     | `integer`                          | Voxel grid size: 3 / 4 / 6 (matches difficulty)    |
| `selected_index`   | INTEGER     | `integer` (nullable)               | Which option the user picked (null = timeout)      |
| `correct_index`    | INTEGER     | `integer`                          | Index of the correct option                        |
| `is_correct`       | INTEGER     | `integer({ mode: 'boolean' })`     | Whether the user answered correctly                |
| `response_time_ms` | INTEGER     | `integer`                          | Per-task response time in ms                       |
| `timed_out`        | INTEGER     | `integer({ mode: 'boolean' })`     | Whether the 15 s per-task timer expired            |
| `seed`             | TEXT        | `text`                             | Random seed (allows replaying the exact same task) |
| `session_id`       | TEXT (FK)   | `text` → `session.id`              | Links all tasks from one game session together     |
| `created_at`       | TEXT        | `text` (default CURRENT_TIMESTAMP) | Row creation timestamp                             |

## Data Flow

### Writing (game → DB)

1. `components/RotationGame.svelte` collects `RotationAnswerRow[]` during gameplay.
2. On finish, `Playground.svelte` POSTs `{ results: [...] }` to the generic exercise
   endpoint `/exercises/rotation/playground`.
3. `playground/+server.ts` calls `postResult(results, 'rotation', userId)`.
4. `postResult` creates one `session` row, then inserts all 9 task rows into
   `rotation_attempt` with the new `session_id`.

### Reading (DB → results page)

1. `getResults('rotation', userId)` fetches sessions + their `rotation_attempt` rows
   ordered by `task_index` (via the per-type `orderByMap` in `controllers/result.ts`).
2. The results page iterates over sessions; for each session it passes one session's
   `result.attempts` to the `Result.svelte` component.
3. `Result.svelte` receives `RotationAttemptRow[]` (no unsafe casting) and renders a
   summary header + `<ResultsChart attempts={rows} />`.
4. `results-adapter.ts` derives the summary:
    - `summary(attempts)`: totals, accuracy, avg response time, timeout count,
      and per-difficulty (easy/medium/hard) accuracy breakdown.
    - `resultRows(attempts)`: per-task rows for the chart / table view.

## Wire Format Note

The client sends rows **without** `id`, `sessionId` and `createdAt` — these are
DB-generated (`$defaultFn(generate)`, FK injection, `CURRENT_TIMESTAMP`). That is why
`RotationAttemptRow` declares them optional; only `selected_index` is nullable
(null = timeout, no option picked).

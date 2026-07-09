# Raven Matrices — DB Schema

## Design

Raven uses a single `raven_attempt` table where **each row = one answered question**.
All rows from one game session share the same `session_id` FK pointing to the `session` table.

Summary metrics (accuracy, total/avg time, etc.) are **derived at read time** by aggregating
all `raven_attempt` rows with the same `session_id` — they are not stored as separate columns.

Previously there were two tables (`raven_attempt` for session-level summary +
`raven_answer` for per-question detail linked via `raven_attempt_id` FK). That was
replaced with the current single-table approach to keep the schema consistent with all
other exercises (one attempt table, FK to `session`).

## Table: `raven_attempt`

| Column             | SQLite type | Drizzle type                       | Description                                          |
| ------------------ | ----------- | ---------------------------------- | ---------------------------------------------------- |
| `id`               | TEXT (PK)   | `text`                             | Short-UUID primary key                               |
| `task_id`          | TEXT        | `text`                             | Generated task ID (from `GeneratedRavenTask.id`)     |
| `task_index`       | INTEGER     | `integer`                          | Question number within the session (1-based)         |
| `task_class`       | TEXT        | `text`                             | Reasoning category (see `TaskClass` type)            |
| `difficulty_level` | INTEGER     | `integer`                          | 1 / 2 / 3                                            |
| `difficulty_score` | INTEGER     | `integer`                          | Fine-grained difficulty from `DifficultyProfile`     |
| `rules`            | TEXT        | `text`                             | JSON array of `RuleFamily` strings                   |
| `skill_tags`       | TEXT        | `text`                             | JSON array of skill tag strings                      |
| `selected_index`   | INTEGER     | `integer` (nullable)               | Which answer option the user picked (null = timeout) |
| `correct_index`    | INTEGER     | `integer`                          | Index of the correct answer option                   |
| `selected_family`  | TEXT        | `text` (nullable)                  | Which `DistractorFamily` the user's pick belongs to  |
| `is_correct`       | INTEGER     | `integer({ mode: 'boolean' })`     | Whether the user answered correctly                  |
| `response_time_ms` | INTEGER     | `integer`                          | Per-question response time in ms                     |
| `seed`             | TEXT        | `text`                             | Random seed (allows replaying the exact same task)   |
| `session_id`       | TEXT (FK)   | `text` → `session.id`              | Links all answers from one game session together     |
| `created_at`       | TEXT        | `text` (default CURRENT_TIMESTAMP) | Row creation timestamp                               |

## Data Flow

### Writing (game → DB)

1. `components/RavenMatricesGame.svelte` collects `RavenAnswerRecord[]` during gameplay.
2. On finish, it maps each answer to a flat row (JSON-stringifying `rules` and `skillTags`).
3. `Playground.svelte` POSTs `{ results: [...] }` to the generic exercise endpoint.
4. `playground/+server.ts` calls `postResult(results, 'ravenMatrices', userId)`.
5. `postResult` creates one `session` row, then inserts all answer rows into `raven_attempt`
   with the new `session_id`.

### Reading (DB → results page)

1. `getResults('ravenMatrices', userId)` fetches sessions + their `raven_attempt` rows
   ordered by `task_index`.
2. The results page (`+page.svelte`) iterates over sessions; for each session it passes
   `result.attempts` (the flat array of attempt rows) to the `Result.svelte` component.
3. `Result.svelte` receives `RavenAttemptRow[]` directly (no unsafe casting)
   and renders a summary header + `<ResultsChart attempts={rows} />`.
4. `ResultsChart.svelte` builds a Chart.js line chart:
    - `getResults(attempts)` maps each attempt to a `RavenResult` point
      (`x` = task number, `y` = response time in ms, plus metadata for tooltips).
    - `summary(attempts)` derives aggregate stats:
        - `totalQuestions` = `attempts.length`
        - `correctCount` = count where `isCorrect`
        - `accuracy` = `correctCount / totalQuestions`
        - `totalDurationMs` = sum of all `responseTimeMs`
        - `averageResponseTimeMs` = `totalDurationMs / totalQuestions`
    - Points are colored green (correct) / red (error) via `pointBackgroundColor`.
    - A dashed annotation line marks the average response time.
    - Tooltips show: task number, task class + difficulty level/score,
      selected vs correct answer index, distractor family, response time,
      rules, and skill tags.

## JSON Conventions

- **`rules`**: Stored as `JSON.stringify(ruleFamily[])` e.g. `'["progression","distribution"]'`.
  At read time this is kept as a raw string — parsed on demand if needed.
- **`skillTags`**: Same pattern — `JSON.stringify(string[])`.

Both are stringified in `components/RavenMatricesGame.finish()` before sending to the server,
because Drizzle's SQLite text column stores them as-is.

## orderBy Note

Raven's attempt table uses `task_index` as the ordering column (no `attempt` column).
The generic `getResults()` in `controllers/result.ts` handles this via a per-type
`orderByMap` that maps `ravenMatrices` → `asc(fields.taskIndex)` and everything else
→ `asc(fields.attempt)`.

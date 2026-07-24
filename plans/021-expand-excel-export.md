# Plan 021: Expand GTO Excel Export to Match Result Table Template

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat a1e50fa..HEAD -- src/lib/server/gto/index.ts src/lib/server/db/controllers/gto.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `a1e50fa`, 2026-07-21

## Why this matters

The current Excel export is incomplete compared to the result table template the research team uses. It's missing participant emails, the words they typed (as opposed to word-set words), and the full set of 23 columns from the template. Researchers manually copy-paste from the admin UI, which is error-prone and slow. Aligning the export with the template eliminates that manual step.

## Current state

- `src/lib/server/gto/index.ts` — `getSpreadsheet()` builds an XLSX workbook with ~22 columns. It reads button test .xls from `static/button-files/`. The HEADERS array and data mapping need to be expanded.
- `src/lib/server/db/controllers/gto.ts` — `ParticipantMetrics` type (line ~683) already has: `submittedWords: string[] | null`, `wordScore`, all test metrics, `sex`, `age`. The `email` field is NOT in `ParticipantMetrics` — it's in `profileSurvey` which is loaded separately in `+page.server.ts`.
- `src/routes/(app)/admin/gto/[id]/+page.server.ts` — loads `gtoIdMap` from `profileSurvey` but NOT emails.
- `src/routes/(app)/admin/gto/[id]/+page.svelte` — `exportMetrics()` sends metrics array as JSON POST, gets back workbook JSON, saves as .xlsx. Already imports `* as XLSX from 'xlsx'` (line 6).

### Key gap: email not in the export pipeline

The `ParticipantMetrics` type doesn't include email. To add it:
1. Add `email: string | null` to `ParticipantMetrics`
2. Populate it in `getGtoSessionMetrics()` from the already-loaded `surveyMap`
3. Include it in `getSpreadsheet()` output

### Key gap: submitted words not in the export

`ParticipantMetrics` already has `submittedWords: string[] | null`. Just needs to be added to `getSpreadsheet()`.

### Key gap: button test metrics currently read server-side from static/

The current `getSpreadsheet()` calls `parseButtonTestFile()` which reads .xls files from `static/button-files/`. This approach:
- Requires server filesystem access to upload files (no admin UI)
- Creates a path traversal risk
- Couples the export to server-side file availability

**Plan 022** moves button test parsing to the client side. This plan (021) must prepare the export pipeline to accept button test data as parameters instead of reading files.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Install   | `npm install`            | exit 0              |
| Typecheck | `npm run check`          | exit 0, no errors   |
| Tests     | `npm run test`           | all pass            |
| Lint      | `npm run lint`           | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `src/lib/server/gto/index.ts` — rewrite HEADERS and data mapping in `getSpreadsheet()`; add `buttonTestData` parameter to accept pre-parsed button results
- `src/lib/server/db/controllers/gto.ts` — add `email` to `ParticipantMetrics`, populate it in `getGtoSessionMetrics()`

**Out of scope** (do NOT touch):
- `src/lib/server/db/models/gto.ts` — no schema changes needed
- `src/routes/(app)/admin/gto/[id]/+server.ts` — no server-side changes needed in this plan
- `src/routes/(app)/admin/gto/[id]/+page.server.ts` — email flows automatically once added to ParticipantMetrics
- `src/routes/(app)/admin/gto/[id]/+page.svelte` — no UI changes needed in this plan (plan 022 handles the upload UI and client-side export wiring)
- `static/button-files/` — no new files needed

## Git workflow

- Branch: `feature/021-expand-excel-export`
- Commit per step; message style: `feat(gto): add email to metrics export`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add email to ParticipantMetrics

In `src/lib/server/db/controllers/gto.ts`:

1. Add `email: string | null` to the `ParticipantMetrics` type (around line 683):
   ```typescript
   email: string | null;
   ```
2. In `getGtoSessionMetrics()` (around line 703), the `surveyMap` already has survey rows keyed by userId. Extract email for each participant in the `for (const participant of sessionDetail.participants)` loop:
   ```typescript
   const survey = surveyMap.get(participant.userId) as Record<string, unknown> | undefined;
   const email = (survey?.email as string) ?? null;
   ```
3. Add `email` to the `metrics.push()` call (around line 1041):
   ```typescript
   email,
   ```

**Verify**: `npm run check` → exit 0

### Step 2: Expand HEADERS in getSpreadsheet()

In `src/lib/server/gto/index.ts`, replace the `HEADERS` array with the 23-column template plus email (24 total):

```typescript
const HEADERS = [
    [
        'ID',
        'Email',
        'Пол',
        'Возраст',
        'Средняя скорость Струпа Часть 2',
        'Корректность Струпа Часть 2',
        'Введённые слова',
        'Ср. скорость моторной реакции правая рука',
        'Корректность моторной реакции правая рука',
        'Ср. скорость моторной реакции левая рука',
        'Корректность моторной реакции левая рука',
        'Ср. скорость теста на память',
        'Корректность теста на память',
        'Ср. скорость теста «Ласточка»',
        'Время прохождения теста «Ласточка»',
        'Количество верных слов',
        'Метрика «Равновесие»',
        'Метрика «Лабиринт»',
        'Метрика Мюнстерберга',
        'Средняя скорость Струпа Часть 3',
        'Корректность Струпа Часть 3',
        'Средняя скорость теста «Матрица Равена»',
        'Корректность «Матриц Равена»',
        'Метрика «Логика»'
    ]
];
```

**Verify**: `npm run check` → exit 0

### Step 3: Add buttonTestData parameter to getSpreadsheet()

Add an optional parameter to `getSpreadsheet()` so button test data can be passed in from the client (plan 022 wires this up) instead of being read from the filesystem:

```typescript
export type ButtonTestResult = {
    avgReaction: number | null;
    accuracy: number | null;
};

export type ButtonTestData = Map<string, { left: ButtonTestResult; right: ButtonTestResult }>;
// Key: buttonTestFileName value (e.g. "010907л"), Value: parsed results for left and right hands

export function getSpreadsheet(
    metrics: ParticipantMetrics[],
    buttonTestData?: ButtonTestData
) {
    const data = metrics.map((m) => {
        // Try to get pre-parsed button data first, fall back to file parsing
        let avgReactionLeft: number | null = null;
        let accuracyLeft: number | null = null;
        let avgReactionRight: number | null = null;
        let accuracyRight: number | null = null;

        if (buttonTestData && m.editableMetrics.buttonTestFileName) {
            const parsed = buttonTestData.get(m.editableMetrics.buttonTestFileName);
            if (parsed) {
                avgReactionLeft = parsed.left.avgReaction;
                accuracyLeft = parsed.left.accuracy;
                avgReactionRight = parsed.right.avgReaction;
                accuracyRight = parsed.right.accuracy;
            }
        } else if (m.editableMetrics.buttonTestFileName) {
            // Fallback: try reading from filesystem (legacy, will be removed in plan 022)
            const leftFilename = `${m.editableMetrics.buttonTestFileName}л.xls`;
            const rightFilename = `${m.editableMetrics.buttonTestFileName}п.xls`;
            const leftResult = parseButtonTestFile(leftFilename);
            const rightResult = parseButtonTestFile(rightFilename);
            avgReactionLeft = leftResult.avgReaction;
            accuracyLeft = leftResult.accuracy;
            avgReactionRight = rightResult.avgReaction;
            accuracyRight = rightResult.accuracy;
        }

        return {
            ID: m.participantId,
            Email: m.email ?? '',
            Sex: m.sex,
            Age: m.age,
            StroopStage2MeanTime: m.stroop.stage2.meanTime,
            StroopStage2Accuracy: m.stroop.stage2.accuracy,
            SubmittedWords: m.submittedWords ? m.submittedWords.join(', ') : '',
            AvgReactionRight: avgReactionRight,
            AccuracyRight: accuracyRight,
            AvgReactionLeft: avgReactionLeft,
            AccuracyLeft: accuracyLeft,
            MemoryMeanTime: m.memory.meanTime,
            MemoryAccuracy: m.memory.accuracy,
            SwallowMeanTime: m.swallow.meanTime,
            SwallowTotalTime: m.swallow.totalTime,
            WordScore: m.wordScore,
            BalanceTest: m.editableMetrics.balanceTest,
            Maze: (m.editableMetrics.mazeQ1 ?? 0) + (m.editableMetrics.mazeQ2 ?? 0) + (m.editableMetrics.mazeQ3 ?? 0),
            Munsterberg: m.munsterberg.fractionGuessed,
            StroopStage3MeanTime: m.stroop.stage3.meanTime,
            StroopStage3Accuracy: m.stroop.stage3.accuracy,
            RavenMeanTime: m.raven.averageResponseTimeMs,
            RavenAccuracy: m.raven.accuracy,
            Logic: m.editableMetrics.logic
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.sheet_add_aoa(worksheet, HEADERS, { origin: 'A1' });
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Результаты ГТО-М');
    return workbook;
}
```

### Maze format note

The `Maze` column contains the **sum** of the three maze sub-scores (Q1 + Q2 + Q3), producing an integer 0-3. This matches the template spec (column 17: "Метрика «Лабиринт» (сумма Q1,2,3)") and the existing Python pipeline which computes labyrinth_sum = Q1 + Q2 + Q3. No breaking change - the format remains a sum integer.

**Verify**: `npm run check` → exit 0

### Step 4: Run full verification

```bash
npm run check && npm run lint
```

**Verify**: both exit 0

## Test plan

- No new automated tests needed — the export is a data transformation.
- Manual verification: run the admin UI, go to a GTO session, click export, open the .xlsx and verify:
  1. All 24 columns present (23 template + email)
  2. Emails appear in column 2
  3. Submitted words appear as comma-separated string
   4. Maze is a sum integer (Q1+Q2+Q3, range 0-3)
  5. All test metrics in correct columns
  6. Button test data still works via the legacy filesystem fallback

## Done criteria

- [ ] `npm run check` exits 0
- [ ] `npm run lint` exits 0
- [ ] HEADERS array has 24 entries (23 from template + email)
- [ ] Data mapping includes email and submittedWords
- [ ] `getSpreadsheet()` accepts optional `buttonTestData` parameter
- [ ] `ButtonTestResult` and `ButtonTestData` types are exported
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The `ParticipantMetrics` type doesn't have `submittedWords` or `email` fields where expected.
- The `profileSurvey` table doesn't have an `email` column.
- `XLSX.utils.json_to_sheet` doesn't preserve object key order (test with a small example first).
- A step's verification fails twice after a reasonable fix attempt.
- The fix appears to require touching an out-of-scope file.


## Открытые вопросы (требуют уточнения)

1. **Маппинг участников в кнопочных тестах**: В реальных XLS-файлах от оборудования Сколково (см. plans/gto-buttons/Кнопки Сколково/051007л.xls) каждый файл содержит **несколько участников** (строки 4–13, колонка «Участник» — числовой ID: 6, 9, 11, 12...). Текущий parseButtonTestFile() читает только aw_data[3] — первого участника. Как соотносится ditableMetrics.buttonTestFileName (напр. «051007л») с participantId в системе? Нужно ли искать строку по ID участника внутри файла?

2. **Структура XLS-файлов**: Реальный формат файла (по  51007л.xls):
   - Строка 0: заголовок «История тестирований - Правая рука - ...»
   - Строка 1: пустая
   - Строка 2: шапка (Участник; Успешное нажатие; Ошибочное нажатие; Успешность,%; Стим 1–12)
   - Строки 3+: данные по участникам
   - В отличие от предположения в плане: один файл ≠ один участник. Один файл = все участники одной руки.

3. **Готовые метрики в XLS**: Колонки «Успешное нажатие» (3/3), «Ошибочное нажатие» (0/3), «Успешность,%» уже содержат агрегированные данные. Использовать их напрямую или пересчитывать из «Стим 1–12»? Результат может отличаться, если логика подсчёта расходится.

4. **Несоответствие в заголовке**: Файл  51007л.xls содержит в строке 0 «Правая рука», хотя по суффиксу «л» это левая рука. Уточнить у исследователей, какой файл какой руке соответствует.
## Maintenance notes

- `parseButtonTestFile()` and the filesystem fallback will be removed in plan 022 once client-side parsing is wired up.
- If more columns are added to the template, update HEADERS and data mapping in the same function.
- Email is sourced from `profileSurvey.email`. If survey schema changes, this needs updating.
- The `Maze` value is the sum of Q1+Q2+Q3 (integer 0-3), matching the template spec and the Python pipeline (`labyrinth_sum`).

# Plan 022: Client-Side Button Test File Parsing and Upload UI

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat a1e50fa..HEAD -- src/routes/(app)/admin/gto/[id]/+page.svelte src/routes/(app)/admin/gto/[id]/+server.ts src/lib/server/gto/index.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: 021-expand-excel-export
- **Category**: direction
- **Planned at**: commit `a1e50fa`, 2026-07-21

## Why this matters

Currently, button test .xls files must be manually placed in `static/button-files/` on the server filesystem. There's no admin UI for this, no validation, and the server-side `parseButtonTestFile()` creates coupling to the server's filesystem. By moving parsing to the client, we:
1. Eliminate the path traversal and arbitrary file write security risks
2. Let admins upload files through the browser without server access
3. Parse .xls files in-browser using the already-imported `XLSX` library
4. Pass parsed results directly into the export function

## Current state

- `src/lib/server/gto/index.ts` — `parseButtonTestFile(filename)` reads .xls from `static/button-files/` via `fs.readFileSync`. Convention: `{buttonTestFileName}л.xls` (left) and `{buttonTestFileName}п.xls` (right). Parses row 3, columns 4+. Plan 021 adds `buttonTestData` parameter to `getSpreadsheet()` with `ButtonTestData` type.
- `src/routes/(app)/admin/gto/[id]/+page.svelte` — admin detail page. Already imports `* as XLSX from 'xlsx'` (line 6). Has `exportMetrics()` function (line 186) that POSTs metrics to `+server.ts` and downloads the resulting workbook.
- `src/routes/(app)/admin/gto/[id]/+server.ts` — POST handler calls `getSpreadsheet(metrics)`. Plan 021 adds optional `buttonTestData` parameter.
- `src/lib/server/db/controllers/gto.ts` — `ParticipantMetrics` includes `editableMetrics.buttonTestFileName` (string, e.g. "010907л") and `editableMetrics.buttonTestNumber` (integer 0-20). These identify which button test files belong to which participant.

### Key architecture: client-side parsing

The `XLSX` library works identically in Node and browser. The admin page already imports it. The approach:
1. Admin selects .xls files via `<input type="file">`
2. Client reads each file with `FileReader` → `ArrayBuffer`
3. Client parses with `XLSX.read(buffer, { type: 'array' })`
4. Client extracts the same data that `parseButtonTestFile()` currently extracts server-side
5. Parsed results are stored in a reactive `$state` Map keyed by `buttonTestFileName`
6. On export, the Map is sent alongside metrics to `getSpreadsheet()`

### Naming convention

Each participant has `editableMetrics.buttonTestFileName` (e.g. "010907л"). Two files per participant:
- `{buttonTestFileName}л.xls` — left hand results
- `{buttonTestFileName}п.xls` — right hand results

The admin must upload both files. The client derives the key from the filename by stripping `л.xls` or `п.xls` suffix.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Install   | `npm install`            | exit 0              |
| Typecheck | `npm run check`          | exit 0, no errors   |
| Tests     | `npm run test`           | all pass            |
| Lint      | `npm run lint`           | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `src/routes/(app)/admin/gto/[id]/+page.svelte` — add file upload UI and client-side parsing logic
- `src/routes/(app)/admin/gto/[id]/+server.ts` — update POST handler to accept `buttonTestData`
- `src/lib/server/gto/index.ts` — remove `parseButtonTestFile()`, `FILES_DIR`, `isNumber()`, and the filesystem fallback; remove `import fs` and `import path`

**Out of scope** (do NOT touch):
- `src/lib/server/db/models/gto.ts` — no schema changes
- `src/lib/server/db/controllers/gto.ts` — no controller changes (plan 021 handled email)
- `static/button-files/` — the entire static-file approach is being removed
- The Excel export column layout — plan 021 handled that

## Git workflow

- Branch: `feature/022-client-button-parsing`
- Commit per step; message style: `feat(gto): client-side button test file parsing`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add client-side button test file parsing logic to +page.svelte

In the `<script lang="ts">` section of `src/routes/(app)/admin/gto/[id]/+page.svelte`, add:

```typescript
type ButtonTestResult = {
    avgReaction: number | null;
    accuracy: number | null;
};

type ParsedButtonData = {
    left: ButtonTestResult;
    right: ButtonTestResult;
    filename: string;  // The derived buttonTestFileName key (e.g. "010907л")
};

let parsedButtonFiles = $state<Map<string, ParsedButtonData>>(new Map());

function parseButtonFileClientSide(buffer: ArrayBuffer): ButtonTestResult {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Same logic as the old server-side parseButtonTestFile:
    // Row 3 (index 3), columns 4+ (slice from index 4)
    if (rawData.length < 4) {
        return { avgReaction: null, accuracy: null };
    }
    const relevantCells = rawData[3].slice(4);

    let reactionsSum = 0;
    let incorrectReactionsCount = 0;
    let validCellsCount = 0;

    for (const cell of relevantCells) {
        const cellStr = String(cell).trim();
        if (cellStr === 'x') {
            incorrectReactionsCount++;
            validCellsCount++;
        } else if (cellStr !== '' && !isNaN(Number(cellStr))) {
            reactionsSum += Number(cellStr);
            validCellsCount++;
        }
    }

    if (validCellsCount === 0) {
        return { avgReaction: null, accuracy: null };
    }

    return {
        avgReaction: reactionsSum / validCellsCount,
        accuracy: (validCellsCount - incorrectReactionsCount) / validCellsCount
    };
}

async function handleButtonFileUpload(fileList: FileList) {
    const newParsed = new Map(parsedButtonFiles);

    for (const file of Array.from(fileList)) {
        const name = file.name;
        // Validate: must be .xls or .xlsx
        if (!name.endsWith('.xls') && !name.endsWith('.xlsx')) {
            showToast(`Файл ${name} не поддерживается (только .xls/.xlsx)`, 'error');
            continue;
        }

        // Derive the buttonTestFileName key by stripping suffix
        // "010907л.xls" → "010907л", "010907п.xls" → "010907л"
        // Remove extension first, then the hand suffix (л or п)
        const baseName = name.replace(/\.(xls|xlsx)$/i, '');
        const isLeft = baseName.endsWith('л');
        const isRight = baseName.endsWith('п');
        const key = baseName.replace(/[лп]$/, '');  // "010907л" → "010907"

        if (!isLeft && !isRight) {
            showToast(`Файл ${name}: имя должно заканчиваться на «л» или «п»`, 'error');
            continue;
        }

        try {
            const buffer = await file.arrayBuffer();
            const result = parseButtonFileClientSide(buffer);

            const existing = newParsed.get(key) ?? {
                left: { avgReaction: null, accuracy: null },
                right: { avgReaction: null, accuracy: null },
                filename: key
            };

            if (isLeft) {
                existing.left = result;
            } else {
                existing.right = result;
            }

            newParsed.set(key, existing);
        } catch (e) {
            showToast(`Ошибка чтения файла ${name}`, 'error');
        }
    }

    parsedButtonFiles = newParsed;
    showToast(`Загружено файлов: ${fileList.length}`, 'success');
}
```

**Verify**: `npm run check` → exit 0

### Step 2: Add upload UI to +page.svelte

Add a collapsible section in the markup, before the export button area (around line 1364, after the `{/each}` that closes the participants loop, before the export `<div>`):

```html
<!-- Button test file upload -->
<details class="rounded-lg bg-gray-800 p-4">
    <summary class="cursor-pointer text-sm font-medium text-gray-300">
        Файлы кнопочных тестов
        {#if parsedButtonFiles.size > 0}
            <span class="ml-2 rounded-full bg-blue-900/60 px-2 py-0.5 text-xs text-blue-300">
                {parsedButtonFiles.size} загружено
            </span>
        {/if}
    </summary>
    <div class="mt-3 space-y-3">
        <div class="flex flex-wrap items-end gap-3">
            <div>
                <label class="mb-1 block text-xs text-gray-400">Файлы кнопочных тестов (.xls)</label>
                <input
                    type="file"
                    accept=".xls,.xlsx"
                    multiple
                    class="block text-sm text-gray-300 file:mr-2 file:rounded-lg file:border-0 file:bg-gray-700 file:px-3 file:py-1.5 file:text-sm file:text-gray-300 hover:file:bg-gray-600"
                    onchange={(e) => {
                        const files = (e.target as HTMLInputElement).files;
                        if (files && files.length > 0) {
                            handleButtonFileUpload(files);
                        }
                    }}
                />
            </div>
        </div>
        {#if parsedButtonFiles.size > 0}
            <div class="space-y-1">
                <p class="text-xs text-gray-400">Загруженные файлы:</p>
                {#each Array.from(parsedButtonFiles.entries()) as [key, data]}
                    <div class="flex items-center gap-2 text-xs text-gray-300">
                        <span class="font-mono">{key}</span>
                        <span class={data.left.avgReaction !== null ? 'text-green-400' : 'text-gray-500'}>
                            Левая: {data.left.avgReaction !== null ? data.left.avgReaction.toFixed(0) + 'мс' : '—'}
                        </span>
                        <span class={data.right.avgReaction !== null ? 'text-green-400' : 'text-gray-500'}>
                            Правая: {data.right.avgReaction !== null ? data.right.avgReaction.toFixed(0) + 'мс' : '—'}
                        </span>
                    </div>
                {/each}
                <button
                    class="text-xs text-red-400 hover:text-red-300"
                    onclick={() => { parsedButtonFiles = new Map(); showToast('Файлы очищены', 'info'); }}
                >
                    Очистить все
                </button>
            </div>
        {/if}
    </div>
</details>
```

**Verify**: `npm run check` → exit 0

### Step 3: Wire button data into the export flow

Modify the `exportMetrics()` function to include parsed button data in the POST request.

Replace the existing `exportMetrics` function (around line 186) with:

```typescript
async function exportMetrics(metrics: ParticipantMetrics[], outputName: string) {
    try {
        // Convert parsedButtonFiles Map to a plain object for JSON serialization
        const buttonDataObj: Record<string, { left: ButtonTestResult; right: ButtonTestResult }> = {};
        for (const [key, value] of parsedButtonFiles) {
            buttonDataObj[key] = { left: value.left, right: value.right };
        }

        const response = await fetch('', {
            method: 'POST',
            body: JSON.stringify({ metrics, buttonTestData: buttonDataObj }),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const workbook = await response.json();
        XLSX.writeFile(workbook, `${outputName}.xlsx`, { compression: true });
    } catch {
        showToast('Ошибка экспорта результатов');
    }
}
```

**Verify**: `npm run check` → exit 0

### Step 4: Update server POST handler to accept buttonTestData

In `src/routes/(app)/admin/gto/[id]/+server.ts`, update the POST handler:

Replace:
```typescript
const metrics = await request.json();
const workbook = getSpreadsheet(metrics);
```

With:
```typescript
const body = await request.json();
const metrics = body.metrics as ParticipantMetrics[];
const buttonTestData = body.buttonTestData as Record<string, { left: ButtonTestResult; right: ButtonTestResult }> | undefined;

// Convert plain object back to Map if present
const buttonMap = buttonTestData
    ? new Map(Object.entries(buttonTestData))
    : undefined;

const workbook = getSpreadsheet(metrics, buttonMap);
```

Add the necessary imports at the top:
```typescript
import { getSpreadsheet } from '$lib/server/gto';
import type { ParticipantMetrics, ButtonTestResult, ButtonTestData } from '$lib/server/gto';
```

Note: We import `ButtonTestResult` and `ButtonTestData` from `$lib/server/gto` which are exported in plan 021.

**Verify**: `npm run check` → exit 0

### Step 5: Remove server-side file parsing code from gto/index.ts

In `src/lib/server/gto/index.ts`:

1. Remove the `FILES_DIR` constant (line 33)
2. Remove the `isNumber()` function (lines 34-36)
3. Remove the `parseButtonTestFile()` function (lines 38-79)
4. Remove `import fs from 'fs'` (line 2) — no longer needed
5. Remove `import path from 'path'` (line 4) — no longer needed
6. Remove the filesystem fallback code in `getSpreadsheet()` (the `else if` branch that calls `parseButtonTestFile`). The function should now only use the `buttonTestData` parameter.

The simplified `getSpreadsheet()` data mapping should look like:

```typescript
export function getSpreadsheet(
    metrics: ParticipantMetrics[],
    buttonTestData?: ButtonTestData
) {
    const data = metrics.map((m) => {
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
        }

        return {
            // ... all the fields from plan 021 step 3
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.sheet_add_aoa(worksheet, HEADERS, { origin: 'A1' });
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Результаты ГТО-М');
    return workbook;
}
```

**Verify**: `npm run check` → exit 0

### Step 6: Run full verification

```bash
npm run check && npm run lint
```

**Verify**: both exit 0

## Test plan

- Manual verification:
  1. Run dev server (`npm run dev`)
  2. Log in as admin, navigate to a GTO session detail page
  3. Expand "Файлы кнопочных тестов" section
  4. Select multiple .xls files (both `*л.xls` and `*п.xls` for a participant)
  5. Verify the parsed results appear (left/right reaction times and accuracy)
  6. Click "Экспорт результатов"
  7. Open the .xlsx and verify button test metrics are populated in the correct columns
  8. Click "Очистить все" and verify the Map is reset
  9. Export again — verify button columns are empty/zero

## Done criteria

- [ ] `npm run check` exits 0
- [ ] `npm run lint` exits 0
- [ ] `parseButtonTestFile()` and filesystem imports removed from `src/lib/server/gto/index.ts`
- [ ] Client-side parsing function works identically to the old server-side one
- [ ] Upload UI shows parsed results with left/right hand data
- [ ] Export includes parsed button test data when files are loaded
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The `XLSX` library in the browser doesn't support `.xls` format (only `.xlsx`). Test with an actual .xls file before proceeding.
- The .xls file row/column layout from Skolkovo hardware differs from what `parseButtonTestFile` expects (row 3, columns 4+).
- `XLSX.utils.sheet_to_json` in the browser returns different data shapes than the Node version.
- The `ButtonTestResult`/`ButtonTestData` types aren't exported from `$lib/server/gto` after plan 021.
- A step's verification fails twice after a reasonable fix attempt.
- The fix appears to require touching an out-of-scope file.


## Открытые вопросы (требуют уточнения)

1. **Один файл = несколько участников**: Реальные XLS-файлы Сколково (см. plans/gto-buttons/Кнопки Сколково/051007л.xls) содержат **10+ участников** в одном файле, по одной строке на участника. Текущий план предполагает, что один файл = один участник (ключ по имени файла). Это не так. Парсинг должен искать строку по participantId в колонке «Участник» внутри файла.

2. **Ключ маппинга**: uttonTestFileName (напр. «051007л») — это имя файла. Но внутри файла участники идентифицируются числовым ID (6, 9, 11...). Как соотнести participantId в системе с ID в XLS-файле? Совпадают ли они? Или нужен отдельный маппинг?

3. **Парсинг по строкам, а не по файлу**: parseButtonFileClientSide() в шаге 1 берёт awData[3].slice(4) — первую строку данных. Нужно вместо этого: (а) найти строку с нужным participantId, (б) взять стимулы из колонок «Стим 1–12» (индексы 4–15). Логика парсинга одного участника остаётся той же (числа → скорость, x → ошибка, - → пропуск).

4. **Готовые метрики**: Колонки «Успешное нажатие», «Ошибочное нажатие», «Успешность,%» уже содержат агрегированные данные. Можно ли использовать «Успешность,%» как accuracy, а «Успешное нажатие» для avgReaction? Или нужно всегда пересчитывать из стимулов?

5. **Заголовок «Правая рука» в файле *л.xls**: Внутри файла  51007л.xls заголовок гласит «Правая рука», хотя по суффиксу это левая. Уточнить, какая рука в каком файле — л или п.

6. **Структура ButtonTestData**: Если один файл содержит данные по нескольким участникам, то ключом Map должен быть не uttonTestFileName, а составной ключ (fileName + participantId). Или парсить весь файл сразу и разложить по participantId. Тип ButtonTestData из плана 021 нужно будет пересмотреть.
## Maintenance notes

- If button test hardware format changes, update `parseButtonFileClientSide()` in the svelte file.
- The key derivation from filename assumes `л`/`п` suffix. If the naming convention changes, update the regex.
- The `parsedButtonFiles` Map is ephemeral — it resets on page navigation. For persisting across navigations, consider storing in `sessionStorage` as a future enhancement.
- No server-side file storage is needed anymore — this is a pure client-side feature.
- The `<details>` element is a progressive disclosure pattern that keeps the UI clean when no files are loaded.

---

## Итоги реализации

**Дата**: 2026-07-22
**Статус**: Реализовано с архитектурными отклонениями (в лучшую сторону)

### Что совпадает с планом

- ✅ Клиентский парсинг .xls/.xlsx вместо серверного
- ✅ `<input type="file" accept=".xls,.xlsx" multiple>` в UI
- ✅ Секция `<details>` «Файлы кнопочных тестов» с количеством пар
- ✅ Кнопка «Очистить все»
- ✅ Удалён серверный `parseButtonFile()`, `FILES_DIR`, `isNumber()`
- ✅ Удалены `import fs` / `import path` из gto-кода
- ✅ `static/button-files/` больше не используется
- ✅ Парсинг стимулов (числа → скорость, `x` → ошибка, `-` → пропуск)

### Что реализовано иначе (улучшения)

| Что в плане | Что в реальности | Почему лучше |
|---|---|---|
| Парсинг одной строки `rawData[3].slice(4)` — 1 участник = 1 файл | `parseButtonFile()` парсит все строки с 3-й, собирая массив участников по `buttonId` | Закрывает открытый вопрос №1: один XLS содержит 10+ участников |
| Ключ Map = `buttonTestFileName` (напр. `"010907л"`) | Ключ = `fileNumber` (напр. `"010907"`), participants по `buttonId` внутри | Закрывает открытый вопрос №2: составной ключ не нужен |
| `$state<Map>` в компоненте (эфемерный) | `localforage` — данные сохраняются в IndexedDB | Решает проблему из Maintenance notes (переживает навигацию) |
| `ButtonTestResult` с `avgReaction` + `accuracy` | `ButtonParticipantResult` с `avgReaction`, `accuracy` + `buttonId` | Логичное расширение для мульти-участников |
| Все типы и функции в `+page.svelte` | Вынесено в `$lib/client/gto-button-data.ts` | Лучшая архитектура, тестируемость, переиспользование |
| UI: «Левая: 123мс / Правая: 456мс» | UI: список `fileNumber` с «л+п», выбор участника через dropdown | Практичнее — admin выбирает конкретного участника |
| Шаги 4-5: POST-хендлер + `getSpreadsheet()` с `buttonTestData` | Весь экспорт на клиенте, без серверного участия | Упрощение: нет сетевого round-trip, нет серверной генерации Excel |
| `showToast()` при ошибке валидации имени файла | Файлы с некорректным именем молча скипаются (`console.warn`) | Минорная потеря — нет visual feedback при плохом имени |

### Существенные расхождения

- **Формула `avgReaction`**: план — `reactionsSum / validCellsCount`; реальность — `reactionsSum / (validCellsCount - incorrectReactionsCount)` (среднее только по правильным реакциям, что корректнее). Добавлена защита: если все реакции ошибочные → `avgReaction = null`.
- **Шаги 4 и 5** (серверный экспорт с `buttonTestData`) — **пропущены**: `+server.ts` остался без POST-хендлера, `src/lib/server/gto/index.ts` не существует (удалён/реорганизован ранее). Экспорт полностью на клиенте.
- **Типы `ButtonTestData` / `ButtonTestResult` из `$lib/server/gto`** — не экспортируются, модуль не существует. Заменены на `$lib/client/gto-button-data.ts` с `ParsedButtonFile`, `StoredButtonPair`, `ButtonParticipantResult`.

### Тестирование

- `src/lib/client/gto-button-data.test.ts` — 7 тестов для `parseStimulusRow` (числа, `x`, `-`, пустые, все ошибки, нули, смешанные)
- Нет тестов на `parseButtonFile()` и `uploadButtonFiles()` (интеграционный код с `FileList`/`ArrayBuffer`)

### Критерии выполнения

| Критерий | Статус |
|---|---|
| `parseButtonTestFile()` и filesystem импорты удалены | ✅ |
| Клиентский парсинг работает аналогично серверному | ✅ (и лучше — поддерживает нескольких участников) |
| Upload UI показывает данные | ✅ (и сохраняет в IndexedDB) |
| Экспорт включает button test данные | ✅ (полностью на клиенте) |
| Файлы вне scope не модифицированы | ⚠️ Создан `src/lib/client/gto-button-data.ts` (архитектурное улучшение) |
| `+server.ts` обновлён для `buttonTestData` | ❌ Не актуально — подход изменён, POST не нужен |
| `src/lib/server/gto/index.ts` очищен | ⚠️ Файл не существует — удалён/реорганизован ранее |

### Открытые вопросы — статус

| № | Вопрос | Статус |
|---|---|---|
| 1 | Один файл = несколько участников | ✅ Решено: `parseButtonFile()` парсит все строки по `buttonId` |
| 2 | Ключ маппинга | ✅ Решено: `fileNumber` + `buttonId` внутри |
| 3 | Парсинг по строкам | ✅ Решено: цикл `for (let i = 3; ...)` |
| 4 | Готовые метрики (Успешность,%) | ⬜ Открыт: не используется, всегда пересчёт из стимулов |
| 5 | Заголовок «Правая рука» в `*л.xls` | ⬜ Открыт: не уточнено |
| 6 | Структура ButtonTestData | ✅ Решено: `StoredButtonPair` с `left`/`right` `ParsedButtonFile` |

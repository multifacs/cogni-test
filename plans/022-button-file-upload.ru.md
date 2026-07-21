# План 022: Клиентский парсинг файлов кнопочных тестов и UI загрузки

> **Инструкции для исполнителя**: Выполняйте план шаг за шагом. Запускайте каждую
> команду проверки и подтверждайте ожидаемый результат перед переходом к
> следующему шагу. Если произойдёт что-либо из раздела «Условия ОСТАНОВКИ»,
> остановитесь и сообщите — не импровизируйте. По завершении обновите строку
> статуса этого плана в `plans/README.md`.
>
> **Проверка отклонений (выполнить первой)**: `git diff --stat a1e50fa..HEAD -- src/routes/(app)/admin/gto/[id]/+page.svelte src/routes/(app)/admin/gto/[id]/+server.ts src/lib/server/gto/index.ts`
> Если какой-либо файл из области изменений изменился с момента написания плана,
> сравните выдержки из «Текущее состояние» с актуальным кодом перед продолжением;
> при несовпадении считайте это условием ОСТАНОВКИ.

## Статус

- **Приоритет**: P2
- **Трудоёмкость**: M
- **Риск**: СРЕДНИЙ
- **Зависимости**: 021-expand-excel-export
- **Категория**: направление
- **Запланировано**: коммит `a1e50fa`, 2026-07-21

## Почему это важно

Сейчас .xls файлы кнопочных тестов необходимо вручную помещать в `static/button-files/` на файловой системе сервера. Для этого нет административного UI, нет валидации, а серверный `parseButtonTestFile()` создаёт связь с файловой системой сервера. Перенося парсинг на клиент, мы:
1. Устраняем риски безопасности path traversal и произвольной записи файлов
2. Позволяем администраторам загружать файлы через браузер без доступа к серверу
3. Разбираем .xls файлы в браузере с помощью уже импортированной библиотеки `XLSX`
4. Передаём разобранные результаты напрямую в функцию экспорта

## Текущее состояние

- `src/lib/server/gto/index.ts` — `parseButtonTestFile(filename)` читает .xls из `static/button-files/` через `fs.readFileSync`. Соглашение: `{buttonTestFileName}л.xls` (левая) и `{buttonTestFileName}п.xls` (правая). Разбирает строку 3, колонки 4+. План 021 добавляет параметр `buttonTestData` в `getSpreadsheet()` с типом `ButtonTestData`.
- `src/routes/(app)/admin/gto/[id]/+page.svelte` — страница деталей администратора. Уже импортирует `* as XLSX from 'xlsx'` (строка 6). Имеет функцию `exportMetrics()` (строка 186), которая отправляет метрики POST-запросом в `+server.ts` и скачивает результирующую книгу.
- `src/routes/(app)/admin/gto/[id]/+server.ts` — POST-обработчик вызывает `getSpreadsheet(metrics)`. План 021 добавляет необязательный параметр `buttonTestData`.
- `src/lib/server/db/controllers/gto.ts` — `ParticipantMetrics` содержит `editableMetrics.buttonTestFileName` (строка, напр. «010907л») и `editableMetrics.buttonTestNumber` (целое 0-20). Они определяют, какие файлы кнопочного теста какому участнику принадлежат.

### Ключевая архитектура: клиентский парсинг

Библиотека `XLSX` работает одинаково в Node и в браузере. Административная страница уже импортирует её. Подход:
1. Администратор выбирает .xls файлы через `<input type="file">`
2. Клиент читает каждый файл через `FileReader` → `ArrayBuffer`
3. Клиент разбирает с помощью `XLSX.read(buffer, { type: 'array' })`
4. Клиент извлекает те же данные, которые сейчас извлекает серверный `parseButtonTestFile()`
5. Разобранные результаты хранятся в реактивной `$state` Map с ключом по `buttonTestFileName`
6. При экспорте Map отправляется вместе с метриками в `getSpreadsheet()`

### Соглашение об именовании

У каждого участника есть `editableMetrics.buttonTestFileName` (напр. «010907л»). Два файла на участника:
- `{buttonTestFileName}л.xls` — результаты левой руки
- `{buttonTestFileName}п.xls` — результаты правой руки

Администратор должен загрузить оба файла. Клиент извлекает ключ из имени файла, удаляя суффикс `л.xls` или `п.xls`.

## Команды, которые понадобятся

| Назначение | Команда                 | Ожидаемый результат  |
|------------|-------------------------|----------------------|
| Установка  | `npm install`           | exit 0               |
| Типизация  | `npm run check`         | exit 0, без ошибок   |
| Тесты      | `npm run test`          | все проходят         |
| Линтинг    | `npm run lint`          | exit 0               |

## Область изменений

**В области изменений** (единственные файлы, которые следует модифицировать):
- `src/routes/(app)/admin/gto/[id]/+page.svelte` — добавить UI загрузки файлов и логику клиентского парсинга
- `src/routes/(app)/admin/gto/[id]/+server.ts` — обновить POST-обработчик для приёма `buttonTestData`
- `src/lib/server/gto/index.ts` — удалить `parseButtonTestFile()`, `FILES_DIR`, `isNumber()` и резервный вариант из файловой системы; удалить `import fs` и `import path`

**Вне области изменений** (НЕ трогать):
- `src/lib/server/db/models/gto.ts` — изменения схемы не нужны
- `src/lib/server/db/controllers/gto.ts` — изменения контроллера не нужны (план 021 добавил email)
- `static/button-files/` — весь подход со статическими файлами удаляется
- Раскладка колонок экспорта Excel — план 021 этим занимается

## Рабочий процесс с Git

- Ветка: `feature/022-client-button-parsing`
- Коммит на каждый шаг; стиль сообщений: `feat(gto): client-side button test file parsing`
- НЕ пушить и НЕ открывать PR, если оператор не указал иное.

## Шаги

### Шаг 1: Добавить логику клиентского парсинга файлов кнопочных тестов в +page.svelte

В секции `<script lang="ts">` файла `src/routes/(app)/admin/gto/[id]/+page.svelte` добавить:

```typescript
type ButtonTestResult = {
    avgReaction: number | null;
    accuracy: number | null;
};

type ParsedButtonData = {
    left: ButtonTestResult;
    right: ButtonTestResult;
    filename: string;  // Производный ключ buttonTestFileName (напр. "010907л")
};

let parsedButtonFiles = $state<Map<string, ParsedButtonData>>(new Map());

function parseButtonFileClientSide(buffer: ArrayBuffer): ButtonTestResult {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Та же логика, что и в старом серверном parseButtonTestFile:
    // Строка 3 (индекс 3), колонки 4+ (slice с индекса 4)
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
        // Валидация: должен быть .xls или .xlsx
        if (!name.endsWith('.xls') && !name.endsWith('.xlsx')) {
            showToast(`Файл ${name} не поддерживается (только .xls/.xlsx)`, 'error');
            continue;
        }

        // Извлечение ключа buttonTestFileName удалением суффикса
        // "010907л.xls" → "010907л", "010907п.xls" → "010907л"
        // Сначала удалить расширение, затем суффикс руки (л или п)
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

**Проверка**: `npm run check` → exit 0

### Шаг 2: Добавить UI загрузки в +page.svelte

Добавить сворачиваемую секцию в разметку, перед областью кнопки экспорта (около строки 1364, после `{/each}`, закрывающего цикл участников, перед `<div>` экспорта):

```html
<!-- Загрузка файлов кнопочных тестов -->
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

**Проверка**: `npm run check` → exit 0

### Шаг 3: Подключить кнопочные данные в поток экспорта

Модифицировать функцию `exportMetrics()`, чтобы включить разобранные кнопочные данные в POST-запрос.

Заменить существующую функцию `exportMetrics` (около строки 186) на:

```typescript
async function exportMetrics(metrics: ParticipantMetrics[], outputName: string) {
    try {
        // Конвертировать Map parsedButtonFiles в обычный объект для JSON-сериализации
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

**Проверка**: `npm run check` → exit 0

### Шаг 4: Обновить серверный POST-обработчик для приёма buttonTestData

В `src/routes/(app)/admin/gto/[id]/+server.ts` обновить POST-обработчик:

Заменить:
```typescript
const metrics = await request.json();
const workbook = getSpreadsheet(metrics);
```

На:
```typescript
const body = await request.json();
const metrics = body.metrics as ParticipantMetrics[];
const buttonTestData = body.buttonTestData as Record<string, { left: ButtonTestResult; right: ButtonTestResult }> | undefined;

// Конвертировать обычный объект обратно в Map, если он есть
const buttonMap = buttonTestData
    ? new Map(Object.entries(buttonTestData))
    : undefined;

const workbook = getSpreadsheet(metrics, buttonMap);
```

Добавить необходимые импорты наверху:
```typescript
import { getSpreadsheet } from '$lib/server/gto';
import type { ParticipantMetrics, ButtonTestResult, ButtonTestData } from '$lib/server/gto';
```

Примечание: Мы импортируем `ButtonTestResult` и `ButtonTestData` из `$lib/server/gto`, которые экспортируются в плане 021.

**Проверка**: `npm run check` → exit 0

### Шаг 5: Удалить серверный код парсинга файлов из gto/index.ts

В `src/lib/server/gto/index.ts`:

1. Удалить константу `FILES_DIR` (строка 33)
2. Удалить функцию `isNumber()` (строки 34-36)
3. Удалить функцию `parseButtonTestFile()` (строки 38-79)
4. Удалить `import fs from 'fs'` (строка 2) — больше не нужно
5. Удалить `import path from 'path'` (строка 4) — больше не нужно
6. Удалить резервный код из файловой системы в `getSpreadsheet()` (ветка `else if`, вызывающая `parseButtonTestFile`). Функция теперь должна использовать только параметр `buttonTestData`.

Упрощённый маппинг данных в `getSpreadsheet()` должен выглядеть так:

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
            // ... все поля из плана 021 шаг 3
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.sheet_add_aoa(worksheet, HEADERS, { origin: 'A1' });
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Результаты ГТО-М');
    return workbook;
}
```

**Проверка**: `npm run check` → exit 0

### Шаг 6: Полная проверка

```bash
npm run check && npm run lint
```

**Проверка**: оба exit 0

## План тестирования

- Ручная проверка:
  1. Запустить dev-сервер (`npm run dev`)
  2. Войти как администратор, перейти на страницу деталей сессии ГТО
  3. Развернуть секцию «Файлы кнопочных тестов»
  4. Выбрать несколько .xls файлов (и `*л.xls`, и `*п.xls` для участника)
  5. Проверить, что разобранные результаты отображаются (время реакции и точность левой/правой руки)
  6. Нажать «Экспорт результатов»
  7. Открыть .xlsx и проверить, что метрики кнопочного теста заполнены в правильных колонках
  8. Нажать «Очистить все» и проверить, что Map сброшен
  9. Экспортировать снова — проверить, что колонки кнопочного теста пустые/ноль

## Критерии завершения

- [ ] `npm run check` завершается с exit 0
- [ ] `npm run lint` завершается с exit 0
- [ ] `parseButtonTestFile()` и импорты файловой системы удалены из `src/lib/server/gto/index.ts`
- [ ] Клиентская функция парсинга работает идентично старой серверной
- [ ] UI загрузки отображает разобранные результаты с данными левой/правой руки
- [ ] Экспорт включает разобранные данные кнопочного теста при загруженных файлах
- [ ] Файлы за пределами списка области изменений не модифицированы (`git status`)
- [ ] Строка статуса в `plans/README.md` обновлена

## Условия ОСТАНОВКИ

Остановитесь и сообщите (не импровизируйте), если:

- Библиотека `XLSX` в браузере не поддерживает формат `.xls` (только `.xlsx`). Протестируйте с реальным .xls файлом перед продолжением.
- Структура строк/колонок .xls файла от оборудования Сколково отличается от ожидаемой `parseButtonTestFile` (строка 3, колонки 4+).
- `XLSX.utils.sheet_to_json` в браузере возвращает структуры данных, отличающиеся от версии Node.
- Типы `ButtonTestResult`/`ButtonTestData` не экспортируются из `$lib/server/gto` после плана 021.
- Проверка шага не проходит дважды после разумной попытки исправления.
- Исправление, по-видимому, требует изменения файла вне области изменений.

## Открытые вопросы (требуют уточнения)

1. **Один файл = несколько участников**: Реальные XLS-файлы Сколково (см. plans/gto-buttons/Кнопки Сколково/051007л.xls) содержат **10+ участников** в одном файле, по одной строке на участника. Текущий план предполагает, что один файл = один участник (ключ по имени файла). Это не так. Парсинг должен искать строку по participantId в колонке «Участник» внутри файла.

2. **Ключ маппинга**: buttonTestFileName (напр. «051007л») — это имя файла. Но внутри файла участники идентифицируются числовым ID (6, 9, 11...). Как соотнести participantId в системе с ID в XLS-файле? Совпадают ли они? Или нужен отдельный маппинг?

3. **Парсинг по строкам, а не по файлу**: parseButtonFileClientSide() в шаге 1 берёт rawData[3].slice(4) — первую строку данных. Нужно вместо этого: (а) найти строку с нужным participantId, (б) взять стимулы из колонок «Стим 1–12» (индексы 4–15). Логика парсинга одного участника остаётся той же (числа → скорость, x → ошибка, - → пропуск).

4. **Готовые метрики**: Колонки «Успешное нажатие», «Ошибочное нажатие», «Успешность,%» уже содержат агрегированные данные. Можно ли использовать «Успешность,%» как accuracy, а «Успешное нажатие» для avgReaction? Или нужно всегда пересчитывать из стимулов?

5. **Заголовок «Правая рука» в файле *л.xls**: Внутри файла 051007л.xls заголовок гласит «Правая рука», хотя по суффиксу это левая. Уточнить, какая рука в каком файле — л или п.

6. **Структура ButtonTestData**: Если один файл содержит данные по нескольким участникам, то ключом Map должен быть не buttonTestFileName, а составной ключ (fileName + participantId). Или парсить весь файл сразу и разложить по participantId. Тип ButtonTestData из плана 021 нужно будет пересмотреть.

## Примечания по сопровождению

- Если формат оборудования кнопочного теста изменится, обновите `parseButtonFileClientSide()` в svelte-файле.
- Извлечение ключа из имени файла предполагает суффикс `л`/`п`. Если соглашение об именовании изменится, обновите регулярное выражение.
- Map `parsedButtonFiles` эфемерна — она сбрасывается при навигации со страницы. Для сохранения между навигациями рассмотрите хранение в `sessionStorage` как будущее улучшение.
- Серверное хранение файлов больше не нужно — это чисто клиентская функция.
- Элемент `<details>` — паттерн прогрессивного раскрытия, который сохраняет UI чистым, когда файлы не загружены.

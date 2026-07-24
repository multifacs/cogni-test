# План 021: Расширение экспорта ГТО в Excel в соответствии с шаблоном таблицы результатов

> **Инструкции для исполнителя**: Выполняйте план шаг за шагом. Запускайте каждую
> команду проверки и подтверждайте ожидаемый результат перед переходом к
> следующему шагу. Если произойдёт что-либо из раздела «Условия ОСТАНОВКИ»,
> остановитесь и сообщите — не импровизируйте. По завершении обновите строку
> статуса этого плана в `plans/README.md`.
>
> **Проверка отклонений (выполнить первой)**: `git diff --stat a1e50fa..HEAD -- src/lib/server/gto/index.ts src/lib/server/db/controllers/gto.ts`
> Если какой-либо файл из области изменений изменился с момента написания плана,
> сравните выдержки из «Текущее состояние» с актуальным кодом перед продолжением;
> при несовпадении считайте это условием ОСТАНОВКИ.

## Статус

- **Приоритет**: P1
- **Трудоёмкость**: M
- **Риск**: СРЕДНИЙ
- **Зависимости**: нет
- **Категория**: направление
- **Запланировано**: коммит `a1e50fa`, 2026-07-21

## Почему это важно

Текущий экспорт в Excel неполон по сравнению с шаблоном таблицы результатов, который использует исследовательская группа. В нём отсутствуют email участников, введённые ими слова (в отличие от слов из набора) и полный набор из 23 колонок из шаблона. Исследователи вручную копируют данные из административного интерфейса, что чревато ошибками и медленно. Приведение экспорта в соответствие с шаблоном устраняет этот ручной шаг.

## Текущее состояние

- `src/lib/server/gto/index.ts` — `getSpreadsheet()` создаёт книгу XLSX с ~22 колонками. Он читает кнопочные тесты .xls из `static/button-files/`. Массив HEADERS и маппинг данных требуют расширения.
- `src/lib/server/db/controllers/gto.ts` — тип `ParticipantMetrics` (строка ~683) уже содержит: `submittedWords: string[] | null`, `wordScore`, все метрики тестов, `sex`, `age`. Поле `email` НЕ входит в `ParticipantMetrics` — оно в `profileSurvey`, который загружается отдельно в `+page.server.ts`.
- `src/routes/(app)/admin/gto/[id]/+page.server.ts` — загружает `gtoIdMap` из `profileSurvey`, но НЕ email.
- `src/routes/(app)/admin/gto/[id]/+page.svelte` — `exportMetrics()` отправляет массив метрик как JSON POST, получает обратно JSON книги, сохраняет как .xlsx. Уже импортирует `* as XLSX from 'xlsx'` (строка 6).

### Ключевой пробел: email не в конвейере экспорта

Тип `ParticipantMetrics` не включает email. Чтобы добавить его:
1. Добавить `email: string | null` в `ParticipantMetrics`
2. Заполнить его в `getGtoSessionMetrics()` из уже загруженного `surveyMap`
3. Включить его в вывод `getSpreadsheet()`

### Ключевой пробел: отправленные слова не в экспорте

`ParticipantMetrics` уже содержит `submittedWords: string[] | null`. Нужно просто добавить в `getSpreadsheet()`.

### Ключевой пробел: метрики кнопочного теста сейчас читаются сервером из static/

Текущий `getSpreadsheet()` вызывает `parseButtonTestFile()`, который читает .xls файлы из `static/button-files/`. Этот подход:
- Требует доступа к файловой системе сервера для загрузки файлов (нет административного UI)
- Создаёт риск path traversal
- Связывает экспорт с доступностью файлов на сервере

**План 022** переносит парсинг кнопочных тестов на клиентскую сторону. Этот план (021) должен подготовить конвейер экспорта для приёма данных кнопочного теста как параметров вместо чтения файлов.

## Команды, которые понадобятся

| Назначение | Команда                 | Ожидаемый результат  |
|------------|-------------------------|----------------------|
| Установка  | `npm install`           | exit 0               |
| Типизация  | `npm run check`         | exit 0, без ошибок   |
| Тесты      | `npm run test`          | все проходят         |
| Линтинг    | `npm run lint`          | exit 0               |

## Область изменений

**В области изменений** (единственные файлы, которые следует модифицировать):
- `src/lib/server/gto/index.ts` — переписать HEADERS и маппинг данных в `getSpreadsheet()`; добавить параметр `buttonTestData` для приёма предобработанных результатов кнопочного теста
- `src/lib/server/db/controllers/gto.ts` — добавить `email` в `ParticipantMetrics`, заполнить его в `getGtoSessionMetrics()`

**Вне области изменений** (НЕ трогать):
- `src/lib/server/db/models/gto.ts` — изменения схемы не нужны
- `src/routes/(app)/admin/gto/[id]/+server.ts` — серверные изменения не нужны в этом плане
- `src/routes/(app)/admin/gto/[id]/+page.server.ts` — email проходит автоматически после добавления в ParticipantMetrics
- `src/routes/(app)/admin/gto/[id]/+page.svelte` — изменения UI не нужны в этом плане (план 022 отвечает за UI загрузки и клиентский экспорт)
- `static/button-files/` — новые файлы не нужны

## Рабочий процесс с Git

- Ветка: `feature/021-expand-excel-export`
- Коммит на каждый шаг; стиль сообщений: `feat(gto): add email to metrics export`
- НЕ пушить и НЕ открывать PR, если оператор не указал иное.

## Шаги

### Шаг 1: Добавить email в ParticipantMetrics

В `src/lib/server/db/controllers/gto.ts`:

1. Добавить `email: string | null` в тип `ParticipantMetrics` (около строки 683):
   ```typescript
   email: string | null;
   ```
2. В `getGtoSessionMetrics()` (около строки 703) `surveyMap` уже содержит строки опроса, ключ — userId. Извлечь email для каждого участника в цикле `for (const participant of sessionDetail.participants)`:
   ```typescript
   const survey = surveyMap.get(participant.userId) as Record<string, unknown> | undefined;
   const email = (survey?.email as string) ?? null;
   ```
3. Добавить `email` в вызов `metrics.push()` (около строки 1041):
   ```typescript
   email,
   ```

**Проверка**: `npm run check` → exit 0

### Шаг 2: Расширить HEADERS в getSpreadsheet()

В `src/lib/server/gto/index.ts` заменить массив `HEADERS` на 23-колоночный шаблон плюс email (24 всего):

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

**Проверка**: `npm run check` → exit 0

### Шаг 3: Добавить параметр buttonTestData в getSpreadsheet()

Добавить необязательный параметр в `getSpreadsheet()`, чтобы данные кнопочного теста можно было передать с клиента (план 022 подключит это) вместо чтения из файловой системы:

```typescript
export type ButtonTestResult = {
    avgReaction: number | null;
    accuracy: number | null;
};

export type ButtonTestData = Map<string, { left: ButtonTestResult; right: ButtonTestResult }>;
// Ключ: значение buttonTestFileName (напр. "010907л"), Значение: разобранные результаты для левой и правой руки

export function getSpreadsheet(
    metrics: ParticipantMetrics[],
    buttonTestData?: ButtonTestData
) {
    const data = metrics.map((m) => {
        // Сначала попробовать получить предобработанные кнопочные данные, затем парсинг из файла
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
            // Резервный вариант: попытка чтения из файловой системы (устаревшее, будет удалено в плане 022)
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

### Примечание по формату «Лабиринт»

Колонка `Maze` содержит **сумму** трёх подоценок лабиринта (Q1 + Q2 + Q3), producing an integer 0-3. Это соответствует спецификации шаблона (колонка 17: «Метрика „Лабиринт" (сумма Q1,2,3)») и существующему Python-конвейеру, который вычисляет labyrinth_sum = Q1 + Q2 + Q3. Без ломающих изменений — формат остаётся суммой-целым числом.

**Проверка**: `npm run check` → exit 0

### Шаг 4: Полная проверка

```bash
npm run check && npm run lint
```

**Проверка**: оба exit 0

## План тестирования

- Новые автоматические тесты не нужны — экспорт является трансформацией данных.
- Ручная проверка: запустить административный UI, перейти к сессии ГТО, нажать экспорт, открыть .xlsx и проверить:
  1. Все 24 колонки на месте (23 из шаблона + email)
  2. Email отображаются во 2-й колонке
  3. Отправленные слова отображаются как строка через запятую
  4. Лабиринт — сумма-целое (Q1+Q2+Q3, диапазон 0-3)
  5. Все метрики тестов в правильных колонках
  6. Данные кнопочного теста по-прежнему работают через устаревший резервный вариант из файловой системы

## Критерии завершения

- [ ] `npm run check` завершается с exit 0
- [ ] `npm run lint` завершается с exit 0
- [ ] Массив HEADERS содержит 24 записи (23 из шаблона + email)
- [ ] Маппинг данных включает email и submittedWords
- [ ] `getSpreadsheet()` принимает необязательный параметр `buttonTestData`
- [ ] Типы `ButtonTestResult` и `ButtonTestData` экспортируются
- [ ] Файлы за пределами списка области изменений не модифицированы (`git status`)
- [ ] Строка статуса в `plans/README.md` обновлена

## Условия ОСТАНОВКИ

Остановитесь и сообщите (не импровизируйте), если:

- Тип `ParticipantMetrics` не содержит поля `submittedWords` или `email` там, где ожидается.
- Таблица `profileSurvey` не содержит колонку `email`.
- `XLSX.utils.json_to_sheet` не сохраняет порядок ключей объекта (сначала протестируйте на небольшом примере).
- Проверка шага не проходит дважды после разумной попытки исправления.
- Исправление, по-видимому, требует изменения файла вне области изменений.

## Открытые вопросы (требуют уточнения)

1. **Маппинг участников в кнопочных тестах**: В реальных XLS-файлах от оборудования Сколково (см. plans/gto-buttons/Кнопки Сколково/051007л.xls) каждый файл содержит **несколько участников** (строки 4–13, колонка «Участник» — числовой ID: 6, 9, 11, 12...). Текущий parseButtonTestFile() читает только raw_data[3] — первого участника. Как соотносится editableMetrics.buttonTestFileName (напр. «051007л») с participantId в системе? Нужно ли искать строку по ID участника внутри файла?

2. **Структура XLS-файлов**: Реальный формат файла (по 051007л.xls):
   - Строка 0: заголовок «История тестирований - Правая рука - ...»
   - Строка 1: пустая
   - Строка 2: шапка (Участник; Успешное нажатие; Ошибочное нажатие; Успешность,%; Стим 1–12)
   - Строки 3+: данные по участникам
   - В отличие от предположения в плане: один файл ≠ один участник. Один файл = все участники одной руки.

3. **Готовые метрики в XLS**: Колонки «Успешное нажатие» (3/3), «Ошибочное нажатие» (0/3), «Успешность,%» уже содержат агрегированные данные. Использовать их напрямую или пересчитывать из «Стим 1–12»? Результат может отличаться, если логика подсчёта расходится.

4. **Несоответствие в заголовке**: Файл 051007л.xls содержит в строке 0 «Правая рука», хотя по суффиксу «л» это левая рука. Уточнить у исследователей, какой файл какой руке соответствует.

## Примечания по сопровождению

- `parseButtonTestFile()` и резервный вариант из файловой системы будут удалены в плане 022 после подключения клиентского парсинга.
- Если в шаблон добавляются новые колонки, обновите HEADERS и маппинг данных в той же функции.
- Email берётся из `profileSurvey.email`. Если схема опроса изменится, это нужно обновить.
- Значение `Maze` — сумма Q1+Q2+Q3 (целое 0-3), что соответствует спецификации шаблона и Python-конвейеру (`labyrinth_sum`).

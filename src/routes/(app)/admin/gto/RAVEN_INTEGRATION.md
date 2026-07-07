# План интеграции Raven Matrices в GTO

Документ описывает пошаговую реализацию добавления упражнения **Матрицы Равена** (Raven Matrices) в существующую последовательность когнитивных тестов ГТО-М как **7-й шаг** (после «Ласточки»).

---

## 1. Обзор

### Что добавляем

- **Название:** Матрицы Равена
- **Позиция в последовательности:** 7-й элемент (после `swallow`)
- **Тип:** Exercise (`src/lib/exercises/raven-matrices/`)
- **Связь с сессией:** Через таблицу `session` (поле `gtoSessionId`) и таблицу `ravenAttempt`

### Зачем

Методика прогрессивных матриц Равена — стандартный инструмент оценки флюидного интеллекта. Включение её в ГТО-М позволяет получать единообразные метрики по всем основным когнитивным доменам в рамках одной сессии.

### Ключевое ограничение

Raven **остаётся exercise**. Не нужно переносить его код в `src/lib/tests/`, конвертировать в полноценный test или дублировать генераторы. Он подключается в существующую оркестрацию GTO через расширение типов и ленивую загрузку компонентов.

---

## 2. Архитектурные решения

### 2.1. Raven — exercise

- **Решение:** Не переносить код из `src/lib/exercises/raven-matrices/`.
- **Обоснование:**
    - У exercise уже есть свои `About.svelte`, `Playground.svelte`, `Result.svelte`, генератор задач и адаптер метрик (`results-adapter.ts`).
    - Перенос привёл бы к дублированию логики генерации матриц и привязки к SVG-отрисовке.
    - Система `testRegistry` и `testLoaders` поддерживает загрузку компонентов из любого пути, а не только из `src/lib/tests/<name>/`.

### 2.2. Переиспользование `postResult`

- **Решение:** Не изменять `src/routes/(app)/gto/session/[id]/play/+server.ts`.
- **Обоснование:**
    - Метод `postResult` в контроллере результатов уже принимает тип `'ravenMatrices'` и сериализует/сохраняет его в таблицу `ravenAttempt`.
    - GTO endpoint (`+server.ts`) вызывает `postResult(action.testType, ...)` динамически, поэтому достаточно добавить `'ravenMatrices'` в `TestType` и `TEST_ORDER`.

### 2.3. Добавление в `TestType` и `TEST_ORDER`

- **Решение:** Внести `'ravenMatrices'` в `TestType` и в массив `tests[]` из `src/lib/tests/index.ts`.
- **Обоснование:**
    - Это минимальная точка входа. `+page.svelte` для прохождения тестов (`play`) опирается на `TEST_ORDER`, чтобы определить порядок и прогресс.
    - `TestResultMap` связывает `'ravenMatrices'` с типом `RavenFullResult`, что сохраняет типобезопасность при отправке результатов.
    - `testLoaders` для `'ravenMatrices'` будут использовать `import()` из директории `exercises/raven-matrices/`, что позволяет не менять динамическую загрузку компонентов.

### 2.4. Безопасность расширения `testLoaders`

- **Решение:** Добавить ленивый импорт компонентов Raven в объект `testLoaders`.
- **Обоснование:**
    - Все текущие тесты загружаются через функции `() => import('./<test>/...')`.
    - Для Raven формат аналогичный: `() => import('../exercises/raven-matrices/About.svelte')`.
    - Компонент `Playground.svelte` из Raven получит на вход те же пропсы (`gameEnd`, `sendResults`, `data`), что и остальные тесты.

---

## 3. Изменения файлов

### 3.1. `src/lib/tests/types.ts`

**Добавить импорт:**

```ts
import type { RavenFullResult } from '$lib/exercises/raven-matrices/types';
```

**Расширить `TestType`:**

```ts
export type TestType =
	| 'math'
	| 'stroop'
	| 'munsterberg'
	| 'memory'
	| 'swallow'
	| 'campimetry'
	| 'ravenMatrices'; // <-- new
```

**Расширить `TestResultMap`:**

```ts
export type TestResultMap = {
	math: MathResult;
	stroop: StroopResult;
	munsterberg: MunsterbergResult;
	memory: MemoryResult;
	swallow: SwallowResult;
	campimetry: CampimetryResult;
	ravenMatrices: RavenFullResult; // <-- new
};
```

**Расширить `RegularResult`:**

```ts
export type RegularResult =
	| StroopResult
	| MathResult
	| MunsterbergResult
	| MemoryResult
	| SwallowResult
	| CampimetryResult
	| RavenFullResult; // <-- new
```

**Расширить `RegularResults`:**

```ts
export type RegularResults =
	| StroopResult[]
	| MathResult[]
	| MunsterbergResult[]
	| MemoryResult[]
	| SwallowResult[]
	| CampimetryResult[]
	| RavenFullResult[]; // <-- new
```

> **Важно:** Поскольку `TestResultMap['ravenMatrices']` теперь определён, любой generic handler результатов (`sendResults`, `postResult`) сможет корректно агрегировать типы.

---

### 3.2. `src/lib/tests/index.ts`

**Добавить элемент в конец массива `tests`:**

```ts
export const tests: TestData[] = [
	// ... existing 6 items ...
	{
		name: 'ravenMatrices',
		title: 'Матрицы Равена',
		path: '', // exercise не имеет отдельной about-страницы; опускаем или ставим '/'
		img: '' // можно позже добавить изображение
	}
];
```

**Добавить загрузчик в `testLoaders`:**

```ts
const testLoaders: Record<string, TestLoader> = {
	// ... existing 6 loaders ...
	ravenMatrices: {
		about: () => import('../exercises/raven-matrices/About.svelte'),
		playground: () => import('../exercises/raven-matrices/Playground.svelte'),
		resultsChart: () => import('../exercises/raven-matrices/Result.svelte')
	}
};
```

> **Примечание:** Свойство `resultsChart` сопоставлено с `Result.svelte`, чтобы при необходимости можно было отрисовывать общую сводку. Это не влияет на механику GTO.

---

### 3.3. `src/routes/(app)/gto/session/[id]/play/+page.server.ts`

**Импортировать генератор Raven:**

```ts
import { generateRavenTest } from '$lib/exercises/raven-matrices';
import type { GeneratedRavenTask } from '$lib/exercises/raven-matrices/types';
```

**Расширить тип `data` и логику генерации:**

В теле функции `load`, после блока определения `currentTestType`, добавить поле `ravenTest?: GeneratedRavenTask[]` в объект `data`:

```ts
const data: {
	session: typeof sessionDetail;
	participant: typeof participant;
	currentTestIndex: number;
	currentTestType: string;
	words?: string[];
	silhouettes?: Record<string, string>;
	ravenTest?: GeneratedRavenTask[]; // <-- new
} = {
	session: sessionDetail,
	participant,
	currentTestIndex: participant.currentTestIndex,
	currentTestType
};
```

Затем добавить блок генерации перед `return data`:

```ts
if (currentTestType === 'ravenMatrices') {
	data.ravenTest = generateRavenTest({ count: 12 });
}
```

> **Параметры генерации:**
>
> - `count: 12` — разумное количество заданий для одной сессии. При необходимости настраивается.
> - Опции (`RavenTestGenerationOptions`) позволяют управлять сложностью, классами задач и семействами правил.

---

### 3.4. `src/routes/(app)/gto/session/[id]/play/+page.svelte`

Текущий компонент передаёт в `TestComponent` три пропса:

```svelte
<TestComponent gameEnd={onGameEnd} sendResults={onSendResults} {data} />
```

Raven `Playground.svelte` должен принимать эти же пропсы:

- `gameEnd: () => void` — вызывается при досрочном завершении.
- `sendResults: (results: RavenFullResult) => void` — вызывается при финальной отправке.
- `data: PageData` — содержит `data.ravenTest` (сгенерированные задания).

**Необходимые изменения на клиенте** (в текущем файле `+page.svelte`) **минимальны**:

Убедиться, что `data` прокидывается как реактивный пропс. В текущей реализации:

```svelte
<TestComponent gameEnd={onGameEnd} sendResults={onSendResults} {data} />
```

— `data` уже передаётся. Скорее всего, дополнительных правок в этом файле не потребуется, **если** `Playground.svelte` Raven умеет работать с этим интерфейсом.

> **Предупреждение:** Если текущая реализация `Playground.svelte` Raven использует иной интерфейс пропсов (например, `onComplete` вместо `sendResults`), потребуется либо создание тонкого адаптера-обёртки, либо согласование интерфейса. В рамках данного плана считаем, что контракт `gameEnd`/`sendResults` уже выдерживается.

---

### 3.5. `src/lib/server/db/controllers/gto.ts`

**Добавить импорт модели Raven:**

```ts
import { ravenAttempt } from '$lib/server/db/models/exercises';
```

**Добавить новые типы для метрик:**

```ts
export type RavenDifficultyLevelMetrics = {
	correct: number;
	total: number;
	accuracy: number;
};

export type RavenDifficultyBreakdown = {
	level1: RavenDifficultyLevelMetrics;
	level2: RavenDifficultyLevelMetrics;
	level3: RavenDifficultyLevelMetrics;
};

export type RavenTaskClassBreakdown = Record<
	string,
	{ correct: number; total: number; label: string }
>;

export type RavenMetrics = {
	totalQuestions: number;
	correctCount: number;
	accuracy: number;
	averageResponseTimeMs: number;
	byDifficulty: RavenDifficultyBreakdown;
	byTaskClass: RavenTaskClassBreakdown;
};
```

**Расширить `ParticipantMetrics`:**

```ts
export type ParticipantMetrics = {
	participantId: string;
	userId: string;
	firstname: string;
	lastname: string;
	sex: string;
	age: number;
	missingSurveyFields: string[];
	stroop: { stage1: StroopStageMetrics; stage2: StroopStageMetrics; stage3: StroopStageMetrics };
	math: SimpleTestMetrics;
	munsterberg: MunsterbergMetrics;
	campimetry: CampimetryMetrics;
	memory: SimpleTestMetrics;
	swallow: SimpleTestMetrics;
	raven: RavenMetrics; // <-- new
	editableMetrics: GtoEditableMetricDetail;
	wordScore: number | null;
};
```

**Модифицировать `getGtoSessionMetrics`:**

В секции сбора `sessionIds` добавить:

```ts
const ravenSessionIds: string[] = [];
```

В `switch (ts.testType)` добавить кейс:

```ts
case 'ravenMatrices':
	ravenSessionIds.push(ts.id);
	break;
```

В секцию `Promise.all` добавить выборку Raven:

```ts
const [
	// ... existing 6 arrays ...
	ravenAttempts
] = await Promise.all([
	// ... existing 6 queries ...
	ravenSessionIds.length
		? db.select().from(ravenAttempt).where(inArray(ravenAttempt.sessionId, ravenSessionIds))
		: []
]);
```

Добавить индексацию:

```ts
const ravenAttemptsMap = indexBySessionId(ravenAttempts);
```

В цикле по `sessionDetail.participants`, после блока `swallow`, добавить расчёт Raven-метрик:

```ts
// ─── Raven ────────────────────────────────────────────
const ravenSession = testSessions.find((s) => s.testType === 'ravenMatrices');
let ravenMetrics: RavenMetrics = {
	totalQuestions: 0,
	correctCount: 0,
	accuracy: 0,
	averageResponseTimeMs: 0,
	byDifficulty: {
		level1: { correct: 0, total: 0, accuracy: 0 },
		level2: { correct: 0, total: 0, accuracy: 0 },
		level3: { correct: 0, total: 0, accuracy: 0 }
	},
	byTaskClass: {}
};

if (ravenSession) {
	const attempts = ravenAttemptsMap.get(ravenSession.id) ?? [];
	const totalQuestions = attempts.length;
	const correctCount = attempts.filter((a) => a.isCorrect).length;
	const totalDurationMs = attempts.reduce((sum, a) => sum + a.responseTimeMs, 0);
	const avgTime = totalQuestions ? Math.round(totalDurationMs / totalQuestions) : 0;

	const byDifficulty: RavenDifficultyBreakdown = {
		level1: { correct: 0, total: 0, accuracy: 0 },
		level2: { correct: 0, total: 0, accuracy: 0 },
		level3: { correct: 0, total: 0, accuracy: 0 }
	};

	for (const a of attempts) {
		const lvl = a.difficultyLevel as 1 | 2 | 3;
		if (lvl >= 1 && lvl <= 3) {
			const key = `level${lvl}` as const;
			byDifficulty[key].total++;
			if (a.isCorrect) byDifficulty[key].correct++;
		}
	}

	for (const key of ['level1', 'level2', 'level3'] as const) {
		const d = byDifficulty[key];
		d.accuracy = d.total > 0 ? d.correct / d.total : 0;
	}

	const byTaskClass: RavenTaskClassBreakdown = {};
	for (const a of attempts) {
		const label = TASK_CLASS_LABELS[a.taskClass as TaskClass] ?? a.taskClass;
		if (!byTaskClass[a.taskClass]) {
			byTaskClass[a.taskClass] = { correct: 0, total: 0, label };
		}
		byTaskClass[a.taskClass].total++;
		if (a.isCorrect) byTaskClass[a.taskClass].correct++;
	}

	ravenMetrics = {
		totalQuestions,
		correctCount,
		accuracy: totalQuestions ? correctCount / totalQuestions : 0,
		averageResponseTimeMs: avgTime,
		byDifficulty,
		byTaskClass
	};
}
```

И, наконец, добавить `raven: ravenMetrics` в объект `metrics.push(...)`.

> **Импорт `TASK_CLASS_LABELS` и `TaskClass`:**
> В начало `gto.ts` добавить:
>
> ```ts
> import { TASK_CLASS_LABELS } from '$lib/exercises/raven-matrices/results-adapter';
> import type { TaskClass } from '$lib/exercises/raven-matrices/types';
> ```

---

### 3.6. `src/routes/(app)/admin/gto/[id]/+page.svelte`

Добавить новую карточку метрик в сетку (`grid`) внутри блока `{#if isExpanded}`.

Позиция: после блока «Ласточка» (Swallow) или в любом свободном месте сетки.

**Разметка карточки Raven:**

```svelte
<!-- Raven -->
<div class="rounded-lg bg-gray-900/50 p-3">
	<h4 class="mb-2 text-xs font-semibold uppercase tracking-wider text-violet-400">
		Матрицы Равена
	</h4>
	<div class="flex flex-col gap-1 text-sm">
		<div class="flex items-center gap-2">
			<span class="w-20 shrink-0 text-xs text-gray-400">Всего</span>
			<span class="tabular-nums">{m.raven.correctCount}/{m.raven.totalQuestions}</span>
		</div>
		<div class="flex items-center gap-2">
			<span class="w-20 shrink-0 text-xs text-gray-400">Точность</span>
			<span
				class="tabular-nums {m.raven.accuracy >= 0.8
					? 'text-green-400'
					: m.raven.accuracy >= 0.5
						? 'text-yellow-400'
						: 'text-red-400'}"
			>
				{pct(m.raven.accuracy)}
			</span>
		</div>
		<div class="flex items-center gap-2">
			<span class="w-20 shrink-0 text-xs text-gray-400">Среднее</span>
			<span class="tabular-nums">{fmt(m.raven.averageResponseTimeMs / 1000)}с</span>
		</div>
	</div>

	<div class="mt-2 border-t border-gray-700 pt-2">
		<span class="text-xs text-gray-400">По сложности</span>
		<div class="mt-1 grid grid-cols-3 gap-2 text-xs">
			<div>
				<span class="text-gray-500">Легкие</span>
				<div class="tabular-nums">
					{m.raven.byDifficulty.level1.correct}/{m.raven.byDifficulty.level1.total}
				</div>
			</div>
			<div>
				<span class="text-gray-500">Средние</span>
				<div class="tabular-nums">
					{m.raven.byDifficulty.level2.correct}/{m.raven.byDifficulty.level2.total}
				</div>
			</div>
			<div>
				<span class="text-gray-500">Сложные</span>
				<div class="tabular-nums">
					{m.raven.byDifficulty.level3.correct}/{m.raven.byDifficulty.level3.total}
				</div>
			</div>
		</div>
	</div>

	{#if Object.keys(m.raven.byTaskClass).length > 0}
		<div class="mt-2 border-t border-gray-700 pt-2">
			<span class="text-xs text-gray-400">По классу задач</span>
			<div class="mt-1 flex flex-col gap-0.5 text-xs">
				{#each Object.entries(m.raven.byTaskClass) as [tc, info]}
					<div class="flex items-center justify-between">
						<span class="text-gray-500">{info.label}</span>
						<span class="tabular-nums">{info.correct}/{info.total}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
```

> **Цветовое кодирование:**
> Raven рекомендуется выделить цветом **Violet / Indigo** (`text-violet-400`). Это соответствует требованию DESIGN.md о том, чтобы каждый тест имел свой отличный от остальных цвет заголовка карточки.

---

## 4. Типы данных

Ниже перечислены типы, которые необходимо ввести (или расширить) в результате интеграции.

### `RavenDifficultyBreakdown`

```ts
export type RavenDifficultyLevelMetrics = {
	correct: number;
	total: number;
	accuracy: number;
};

export type RavenDifficultyBreakdown = {
	level1: RavenDifficultyLevelMetrics;
	level2: RavenDifficultyLevelMetrics;
	level3: RavenDifficultyLevelMetrics;
};
```

### `RavenTaskClassBreakdown`

```ts
export type RavenTaskClassBreakdown = Record<
	string,
	{
		correct: number;
		total: number;
		label: string;
	}
>;
```

### `RavenMetrics`

```ts
export type RavenMetrics = {
	totalQuestions: number;
	correctCount: number;
	accuracy: number;
	averageResponseTimeMs: number;
	byDifficulty: RavenDifficultyBreakdown;
	byTaskClass: RavenTaskClassBreakdown;
};
```

### Обновление `ParticipantMetrics`

```ts
export type ParticipantMetrics = {
	// ... existing fields ...
	raven: RavenMetrics; // <-- добавить
	// ...
};
```

### Обновление `TestType`

```ts
export type TestType =
	// ... existing ...
	'ravenMatrices';
```

### Обновление `TestResultMap`

```ts
export type TestResultMap = {
	// ... existing ...
	ravenMatrices: import('$lib/exercises/raven-matrices/types').RavenFullResult;
};
```

---

## 5. Метрики в админке

Админская карточка Raven на странице деталей сессии (`/admin/gto/[id]`) должна отображать следующие данные:

### 5.1. Общие метрики

- **Количество ответов:** `correctCount / totalQuestions`
- **Точность:** `accuracy` (в процентах, с цветовой индикацией — зелёный ≥80%, жёлтый 50–79%, красный <50%)
- **Среднее время ответа:** `averageResponseTimeMs` (в секундах, `toFixed(2)`)

### 5.2. Распределение по сложности

Raven использует три уровня сложности (`DifficultyLevel = 1 | 2 | 3`). Для каждого уровня выводится:

- Количество правильных ответов / общее количество заданий этого уровня.

Пример строки:

```
Легкие:  5/6
Средние: 3/4
Сложные: 1/2
```

### 5.3. Распределение по классам задач

Каждое задание Raven принадлежит к одному из `TaskClass`. Необходимо сгруппировать попытки по `taskClass` и отобразить:

- **Название класса:** через `TASK_CLASS_LABELS`, например, `attribute_reasoning` → `Признаки`.
- **Результат:** `correct / total` для этого класса.

Пример:

```
Признаки:       3/3
Строки/столбцы: 2/4
Количество:     1/2
```

---

## 6. Что НЕ меняется

| Файл / модуль                                       | Почему не меняется                                                                                                                        |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `src/routes/(app)/gto/session/[id]/play/+server.ts` | Универсальный `POST`-обработчик уже делает `postResult(action.testType, ...)`, а контроллер результатов поддерживает `'ravenMatrices'`.   |
| `src/lib/server/db/models/exercises.ts`             | Таблица `ravenAttempt` уже существует со всеми необходимыми полями (`taskClass`, `difficultyLevel`, `isCorrect`, `responseTimeMs` и др.). |
| `src/lib/server/db/schema.ts`                       | Схема не требует миграций; FK `gto_session_id` в таблице `session` уже связывает Raven-сессии с GTO.                                      |
| `src/routes/(app)/admin/gto/[id]/+page.server.ts`   | Загрузка данных происходит через `getGtoSessionMetrics()`, достаточно добавить `raven` в возвращаемый объект из контроллера.              |
| `src/lib/exercises/raven-matrices/*`                | Исходный код exercise не трогаем; со стороны GTO мы только ссылаемся на его компоненты и типы.                                            |
| Порядок остальных тестов                            | `stroop`, `math`, `munsterberg`, `campimetry`, `memory`, `swallow` остаются на прежних местах. Raven вставляется строго после `swallow`.  |

---

## 7. Порядок реализации

Рекомендуется выполнять шаги последовательно:

1. **Типизация** – внести изменения в `src/lib/tests/types.ts` (раздел 3.1).
2. **Регистрация в `TEST_ORDER`** – добавить Raven в `tests[]` и `testLoaders` в `src/lib/tests/index.ts` (раздел 3.2).
3. **Серверная генерация заданий** – добавить ветку `ravenMatrices` в `play/+page.server.ts` (раздел 3.3).
4. **Клиентская интеграция** – убедиться, что `Playground.svelte` Raven корректно принимает пропсы `data`, `sendResults`, `gameEnd` (раздел 3.4). При необходимости — создать адаптер-обёртку.
5. **Метрики контроллера** – добавить типы и вычисления в `src/lib/server/db/controllers/gto.ts` (раздел 3.5).
6. **Карточка админки** – отрисовать блок Raven в `admin/gto/[id]/+page.svelte` (раздел 3.6).
7. **Верификация** – провести полный цикл тестирования (раздел 8).

---

## 8. Верификация

### 8.1. Статический анализ

После внесения типов и импортов запустить:

```bash
npm run check
```

Убедиться, что:

- `TestType` и `TestResultMap` не обрывают существующие type guards.
- `ParticipantMetrics` используется в `+page.svelte` админки без ошибок доступа к полю `raven`.

### 8.2. Функциональная проверка (dev-режим)

1. Создать новую сессию ГТО-М, добавить участника.
2. Пройти первые 6 шагов (или схитрить через `currentTestIndex` в базе).
3. Дойти до шага «Матрицы Равена».
    - Экран инструкции (`About.svelte`) должен загрузиться.
    - После нажатия «Начать» должен загрузиться `Playground.svelte`.
    - Задания должны быть сгенерированы и отображены.
4. Пройти задания (или пропустить/завершить).
5. Убедиться, что:
    - В таблицу `ravenAttempt` попали записи с `sessionId`, соответствующим сессии пользователя.
    - `currentTestIndex` увеличился.
    - После Raven начался этап слов (`/words`), если это был последний тест.

### 8.3. Проверка админки

1. Открыть детали сессии (`/admin/gto/[id]`).
2. Развернуть карточку участника.
3. Убедиться, что:
    - Появилась карточка «Матрицы Равена» с фиолетовым/индиговым заголовком.
    - Общие метрики (точность, среднее время) отображаются корректно.
    - Блоки «По сложности» и «По классу задач» заполнены (если участник уже прошёл Raven).
    - Если Raven ещё не пройден — карточка отображает нули/прочерки без ошибок интерфейса.

### 8.4. Линтинг

```bash
npm run lint
```

---

## 9. Потенциальные риски

| Риск                                                              | Вероятность | Митигация                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Playground.svelte` Raven принимает иные пропсы                   | Средняя     | Проверить сигнатуру пропсов; при необходимости создать тонкую обёртку-адаптер в `play/+page.svelte` или скорректировать `testLoaders`.                                                                                                    |
| `generateRavenTest({ count: 12 })` занимает слишком много времени | Низкая      | Включить вариативность count в настройки сессии или сделать предгенерацию асинхронной.                                                                                                                                                    |
| Дублирование `ravenAttempt` при повторном прохождении             | Низкая      | Проверить, не сбрасывается ли `currentTestIndex` назад; если да — результат сохранится под той же сессией, что может создать несколько записей. Логика `postResult` контроллера результатов должна обрабатывать уникальность `sessionId`. |

---

_Документ составлен на основе текущего состояния репозитория. При изменении контрактов `Playground.svelte` Raven или схемы `ravenAttempt` данный план следует пересмотреть._

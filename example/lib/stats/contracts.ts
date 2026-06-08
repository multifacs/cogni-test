/**
 * Каждый тест записывает в БД одну попытку (testAttempt) и набор ответов (testAnswer).
 * Структура поля "meta" зависит от типа теста - её описывают типы ниже.
 */

/** Slug теста — должен совпадать с ключом в testRegistry */
export type TestSlug =
	| 'attention'
	| 'memory1'
	| 'memory2'
	| 'flanker'
	| 'letter'
	| 'emoji';

/** Один ответ внутри попытки, который клиент отправляет на сервер */
export interface AttemptAnswerPayload {
	/** Идентификатор вопроса/стимула внутри теста ('1', 'stim-3', 'level-5'…) */
	questionId: string;
	/** То, что ответил пользователь (как строка для универсальности) */
	answer?: string;
	/** Правильно ли (null если вопрос не оценивается) */
	isCorrect?: boolean | null;
	/** Время реакции, мс */
	reactionTimeMs?: number;
	/** Тест-специфичные детали (тип стимула, исходное значение и т.п.) */
	meta?: Record<string, unknown>;
}

/** Полезная нагрузка POST /api/attempts */
export interface AttemptSubmitPayload {
	testSlug: TestSlug;
	/** Время старта теста на клиенте (ISO-строка) */
	startedAt: string;
	/** Сколько миллисекунд занял весь тест */
	durationMs: number;
	/** Правильных ответов */
	score: number;
	/** Сколько максимум можно было набрать */
	maxScore: number;
	/** 0..100 — нормализованная оценка для сравнения между тестами */
	normalizedScore?: number;
	/** Тест-специфичная сводка (см. типы ниже) */
	meta?:
		| AttentionMeta
		| Memory1Meta
		| NumberMemoryMeta
		| FlankerMeta
		| LetterCoverageMeta
		| EmojiTestMeta;
	answers: AttemptAnswerPayload[];
}

/* ───────────────────────────── meta попытки по тестам ───────────────────────────── */



export interface AttentionMeta {
	/** Общее число чисел на экране */
	n: number;
	/** Сколько нужно было найти */
	m: number;
	/** Сколько лишних кликов (на не-цели) — если игра позволяет */
	errors: number;
}

export interface Memory1Meta {
	/** ID вопросов, которые шли на оценку (recall) */
	recallQuestionIds: number[];
}

export interface NumberMemoryMeta {
	/** Самая длинная последовательность, повторённая без ошибки */
	digitSpan: number;
	/** Конфигурация уровней теста (count digits, mode) */
	levelConfigs: Array<{ level: number; count: number; mode: 'single' | 'mixed' }>;
}

export interface LetterCoverageMeta {
	/** Самая длинная корректно воспроизведённая последовательность букв */
	maxSpan: number;
	/** Сколько раундов было пройдено успешно (зачётных) */
	roundsCompleted: number;
	/** Сколько раундов всего было показано (включая раунд с ошибкой) */
	roundsAttempted: number;
	/** Закончился ли тест по таймауту, а не по ошибке */
	timeoutTriggered: boolean;
}

export interface FlankerMeta {
	/** Сколько испытаний пользователь успел пройти (может быть меньше плановых при таймауте) */
	trialsAttempted: number;
	/** Всего планировалось испытаний (TOTAL_TRIALS) */
	trialsPlanned: number;
	/** Истекло ли время (timeLimit) — оставшиеся trials не пройдены */
	timeoutTriggered: boolean;
	/** Средняя реакция на конгруэнтные испытания (все стрелки в одну сторону), мс */
	avgRtCongruentMs: number;
	/** Средняя реакция на неконгруэнтные испытания, мс */
	avgRtIncongruentMs: number;
	/** Эффект флэнкера = avgRtIncongruentMs - avgRtCongruentMs */
	flankerEffectMs: number;
	/** Ошибок всего */
	errors: number;
}

export interface EmojiTestMeta {
	/** Длительность теста в секундах (TEST_DURATION) */
	durationSeconds: number;
	/** Всего ответов пользователя за время теста */
	totalTrials: number;
	/** True positive: эмодзи реально сменилось, пользователь сказал "изменился" */
	hits: number;
	/** Miss: эмодзи сменилось, пользователь сказал "не изменился" */
	misses: number;
	/** False alarm: эмодзи не менялось, пользователь сказал "изменился" */
	falseAlarms: number;
	/** Correct rejection: эмодзи не менялось, пользователь сказал "не изменился" */
	correctRejections: number;
	/** Среднее время реакции на верные ответы, мс */
	avgReactionMs: number;
}


export interface AttemptCreatedResponse {
	attemptId: string;
}

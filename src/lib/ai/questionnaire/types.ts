/**
 * Типы анкеты «Взаимодействие с технологиями искусственного интеллекта».
 *
 * Ответы хранятся в БД как JSON-блоб (ai_survey.answers), парсинг — на границе
 * контроллера (fail-loud). Эти типы описывают и вопросы, и форму ответов.
 */

/** Идентификатор вопроса: 'q1'..'q38'. */
export type QuestionId = string;

/** Вариант «Другое (…)» с произвольным текстом респондента. */
export interface OtherOption {
	label: string;
}

/** Исключающий вариант «Ничего из этого» / «Ни в каких» и т.п. */
export interface NoneOption {
	label: string;
}

interface QuestionBase {
	id: QuestionId;
	/** Название блока анкеты (дословно из Анкета_ИИ.htm). */
	block: string;
	/** Текст вопроса (дословно из Анкета_ИИ.htm). */
	text: string;
	/** Все вопросы необязательные — пропуски разрешены. */
	required: false;
}

/** Radio + опциональное «Другое» с текстом. */
export interface SingleQuestion extends QuestionBase {
	type: 'single';
	options: string[];
	other?: OtherOption;
}

/** Checkbox + опциональные «Другое» и «Ничего из этого». */
export interface MultiQuestion extends QuestionBase {
	type: 'multi';
	options: string[];
	other?: OtherOption;
	none?: NoneOption;
}

/** Матрица: строки × шкала 1–5 + «Затрудняюсь ответить». */
export interface MatrixQuestion extends QuestionBase {
	type: 'matrix';
	rows: string[];
}

/** Открытый текстовый ответ. */
export interface OpenQuestion extends QuestionBase {
	type: 'open';
}

/** Числовой ответ (год рождения, количество детей и т.п.). */
export interface NumberQuestion extends QuestionBase {
	type: 'number';
}

/** Лестница 1–10 (восприятие качества жизни). */
export interface LadderQuestion extends QuestionBase {
	type: 'ladder';
	min: number;
	max: number;
}

export type AiSurveyQuestion =
	| SingleQuestion
	| MultiQuestion
	| MatrixQuestion
	| OpenQuestion
	| NumberQuestion
	| LadderQuestion;

/* ----------------------------- Форма ответов ----------------------------- */

/** Ответ на single-вопрос: выбранный вариант (+ текст для «Другое»). */
export interface SingleAnswer {
	choice: string;
	other?: string;
}

/** Ответ на multi-вопрос: выбранные варианты (+ текст для «Другое»). */
export interface MultiAnswer {
	choices: string[];
	other?: string;
}

/** Ответ на матрицу: строка → значение шкалы ('1'..'5' или 'Затрудняюсь ответить'). */
export type MatrixAnswer = Record<string, string>;

export type OpenAnswer = string;
export type NumberAnswer = number;
export type LadderAnswer = number;

export type AiSurveyAnswerValue =
	SingleAnswer | MultiAnswer | MatrixAnswer | OpenAnswer | NumberAnswer | LadderAnswer;

/** Ответы анкеты: QuestionId → значение. Сериализуются в ai_survey.answers. */
export type AiSurveyAnswers = Record<QuestionId, AiSurveyAnswerValue>;

/** Порог прохождения анкеты: percent >= AI_SURVEY_PASSED_PERCENT. */
export const AI_SURVEY_PASSED_PERCENT = 10;

/**
 * Ветвление и прогресс анкеты ИИ. Только чистые функции.
 *
 * ## Семантика ветвления Q6
 *
 * Q6 «Используете ли Вы технологии генеративного ИИ…» — фильтр:
 * - «да» (5 вариантов «Да…» и «Пробовал(а) всего несколько раз») → Q7 → Q9;
 *   Q8 пропускается (видимых вопросов: 37).
 * - «нет» («Нет, не использую») → Q8 → Q18; пропускаются Q7 и Q9–Q17
 *   (видимых вопросов: 28).
 * - «затрудняюсь» («Затрудняюсь ответить») → полный порядок, все 38 вопросов
 *   (включая Q7 и Q8).
 * - Q6 без ответа → показываются все вопросы, кроме Q7 и Q8 (они показываются
 *   только по явной ветке); видимых вопросов: 36.
 *
 * ## Прогресс
 *
 * `percent = floor(answered / visibleTotal * 100)`; анкета считается
 * пройденной при `percent >= AI_SURVEY_PASSED_PERCENT` (см. types.ts).
 * `answered` — число видимых вопросов с непустым ответом.
 */
import { AI_SURVEY_QUESTION_BY_ID, AI_SURVEY_QUESTION_ORDER } from './questions';
import type { AiSurveyAnswerValue, AiSurveyAnswers, AiSurveyQuestion, QuestionId } from './types';

/** Ветка, определяемая ответом на Q6. */
export type Q6Branch = 'yes' | 'no' | 'unsure' | 'unanswered';

/** Варианты Q6, ведущие в ветку «да». */
const Q6_YES_CHOICES = new Set([
	'Да, ежедневно',
	'Да, несколько раз в неделю',
	'Да, несколько раз в месяц',
	'Да, но реже раза в месяц',
	'Пробовал(а) всего несколько раз'
]);

const Q6_NO_CHOICE = 'Нет, не использую';
const Q6_UNSURE_CHOICE = 'Затрудняюсь ответить';

/** Вопросы, невидимые в ветке «нет» (Q7 и Q9–Q17). */
const HIDDEN_ON_NO: ReadonlySet<QuestionId> = new Set([
	'q7',
	'q9',
	'q10',
	'q11',
	'q12',
	'q13',
	'q14',
	'q15',
	'q16',
	'q17'
]);

/** Определить ветку по ответам анкеты. */
export function q6Branch(answers: AiSurveyAnswers): Q6Branch {
	const value = answers['q6'];
	if (value === undefined || value === null) {
		return 'unanswered';
	}
	const choice =
		typeof value === 'object' && value !== null && 'choice' in value ? value.choice : null;
	if (typeof choice !== 'string' || choice === '') {
		return 'unanswered';
	}
	if (Q6_YES_CHOICES.has(choice)) {
		return 'yes';
	}
	if (choice === Q6_NO_CHOICE) {
		return 'no';
	}
	if (choice === Q6_UNSURE_CHOICE) {
		return 'unsure';
	}
	return 'unanswered';
}

/**
 * Виден ли вопрос в данной ветке. Q7 показывается только в ветке «да»,
 * Q8 — только в ветке «нет», Q9–Q17 — только не в ветке «нет».
 */
export function isVisible(questionId: QuestionId, branch: Q6Branch): boolean {
	if (questionId === 'q7') {
		return branch === 'yes' || branch === 'unsure';
	}
	if (questionId === 'q8') {
		return branch === 'no' || branch === 'unsure';
	}
	if (HIDDEN_ON_NO.has(questionId)) {
		return branch !== 'no';
	}
	return true;
}

/** Следующий видимый вопрос после currentId в порядке q1..q38 (null — конец). */
export function nextQuestion(currentId: QuestionId, branch: Q6Branch): QuestionId | null {
	const index = AI_SURVEY_QUESTION_ORDER.indexOf(currentId);
	if (index === -1) {
		throw new Error(`Unknown question id: ${currentId}`);
	}
	for (let i = index + 1; i < AI_SURVEY_QUESTION_ORDER.length; i++) {
		const id = AI_SURVEY_QUESTION_ORDER[i];
		if (id !== undefined && isVisible(id, branch)) {
			return id;
		}
	}
	return null;
}

/** Видимые вопросы ветки, в порядке q1..q38. */
export function visibleQuestions(branch: Q6Branch): AiSurveyQuestion[] {
	return AI_SURVEY_QUESTION_ORDER.filter((id) => isVisible(id, branch))
		.map((id) => AI_SURVEY_QUESTION_BY_ID.get(id))
		.filter((q): q is AiSurveyQuestion => q !== undefined);
}

/** Число видимых вопросов ветки. */
export function visibleTotal(branch: Q6Branch): number {
	return visibleQuestions(branch).length;
}

/** Непустой ли ответ на вопрос данного типа. */
export function isAnswered(
	question: AiSurveyQuestion,
	value: AiSurveyAnswerValue | undefined
): boolean {
	if (value === undefined || value === null) {
		return false;
	}
	switch (question.type) {
		case 'single':
			return (
				typeof value === 'object' &&
				typeof (value as { choice?: unknown }).choice === 'string' &&
				(value as { choice: string }).choice !== ''
			);
		case 'multi':
			return (
				typeof value === 'object' &&
				Array.isArray((value as { choices?: unknown }).choices) &&
				((value as { choices: string[] }).choices.length > 0 ||
					typeof (value as { other?: unknown }).other === 'string')
			);
		case 'matrix':
			return (
				typeof value === 'object' &&
				Object.values(value).some((v) => typeof v === 'string' && v !== '')
			);
		case 'open':
			return typeof value === 'string' && value.trim() !== '';
		case 'number':
		case 'ladder':
			return typeof value === 'number' && Number.isFinite(value);
		default:
			return false;
	}
}

/** Результат расчета прогресса анкеты. */
export interface AiSurveyProgress {
	/** Число видимых вопросов с непустым ответом. */
	answered: number;
	/** Число видимых вопросов ветки. */
	visibleTotal: number;
	/** floor(answered / visibleTotal * 100). */
	percent: number;
}

/**
 * Посчитать прогресс по ответам анкеты (чистая функция без БД).
 * Знаменатель — видимые вопросы ветки, определяемой ответом на Q6.
 */
export function computeAiSurveyProgress(answers: AiSurveyAnswers): AiSurveyProgress {
	const branch = q6Branch(answers);
	const visible = visibleQuestions(branch);
	const answered = visible.filter((q) => isAnswered(q, answers[q.id])).length;
	const total = visible.length;
	const percent = total === 0 ? 0 : Math.floor((answered / total) * 100);
	return { answered, visibleTotal: total, percent };
}

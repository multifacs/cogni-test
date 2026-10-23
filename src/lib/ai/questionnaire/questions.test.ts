import { describe, expect, it } from 'vitest';
import {
	AI_SURVEY_INTRO,
	AI_SURVEY_QUESTION_BY_ID,
	AI_SURVEY_QUESTION_ORDER,
	AI_SURVEY_QUESTIONS,
	AI_SURVEY_TITLE
} from './questions';
import {
	computeAiSurveyProgress,
	isVisible,
	nextQuestion,
	q6Branch,
	visibleQuestions,
	visibleTotal
} from './branching';
import type { AiSurveyAnswers } from './types';

describe('AI survey questions data', () => {
	it('contains exactly 38 questions with unique ids q1..q38', () => {
		expect(AI_SURVEY_QUESTIONS).toHaveLength(38);
		expect(AI_SURVEY_QUESTION_ORDER).toEqual(Array.from({ length: 38 }, (_, i) => `q${i + 1}`));
		expect(new Set(AI_SURVEY_QUESTION_ORDER).size).toBe(38);
	});

	it('every question is optional (required: false) and has block + text + known type', () => {
		const knownTypes = new Set(['single', 'multi', 'matrix', 'open', 'number', 'ladder']);
		for (const q of AI_SURVEY_QUESTIONS) {
			expect(q.required).toBe(false);
			expect(q.block).not.toBe('');
			expect(q.text).not.toBe('');
			expect(knownTypes.has(q.type)).toBe(true);
			expect(AI_SURVEY_QUESTION_BY_ID.get(q.id)).toBe(q);
		}
	});

	it('is JSON-serializable without loss', () => {
		const restored = JSON.parse(JSON.stringify(AI_SURVEY_QUESTIONS));
		expect(restored).toEqual(AI_SURVEY_QUESTIONS);
	});

	it('has the respondent intro text', () => {
		expect(AI_SURVEY_TITLE).toContain(
			'Взаимодействие с технологиями искусственного интеллекта'
		);
		expect(AI_SURVEY_INTRO).toContain('анонимный характер');
		expect(AI_SURVEY_INTRO).toContain('10-15 минут');
	});

	it('matrix questions have full row sets (Q3: 8, Q18: 19, Q19: 11, Q20: 17)', () => {
		const rows = (id: string) => {
			const q = AI_SURVEY_QUESTION_BY_ID.get(id);
			if (!q || q.type !== 'matrix') {
				throw new Error(`${id} is not a matrix question`);
			}
			return q.rows;
		};
		expect(rows('q3')).toHaveLength(8);
		expect(rows('q18')).toHaveLength(19);
		expect(rows('q19')).toHaveLength(11);
		expect(rows('q20')).toHaveLength(17);
	});

	it('Q6 filter question has 7 verbatim options', () => {
		const q = AI_SURVEY_QUESTION_BY_ID.get('q6');
		expect(q?.type).toBe('single');
		if (q?.type === 'single') {
			expect(q.options).toEqual([
				'Да, ежедневно',
				'Да, несколько раз в неделю',
				'Да, несколько раз в месяц',
				'Да, но реже раза в месяц',
				'Пробовал(а) всего несколько раз',
				'Нет, не использую',
				'Затрудняюсь ответить'
			]);
		}
	});
});

describe('AI survey branching (Q6)', () => {
	it('classifies Q6 answers into branches', () => {
		const a = (choice?: string): AiSurveyAnswers =>
			choice === undefined ? {} : { q6: { choice } };
		expect(q6Branch(a('Да, ежедневно'))).toBe('yes');
		expect(q6Branch(a('Пробовал(а) всего несколько раз'))).toBe('yes');
		expect(q6Branch(a('Нет, не использую'))).toBe('no');
		expect(q6Branch(a('Затрудняюсь ответить'))).toBe('unsure');
		expect(q6Branch(a())).toBe('unanswered');
	});

	it('yes branch: Q7 visible, Q8 hidden, Q9+ visible (37 total)', () => {
		expect(isVisible('q7', 'yes')).toBe(true);
		expect(isVisible('q8', 'yes')).toBe(false);
		expect(isVisible('q9', 'yes')).toBe(true);
		expect(visibleTotal('yes')).toBe(37);
	});

	it('no branch: Q8 visible, Q7 and Q9–Q17 hidden (28 total)', () => {
		expect(isVisible('q8', 'no')).toBe(true);
		expect(isVisible('q7', 'no')).toBe(false);
		for (let i = 9; i <= 17; i++) {
			expect(isVisible(`q${i}`, 'no')).toBe(false);
		}
		expect(isVisible('q18', 'no')).toBe(true);
		expect(visibleTotal('no')).toBe(28);
	});

	it('unsure branch: full order, all 38 visible', () => {
		expect(visibleTotal('unsure')).toBe(38);
		expect(visibleQuestions('unsure').map((q) => q.id)).toEqual(AI_SURVEY_QUESTION_ORDER);
	});

	it('unanswered Q6: all except Q7 and Q8 (36 total)', () => {
		expect(isVisible('q7', 'unanswered')).toBe(false);
		expect(isVisible('q8', 'unanswered')).toBe(false);
		expect(isVisible('q9', 'unanswered')).toBe(true);
		expect(visibleTotal('unanswered')).toBe(36);
	});

	it('nextQuestion follows the yes branch: Q7 → Q9 (Q8 skipped)', () => {
		expect(nextQuestion('q6', 'yes')).toBe('q7');
		expect(nextQuestion('q7', 'yes')).toBe('q9');
		expect(nextQuestion('q5', 'yes')).toBe('q6');
	});

	it('nextQuestion follows the no branch: Q8 → Q18 (Q9–Q17 skipped)', () => {
		expect(nextQuestion('q6', 'no')).toBe('q8');
		expect(nextQuestion('q8', 'no')).toBe('q18');
		expect(nextQuestion('q17', 'no')).toBe('q18');
	});

	it('nextQuestion keeps full order on unsure', () => {
		expect(nextQuestion('q6', 'unsure')).toBe('q7');
		expect(nextQuestion('q7', 'unsure')).toBe('q8');
		expect(nextQuestion('q8', 'unsure')).toBe('q9');
	});

	it('nextQuestion returns null after the last question', () => {
		expect(nextQuestion('q38', 'yes')).toBeNull();
	});

	it('nextQuestion throws on unknown question id', () => {
		expect(() => nextQuestion('q99', 'yes')).toThrow();
	});
});

describe('AI survey progress thresholds', () => {
	const ans = (n: number, q6Choice: string): AiSurveyAnswers => {
		const answers: AiSurveyAnswers = { q6: { choice: q6Choice } };
		// Первые n вопросов (кроме q6) получают непустой ответ.
		let filled = 0;
		for (const id of AI_SURVEY_QUESTION_ORDER) {
			if (filled >= n) break;
			if (id === 'q6') continue;
			answers[id] = { choice: 'Да, ежедневно' };
			filled++;
		}
		return answers;
	};

	it('full order (unsure): 3/38 → 7% (not passed), 4/38 → 10% (passed)', () => {
		expect(computeAiSurveyProgress(ans(2, 'Затрудняюсь ответить'))).toEqual({
			answered: 3,
			visibleTotal: 38,
			percent: 7
		});
		expect(computeAiSurveyProgress(ans(3, 'Затрудняюсь ответить'))).toEqual({
			answered: 4,
			visibleTotal: 38,
			percent: 10
		});
	});

	it('no branch: 3/28 → 10% (passed)', () => {
		// q6 = «Нет» + 2 ответа среди первых видимых (q1, q2) = 3 ответа.
		const answers: AiSurveyAnswers = {
			q6: { choice: 'Нет, не использую' },
			q1: { choice: 'Несколько раз в день' },
			q2: { choice: 'Менее 1 часа' }
		};
		expect(computeAiSurveyProgress(answers)).toEqual({
			answered: 3,
			visibleTotal: 28,
			percent: 10
		});
	});

	it('yes branch: answers on hidden questions do not count', () => {
		const answers: AiSurveyAnswers = {
			q6: { choice: 'Да, ежедневно' },
			q1: { choice: 'Несколько раз в день' },
			// q8 скрыт в ветке «да» — не должен засчитаться
			q8: { choices: ['Не знаю, как воспользоваться'] }
		};
		const progress = computeAiSurveyProgress(answers);
		expect(progress).toEqual({ answered: 2, visibleTotal: 37, percent: 5 });
	});

	it('empty answers → 0%', () => {
		expect(computeAiSurveyProgress({})).toEqual({ answered: 0, visibleTotal: 36, percent: 0 });
	});

	it('matrix counts as answered when at least one row is filled', () => {
		const answers: AiSurveyAnswers = {
			q6: { choice: 'Затрудняюсь ответить' },
			q3: { 'Коммуникация: общение с друзьями, семьей, коллегами, групповые чаты': '5' }
		};
		expect(computeAiSurveyProgress(answers).answered).toBe(2);
	});

	it('blank open answer does not count', () => {
		const answers: AiSurveyAnswers = { q7: '   ' };
		expect(computeAiSurveyProgress(answers).answered).toBe(0);
	});
});

import { describe, it, expect } from 'vitest';
import { summarize } from './results-adapter';
import type { SimonResult } from './types';

/** Строит пробу с телом по умолчанию и переопределениями. */
function row(overrides: Partial<SimonResult> & { trialIndex: number; block: 1 | 2 | 3 }): SimonResult {
	return {
		color: 'red',
		position: 'left',
		congruency: 'congruent',
		isCorrect: true,
		responseTimeMs: 500,
		timedOut: false,
		...overrides
	};
}

describe('summarize', () => {
	it('all-timeout results: meanResponseMs null at every level', () => {
		const results: SimonResult[] = [
			row({ block: 1, trialIndex: 1, position: 'center', congruency: 'neutral', timedOut: true, isCorrect: false, responseTimeMs: 3000 }),
			row({ block: 2, trialIndex: 6, congruency: 'incongruent', timedOut: true, isCorrect: false, responseTimeMs: 3000 }),
			row({ block: 3, trialIndex: 16, congruency: 'congruent', timedOut: true, isCorrect: false, responseTimeMs: 3000 })
		];

		const s = summarize(results);
		expect(s.overall.meanResponseMs).toBeNull();
		expect(s.overall.timeouts).toBe(3);
		for (const b of s.blocks) {
			expect(b.meanResponseMs).toBeNull();
		}
		// Эффект неопределим: нет ни одной верной отвеченной пробы
		expect(s.effect.congruentMeanMs).toBeNull();
		expect(s.effect.incongruentMeanMs).toBeNull();
		expect(s.effect.effectMs).toBeNull();
	});

	it('all-incorrect answered results: effect null', () => {
		const results: SimonResult[] = [
			row({ block: 2, trialIndex: 6, congruency: 'congruent', isCorrect: false, responseTimeMs: 900 }),
			row({ block: 2, trialIndex: 7, congruency: 'incongruent', isCorrect: false, responseTimeMs: 1100 }),
			row({ block: 3, trialIndex: 16, congruency: 'congruent', isCorrect: false, responseTimeMs: 800 })
		];

		const s = summarize(results);
		// Отвеченные пробы есть — среднее по RT считается
		expect(s.overall.meanResponseMs).toBeCloseTo((900 + 1100 + 800) / 3);
		// Но эффект строится только по верным пробам — их нет
		expect(s.effect.effectMs).toBeNull();
		expect(s.effect.congruentMeanMs).toBeNull();
		expect(s.effect.incongruentMeanMs).toBeNull();
	});

	it('empty array: blocks [] and zeroed overall with effect null', () => {
		const s = summarize([]);
		expect(s.blocks).toEqual([]);
		expect(s.overall).toEqual({
			trials: 0,
			correct: 0,
			errors: 0,
			accuracy: 0,
			meanResponseMs: null,
			timeouts: 0
		});
		expect(s.effect.effectMs).toBeNull();
		expect(s.effectByBlock).toEqual({});
	});

	it('effectByBlock: block 1 null (neutral only), blocks 2 and 3 computed', () => {
		const results: SimonResult[] = [
			// Блок 1 — только neutral: эффекта быть не может
			row({ block: 1, trialIndex: 1, position: 'center', congruency: 'neutral' }),
			// Блок 2: congruent 400, incongruent 600 → эффект +200
			row({ block: 2, trialIndex: 6, congruency: 'congruent', responseTimeMs: 400 }),
			row({ block: 2, trialIndex: 7, congruency: 'incongruent', responseTimeMs: 600 }),
			// Блок 3: congruent 500, incongruent 450 → эффект −50
			row({ block: 3, trialIndex: 16, congruency: 'congruent', responseTimeMs: 500 }),
			row({ block: 3, trialIndex: 17, congruency: 'incongruent', responseTimeMs: 450 })
		];

		const s = summarize(results);
		expect(s.effectByBlock[1]?.congruentMeanMs).toBeNull();
		expect(s.effectByBlock[1]?.incongruentMeanMs).toBeNull();
		expect(s.effectByBlock[1]?.effectMs).toBeNull();

		expect(s.effectByBlock[2]?.congruentMeanMs).toBe(400);
		expect(s.effectByBlock[2]?.incongruentMeanMs).toBe(600);
		expect(s.effectByBlock[2]?.effectMs).toBe(200);

		expect(s.effectByBlock[3]?.congruentMeanMs).toBe(500);
		expect(s.effectByBlock[3]?.incongruentMeanMs).toBe(450);
		expect(s.effectByBlock[3]?.effectMs).toBe(-50);

		// Общий эффект — блоки 2–3 вместе: congruent (400+500)/2=450,
		// incongruent (600+450)/2=525 → +75
		expect(s.effect.congruentMeanMs).toBe(450);
		expect(s.effect.incongruentMeanMs).toBe(525);
		expect(s.effect.effectMs).toBe(75);
	});

	it('normal case: overall totals and accuracy', () => {
		const results: SimonResult[] = [
			row({ block: 1, trialIndex: 1, position: 'center', congruency: 'neutral' }),
			row({ block: 1, trialIndex: 2, position: 'center', congruency: 'neutral', color: 'blue', isCorrect: false, responseTimeMs: 1200 }),
			row({ block: 2, trialIndex: 6, congruency: 'incongruent', responseTimeMs: 800 })
		];

		const s = summarize(results);
		expect(s.overall.trials).toBe(3);
		expect(s.overall.correct).toBe(2);
		expect(s.overall.errors).toBe(1);
		expect(s.overall.accuracy).toBeCloseTo(2 / 3);
		expect(s.overall.meanResponseMs).toBe((500 + 1200 + 800) / 3);
		expect(s.overall.timeouts).toBe(0);
		// Блоки по возрастанию номера
		expect(s.blocks.map((b) => b.block)).toEqual([1, 2]);
		expect(s.blocks[0].trials).toBe(2);
		expect(s.blocks[1].trials).toBe(1);
	});
});

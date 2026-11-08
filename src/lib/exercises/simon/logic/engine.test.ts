import { describe, it, expect } from 'vitest';
import {
	BLOCK_DURATIONS_MS,
	FEEDBACK_MS,
	COLOR_TO_POSITION,
	buildMeta,
	createTrialSource,
	evaluateTrial,
	isSimonColor
} from './engine';
import type { SimonBlock, SimonTrial } from '../types';

// Детерминированный PRNG (mulberry32) для воспроизводимых тестов —
// тот же, что в corsi-block/logic/engine.test.ts.
function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Подсчёт вхождений по ключу-функции (балансовые проверки). */
function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const item of items) {
		const k = key(item);
		counts[k] = (counts[k] ?? 0) + 1;
	}
	return counts;
}

/** Собирает заданное число проб каждого блока последовательно, как UI. */
function collect(seed: number, counts: Record<SimonBlock, number>): SimonTrial[] {
	const source = createTrialSource(mulberry32(seed));
	return ([1, 2, 3] as SimonBlock[]).flatMap((block) =>
		Array.from({ length: counts[block] }, () => source.next(block))
	);
}

/** 10 / 20 / 20 проб — достаточно, чтобы покрыть несколько мешков каждого блока. */
const COUNTS: Record<SimonBlock, number> = { 1: 10, 2: 20, 3: 20 };

describe('константы расписания', () => {
	it('части идут по 10 / 30 / 60 секунд, фидбек короткий', () => {
		expect(BLOCK_DURATIONS_MS).toEqual({ 1: 10_000, 2: 30_000, 3: 60_000 });
		expect(FEEDBACK_MS).toBe(200);
	});
});

describe('createTrialSource: инварианты блоков', () => {
	it('часть 1: только red/blue 5/5, позиция center, конгруэнтность neutral', () => {
		for (let seed = 1; seed <= 20; seed++) {
			const block1 = collect(seed, COUNTS).filter((t) => t.block === 1);
			expect(block1).toHaveLength(COUNTS[1]);
			const colors = countBy(block1, (t) => t.color);
			expect(colors['red']).toBe(5);
			expect(colors['blue']).toBe(5);
			for (const trial of block1) {
				expect(['red', 'blue']).toContain(trial.color);
				expect(trial.position).toBe('center');
				expect(trial.congruency).toBe('neutral');
			}
		}
	});

	it('часть 2: red/blue 10/10, конгруэнтность 10/10, только left/right', () => {
		for (let seed = 1; seed <= 20; seed++) {
			const block2 = collect(seed, COUNTS).filter((t) => t.block === 2);
			expect(block2).toHaveLength(COUNTS[2]);
			const colors = countBy(block2, (t) => t.color);
			expect(colors['red']).toBe(10);
			expect(colors['blue']).toBe(10);
			const congruency = countBy(block2, (t) => t.congruency);
			expect(congruency['congruent']).toBe(10);
			expect(congruency['incongruent']).toBe(10);
			for (const trial of block2) {
				expect(['red', 'blue']).toContain(trial.color);
				expect(['left', 'right']).toContain(trial.position);
			}
		}
	});

	it('часть 3: каждый цвет 5 раз, конгруэнтность 10/10, без center', () => {
		for (let seed = 1; seed <= 20; seed++) {
			const block3 = collect(seed, COUNTS).filter((t) => t.block === 3);
			expect(block3).toHaveLength(COUNTS[3]);
			const colors = countBy(block3, (t) => t.color);
			expect(colors['red']).toBe(5);
			expect(colors['blue']).toBe(5);
			expect(colors['green']).toBe(5);
			expect(colors['yellow']).toBe(5);
			const congruency = countBy(block3, (t) => t.congruency);
			expect(congruency['congruent']).toBe(10);
			expect(congruency['incongruent']).toBe(10);
			for (const trial of block3) {
				expect(trial.position).not.toBe('center');
				expect(['left', 'right', 'up', 'down']).toContain(trial.position);
			}
		}
	});

	it('конгруэнтность корректна: congruent ⟺ position === COLOR_TO_POSITION[color]', () => {
		for (let seed = 1; seed <= 20; seed++) {
			for (const trial of collect(seed, COUNTS)) {
				if (trial.block === 1) {
					expect(trial.congruency).toBe('neutral');
					continue;
				}
				expect(trial.congruency === 'congruent').toBe(
					trial.position === COLOR_TO_POSITION[trial.color]
				);
			}
		}
	});

	it('позиция center только в части 1; green/yellow только в части 3', () => {
		for (let seed = 1; seed <= 20; seed++) {
			for (const trial of collect(seed, COUNTS)) {
				expect(trial.position === 'center').toBe(trial.block === 1);
				if (trial.block === 1) {
					expect(['red', 'blue']).toContain(trial.color);
				}
				if (trial.block !== 3) {
					expect(['red', 'blue']).toContain(trial.color);
				}
			}
		}
	});
});

describe('createTrialSource: детерминизм', () => {
	it('один и тот же сид даёт идентичную последовательность', () => {
		expect(collect(99, COUNTS)).toEqual(collect(99, COUNTS));
	});

	it('разные сиды дают разные последовательности', () => {
		const sessions = [1, 2, 3, 4, 5].map((seed) => collect(seed, COUNTS));
		const distinct = new Set(sessions.map((s) => JSON.stringify(s)));
		expect(distinct.size).toBeGreaterThan(1);
	});

	it('источник продолжает выдавать пробы после исчерпания мешка', () => {
		const source = createTrialSource(mulberry32(7));
		// Мешок части 3 — 4 пробы; 9 запросов гарантированно переживают 2 пополнения.
		const trials = Array.from({ length: 9 }, () => source.next(3));
		expect(trials).toHaveLength(9);
		expect(new Set(trials.map((t) => t.color))).toEqual(
			new Set(['red', 'blue', 'green', 'yellow'])
		);
	});
});

describe('evaluateTrial', () => {
	const trial: SimonTrial = {
		block: 3,
		color: 'green',
		position: 'up',
		congruency: 'congruent'
	};

	it('верный ответ: isCorrect true, время и индекс пробрасываются как есть', () => {
		const result = evaluateTrial(trial, 'green', 850, 16);
		expect(result.isCorrect).toBe(true);
		expect(result.timedOut).toBe(false);
		expect(result.responseTimeMs).toBe(850);
		expect(result.trialIndex).toBe(16);
		expect(result.block).toBe(3);
		expect(result.color).toBe('green');
		expect(result.position).toBe('up');
		expect(result.congruency).toBe('congruent');
	});

	it('неверный ответ: isCorrect false, timedOut false', () => {
		const result = evaluateTrial(trial, 'red', 1200, 1);
		expect(result.isCorrect).toBe(false);
		expect(result.timedOut).toBe(false);
		expect(result.responseTimeMs).toBe(1200);
		expect(result.trialIndex).toBe(1);
	});

	it('fail-loud guard: отрицательное/NaN время или невалидный индекс — throw', () => {
		expect(() => evaluateTrial(trial, 'green', -1, 1)).toThrow();
		expect(() => evaluateTrial(trial, 'green', Number.NaN, 1)).toThrow();
		expect(() => evaluateTrial(trial, 'green', Number.POSITIVE_INFINITY, 1)).toThrow();
		expect(() => evaluateTrial(trial, 'green', 0, 0)).toThrow();
		expect(() => evaluateTrial(trial, 'green', 0, 1.5)).toThrow();
		expect(() => evaluateTrial(trial, 'green', 0, Number.NaN)).toThrow();
		// Границы легальны.
		expect(() => evaluateTrial(trial, 'green', 0, 1)).not.toThrow();
	});
});

describe('buildMeta', () => {
	it('возвращает длительности частей в мс', () => {
		expect(buildMeta()).toEqual({
			blockDurationsMs: '10000+30000+60000'
		});
	});
});

describe('isSimonColor', () => {
	it('принимает валидные цвета и отклоняет всё остальное', () => {
		for (const color of ['red', 'blue', 'green', 'yellow']) {
			expect(isSimonColor(color)).toBe(true);
		}
		expect(isSimonColor('purple')).toBe(false);
		expect(isSimonColor('')).toBe(false);
		expect(isSimonColor(42)).toBe(false);
		expect(isSimonColor(null)).toBe(false);
		expect(isSimonColor(undefined)).toBe(false);
	});
});

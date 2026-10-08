import { describe, expect, it } from 'vitest';
import type { OrigamiDifficulty, Piece, Pt } from '../types';
import { lineFromHV, polyArea } from './geometry';
import { applyFold, generateOrigamiTask, materializeLine, punctureHoles } from './engine';

const SQUARE: Pt[] = [
	{ x: 0, y: 0 },
	{ x: 100, y: 0 },
	{ x: 100, y: 100 },
	{ x: 0, y: 100 }
];

const DIFFICULTIES: OrigamiDifficulty[] = ['simple', 'medium', 'hard'];

function seeds(count: number): string[] {
	return Array.from({ length: count }, (_, i) => `origami-test-${i + 1}`);
}

function sortedHoles(holes: Pt[]): Pt[] {
	return holes.slice().sort((a, b) => a.x - b.x || a.y - b.y);
}

function expectHolesEqual(actual: Pt[], expected: Pt[]): void {
	expect(actual.length).toBe(expected.length);
	const a = sortedHoles(actual);
	const b = sortedHoles(expected);
	for (let i = 0; i < a.length; i += 1) {
		expect(a[i].x).toBeCloseTo(b[i].x, 6);
		expect(a[i].y).toBeCloseTo(b[i].y, 6);
	}
}

describe('generateOrigamiTask: детерминизм и структура', () => {
	it('одинаковый seed → идентичные задачи', () => {
		for (const difficulty of DIFFICULTIES) {
			for (const seed of seeds(5)) {
				const first = generateOrigamiTask({ seed, difficulty, taskIndex: 3 });
				const second = generateOrigamiTask({ seed, difficulty, taskIndex: 3 });
				expect(second).toEqual(first);
			}
		}
	});

	it('разные seed → разные задачи', () => {
		const a = generateOrigamiTask({ seed: 'seed-alpha', difficulty: 'medium' });
		const b = generateOrigamiTask({ seed: 'seed-beta', difficulty: 'medium' });
		expect(a).not.toEqual(b);
	});

	it('структура steps по сложности: прокол между сгибами только на hard', () => {
		const expected: Record<OrigamiDifficulty, string[]> = {
			simple: ['sheet', 'fold', 'puncture'],
			medium: ['sheet', 'fold', 'fold', 'puncture'],
			hard: ['sheet', 'fold', 'puncture', 'fold']
		};
		for (const difficulty of DIFFICULTIES) {
			for (const seed of seeds(3)) {
				const task = generateOrigamiTask({ seed, difficulty });
				expect(task.steps.map((s) => s.kind)).toEqual(expected[difficulty]);
				expect(task.folds.length).toBe(
					expected[difficulty].filter((k) => k === 'fold').length
				);
			}
		}
	});

	it('опции уникальны, дистракторы отличаются от correct, correctIndex корректен', () => {
		for (const difficulty of DIFFICULTIES) {
			for (const seed of seeds(8)) {
				const task = generateOrigamiTask({ seed, difficulty });
				expect(task.options.length).toBe(4);
				expect(task.correctIndex).toBeGreaterThanOrEqual(0);
				expect(task.correctIndex).toBeLessThan(task.options.length);
				const keys = task.options.map((o) => JSON.stringify(sortedHoles(o.holes)));
				expect(new Set(keys).size).toBe(task.options.length);
				const correctKey = keys[task.correctIndex];
				for (let i = 0; i < keys.length; i += 1) {
					if (i !== task.correctIndex) expect(keys[i]).not.toBe(correctKey);
				}
			}
		}
	});

	it('дырки всех опций лежат на листе [0, 100] × [0, 100]', () => {
		for (const difficulty of DIFFICULTIES) {
			for (const seed of seeds(5)) {
				const task = generateOrigamiTask({ seed, difficulty });
				for (const option of task.options) {
					expect(option.holes.length).toBeGreaterThan(0);
					for (const hole of option.holes) {
						expect(hole.x).toBeGreaterThanOrEqual(-1e-6);
						expect(hole.x).toBeLessThanOrEqual(100 + 1e-6);
						expect(hole.y).toBeGreaterThanOrEqual(-1e-6);
						expect(hole.y).toBeLessThanOrEqual(100 + 1e-6);
					}
				}
			}
		}
	});

	it('суммарная площадь слоёв сохраняется на каждом шаге', () => {
		for (const difficulty of DIFFICULTIES) {
			for (const seed of seeds(5)) {
				const task = generateOrigamiTask({ seed, difficulty });
				for (const step of task.steps) {
					const total = step.pieces.reduce((acc, piece) => acc + polyArea(piece.poly), 0);
					expect(total).toBeCloseTo(10000, 6);
				}
			}
		}
	});

	it('дырки воспроизводятся из puncture-шага: punctureHoles(pieces, dot) = correct option', () => {
		for (const difficulty of DIFFICULTIES) {
			for (const seed of seeds(8)) {
				const task = generateOrigamiTask({ seed, difficulty });
				const punctureStep = task.steps.find((s) => s.kind === 'puncture');
				expect(punctureStep).toBeDefined();
				// На hard после прокола есть ещё сгиб — но дырки уже в координатах листа и не двигаются.
				const holes = punctureHoles(punctureStep!.pieces, punctureStep!.dots[0]);
				expectHolesEqual(holes, task.options[task.correctIndex].holes);
			}
		}
	});
});

describe('applyFold', () => {
	it('сохраняет суммарную площадь слоёв', () => {
		const lines = [
			lineFromHV('v', 50),
			lineFromHV('h', 30),
			lineFromHV('h', 70),
			materializeLine({ kind: 'diag', corner: 'tl' }),
			materializeLine({ kind: 'diag', corner: 'tr' }),
			materializeLine({ kind: 'free', angle: Math.PI / 3, offset: 50 })
		];
		let pieces: Piece[] = [
			{ poly: SQUARE.map((p) => ({ ...p })), toSheet: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } }
		];
		const before = pieces.reduce((acc, p) => acc + polyArea(p.poly), 0);
		for (const line of lines) {
			pieces = applyFold(pieces, line).pieces;
			const after = pieces.reduce((acc, p) => acc + polyArea(p.poly), 0);
			expect(after).toBeCloseTo(before, 6);
		}
	});

	it('сгиб пополам даёт два слоя с зеркальными матрицами', () => {
		const { pieces, movedPolys } = applyFold(
			[{ poly: SQUARE, toSheet: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } }],
			lineFromHV('v', 50)
		);
		expect(pieces.length).toBe(2);
		expect(movedPolys.length).toBe(1);
		// При v=50 на столе остаётся правая половина: оба слоя накрывают x ∈ [50, 100].
		expect(puncturesAt(pieces, { x: 75, y: 40 }).length).toBe(2);
		expect(punctureHoles(pieces, { x: 25, y: 40 })).toEqual([]);
	});

	function puncturesAt(pieces: Piece[], p: Pt): Pt[] {
		return punctureHoles(pieces, p);
	}

	it('кусок целиком на одной стороне не делится', () => {
		const piece: Piece = {
			poly: [
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
				{ x: 10, y: 10 },
				{ x: 0, y: 10 }
			],
			toSheet: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }
		};
		const { pieces, movedPolys } = applyFold([piece], lineFromHV('v', 50));
		expect(pieces.length).toBe(1);
		expect(movedPolys.length).toBe(0);
		expect(polyArea(pieces[0].poly)).toBeCloseTo(100, 6);
	});
});

describe('punctureHoles', () => {
	it('прокол вне всех кусков — дырок нет', () => {
		const pieces: Piece[] = [{ poly: SQUARE, toSheet: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } }];
		expect(punctureHoles(pieces, { x: 200, y: 200 })).toEqual([]);
		expect(punctureHoles(pieces, { x: -5, y: 50 })).toEqual([]);
	});

	it('N слоёв → N дырок в координатах листа', () => {
		const identity = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
		const shifted = { a: 1, b: 0, c: 0, d: 1, e: 50, f: 0 };
		const threeLayers: Piece[] = [
			{ poly: SQUARE.map((p) => ({ ...p })), toSheet: identity },
			{ poly: SQUARE.map((p) => ({ ...p })), toSheet: identity },
			{ poly: SQUARE.map((p) => ({ ...p })), toSheet: shifted }
		];
		const holes = punctureHoles(threeLayers, { x: 25, y: 25 });
		expect(holes.length).toBe(3);
		expectHolesEqual(holes, [
			{ x: 25, y: 25 },
			{ x: 25, y: 25 },
			{ x: 75, y: 25 }
		]);
	});

	it('hard: прокол между сгибами — дырки не меняются вторым сгибом', () => {
		// Ручной сценарий: сгиб x=50 (на столе остаётся правая половина),
		// прокол (75,25), затем сгиб y=50 (остаётся нижняя половина).
		const identity = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
		let pieces: Piece[] = [{ poly: SQUARE.map((p) => ({ ...p })), toSheet: identity }];
		pieces = applyFold(pieces, lineFromHV('v', 50)).pieces;
		const holesAfterFirstFold = punctureHoles(pieces, { x: 75, y: 25 });
		expectHolesEqual(holesAfterFirstFold, [
			{ x: 75, y: 25 },
			{ x: 25, y: 25 }
		]);
		pieces = applyFold(pieces, lineFromHV('h', 50)).pieces;
		// Дырки первого прокола зафиксированы в координатах листа — движок их не пересчитывает.
		// Тот же стол-регион после второго сгиба: 4 слоя — по дырке на каждый,
		// все внутри листа [0, 100] × [0, 100].
		const holesAfterSecondFold = punctureHoles(pieces, { x: 75, y: 75 });
		expectHolesEqual(holesAfterSecondFold, [
			{ x: 75, y: 75 },
			{ x: 75, y: 25 },
			{ x: 25, y: 75 },
			{ x: 25, y: 25 }
		]);
	});
});

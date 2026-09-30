import { describe, it, expect, assert } from 'vitest';
import {
	TIME_MEMORIZE_MS,
	TIME_WAIT_MS,
	TIME_RESPOND_MS,
	HIT_WINDOW,
	EDGE_MARGIN,
	DOTS_PER_STAGE,
	STAGES,
	randomPosition,
	isHit,
	normalizeTap,
	createRoundState,
	evaluateRound,
	nextRound,
	buildMeta,
	distance
} from './engine';
import type { RoundState } from './engine';

// Детерминированный PRNG (mulberry32) для воспроизводимых тестов.
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

describe('constants', () => {
	it('each phase lasts 3000 ms: memorize, wait, respond', () => {
		expect(TIME_MEMORIZE_MS).toBe(3000);
		expect(TIME_WAIT_MS).toBe(3000);
		expect(TIME_RESPOND_MS).toBe(3000);
	});

	it('edge margin covers hit window so the tolerance circle is never clipped', () => {
		expect(EDGE_MARGIN).toBeGreaterThanOrEqual(HIT_WINDOW);
	});

	it('game is 3 stages x DOTS_PER_STAGE rounds', () => {
		expect(STAGES).toHaveLength(3);
		expect(STAGES.map((s) => s.grid)).toEqual([5, 3, 0]);
		expect(DOTS_PER_STAGE).toBe(3);
	});
});

describe('randomPosition', () => {
	it('always stays within edge margin bounds over 1000 runs', () => {
		const rng = mulberry32(42);
		for (let i = 0; i < 1000; i++) {
			const p = randomPosition(rng);
			expect(p.x).toBeGreaterThanOrEqual(EDGE_MARGIN);
			expect(p.x).toBeLessThanOrEqual(1 - EDGE_MARGIN);
			expect(p.y).toBeGreaterThanOrEqual(EDGE_MARGIN);
			expect(p.y).toBeLessThanOrEqual(1 - EDGE_MARGIN);
		}
	});

	it('is deterministic for a seeded rng', () => {
		expect(randomPosition(mulberry32(7))).toEqual(randomPosition(mulberry32(7)));
	});
});

describe('isHit', () => {
	const target = { x: 0.5, y: 0.5 };
	const eps = 1e-9;

	it('accepts a tap exactly on the window boundary', () => {
		const tap = { x: target.x + HIT_WINDOW, y: target.y };
		expect(distance(target, tap)).toBeCloseTo(HIT_WINDOW, 12);
		expect(isHit(target, tap)).toBe(true);
	});

	it('accepts a tap just inside the window', () => {
		const tap = { x: target.x + HIT_WINDOW - eps, y: target.y };
		expect(isHit(target, tap)).toBe(true);
	});

	it('rejects a tap just outside the window', () => {
		const tap = { x: target.x + HIT_WINDOW + eps, y: target.y };
		expect(isHit(target, tap)).toBe(false);
	});

	it('accepts the exact position of the dot', () => {
		expect(isHit(target, { ...target })).toBe(true);
	});
});

describe('normalizeTap', () => {
	it('maps a tap on a square panel to relative units', () => {
		const tap = normalizeTap({ width: 400, height: 400 }, 210, 130, 10, 10);
		expect(tap.x).toBeCloseTo(0.5, 12);
		expect(tap.y).toBeCloseTo(0.3, 12);
	});

	it('is invariant to non-square panels: same geometry, same relative distance', () => {
		const dot = { x: 0.5, y: 0.5 };
		// Квадратная панель и вытянутая панель с тем же меньшим размером:
		// центр поля, тап на 30px вправо и 40px вниз от центра.
		const square = normalizeTap({ width: 300, height: 300 }, 210, 220, 30, 30);
		const wide = normalizeTap({ width: 600, height: 300 }, 210, 220, 30, 30);
		const dSquare = distance(dot, square);
		const dWide = distance(dot, wide);
		expect(dSquare).toBeCloseTo(dWide, 12);
		// 30px и 40px на minSide=300 → гипотенуза 50/300
		expect(dSquare).toBeCloseTo(50 / 300, 12);
	});

	it('uses the smaller side for both axes on a tall panel', () => {
		const tap = normalizeTap({ width: 300, height: 900 }, 180, 330, 30, 30);
		expect(tap.x).toBeCloseTo(0.5, 12);
		expect(tap.y).toBeCloseTo(1, 12);
	});
});

/** Состояние, переведённое в фазу ответа (тап валиден только в respond). */
function toRespond(state: RoundState): RoundState {
	return { ...state, phase: 'respond' };
}

describe('evaluateRound', () => {
	it('timeout (no tap): correct=false, reactionMs=TIME_RESPOND_MS, distance=null', () => {
		const state = toRespond(createRoundState(mulberry32(1)));
		const result = evaluateRound(state, null, 1234);
		expect(result).toEqual({
			attempt: 1,
			stage: 1,
			reactionMs: TIME_RESPOND_MS,
			correct: false,
			distance: null
		});
	});

	it('ignores reactionMs on timeout and uses TIME_RESPOND_MS', () => {
		const state = toRespond(createRoundState(mulberry32(1)));
		expect(evaluateRound(state, null, 0).reactionMs).toBe(TIME_RESPOND_MS);
	});

	it('records reactionMs and distance for a tap', () => {
		const state = toRespond({
			...createRoundState(mulberry32(1)),
			position: { x: 0.5, y: 0.5 }
		});
		const result = evaluateRound(state, { x: 0.55, y: 0.5 }, 850);
		expect(result.reactionMs).toBe(850);
		expect(result.correct).toBe(true); // 0.05 <= 0.1
		expect(result.distance).toBeCloseTo(0.05, 12);
	});

	it('throws when tapping during memorize phase', () => {
		const state = createRoundState(mulberry32(1));
		expect(state.phase).toBe('memorize');
		assert.throws(() => evaluateRound(state, { x: 0.5, y: 0.5 }, 100), /respond phase/);
	});

	it('throws when tapping during wait phase (no premature taps)', () => {
		const state: RoundState = {
			...createRoundState(mulberry32(1)),
			phase: 'wait'
		};
		expect(state.phase).toBe('wait');
		assert.throws(() => evaluateRound(state, { x: 0.5, y: 0.5 }, 100), /respond phase/);
	});

	it('throws when evaluated after the game is finished', () => {
		const rng = mulberry32(3);
		let state = createRoundState(rng);
		for (let i = 0; i < 9; i++) {
			state = nextRound(state, evaluateRound(toRespond(state), null, 100), rng);
		}
		expect(state.phase).toBe('finished');
		assert.throws(() => evaluateRound(state, null, 100), /respond phase/);
		assert.throws(() => evaluateRound(state, { x: 0.5, y: 0.5 }, 100), /respond phase/);
	});
});

describe('nextRound — full run of the state machine', () => {
	it('plays 9 rounds across 3 stages and accumulates counters', () => {
		const rng = mulberry32(2026);
		let state = createRoundState(rng);
		expect(state.attempt).toBe(1);
		expect(state.stage).toBe(1);
		expect(state.phase).toBe('memorize');

		const seen: Array<{ attempt: number; stage: number }> = [];
		for (let i = 0; i < 9; i++) {
			seen.push({ attempt: state.attempt, stage: state.stage });
			// Чётные раунды — точное попадание, нечётные — таймаут.
			const outcome = evaluateRound(
				toRespond(state),
				state.attempt % 2 === 0 ? { ...state.position } : null,
				500
			);
			state = nextRound(state, outcome, rng);
		}

		// Сквозная нумерация и этапы 1/1/1/2/2/2/3/3/3.
		expect(seen.map((r) => r.attempt)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
		expect(seen.map((r) => r.stage)).toEqual([1, 1, 1, 2, 2, 2, 3, 3, 3]);

		// 4 попадания (раунды 2,4,6,8) и 5 ошибок (таймауты).
		expect(state.correctCount).toBe(4);
		expect(state.errorCount).toBe(5);
		expect(state.phase).toBe('finished');
	});

	it('is finished and frozen after the 9th round', () => {
		const rng = mulberry32(9);
		let state = createRoundState(rng);
		for (let i = 0; i < 12; i++) {
			state = nextRound(state, evaluateRound(toRespond(state), null, 100), rng);
		}
		expect(state.phase).toBe('finished');
		expect(state.attempt).toBe(9);
		expect(state.correctCount).toBe(0);
		expect(state.errorCount).toBe(9);
	});

	it('tracks roundInStage within each stage', () => {
		const rng = mulberry32(11);
		let state = createRoundState(rng);
		const roundsInStage: number[] = [state.roundInStage];
		for (let i = 0; i < 8; i++) {
			state = nextRound(
				state,
				evaluateRound(toRespond(state), { ...state.position }, 100),
				rng
			);
			roundsInStage.push(state.roundInStage);
		}
		expect(roundsInStage).toEqual([1, 2, 3, 1, 2, 3, 1, 2, 3]);
	});
});

describe('buildMeta', () => {
	it('returns dotsPerStage and windowSize as strings', () => {
		expect(buildMeta()).toEqual({ dotsPerStage: '3', windowSize: '0.1' });
	});
});

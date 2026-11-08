import { describe, it, expect } from 'vitest';
import {
	BOARD_SQUARES,
	TOTAL_ROUNDS,
	START_SEQUENCE_LENGTH,
	NO_REPEAT_MAX_LENGTH,
	ANSWER_TIMEOUT_MS,
	SQUARE_SIZE,
	BOARD_PADDING,
	MIN_GAP,
	generateBoard,
	generateSequence,
	createGameState,
	evaluateRound,
	nextRound,
	buildMeta,
	distance
} from './engine';
import type { RoundState, CorsiPhase } from './engine';

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

/** Состояние в recall-фазе для проверки evaluateRound. */
function recallState(state: RoundState): RoundState {
	return { ...state, phase: 'recall' };
}

/** Клик-кнопка для outcome: верный ответ или первый индекс неверного. */
function correctClicks(state: RoundState): number[] {
	return [...state.sequence];
}

describe('generateBoard', () => {
	it('places exactly BOARD_SQUARES squares within [BOARD_PADDING, 1 - BOARD_PADDING]', () => {
		const board = generateBoard(mulberry32(42));
		expect(board).toHaveLength(BOARD_SQUARES);
		for (const p of board) {
			expect(p.x).toBeGreaterThanOrEqual(BOARD_PADDING);
			expect(p.x).toBeLessThanOrEqual(1 - BOARD_PADDING);
			expect(p.y).toBeGreaterThanOrEqual(BOARD_PADDING);
			expect(p.y).toBeLessThanOrEqual(1 - BOARD_PADDING);
		}
	});

	it('keeps every pairwise center distance >= SQUARE_SIZE + MIN_GAP', () => {
		const board = generateBoard(mulberry32(7));
		for (let i = 0; i < board.length; i++) {
			for (let j = i + 1; j < board.length; j++) {
				expect(distance(board[i], board[j])).toBeGreaterThanOrEqual(SQUARE_SIZE + MIN_GAP);
			}
		}
	});

	it('holds the invariants across many seeds (rejection sampling is stable)', () => {
		for (let seed = 1; seed <= 50; seed++) {
			const board = generateBoard(mulberry32(seed));
			expect(board).toHaveLength(BOARD_SQUARES);
			for (let i = 0; i < board.length; i++) {
				expect(board[i].x).toBeGreaterThanOrEqual(BOARD_PADDING);
				expect(board[i].x).toBeLessThanOrEqual(1 - BOARD_PADDING);
				expect(board[i].y).toBeGreaterThanOrEqual(BOARD_PADDING);
				expect(board[i].y).toBeLessThanOrEqual(1 - BOARD_PADDING);
				for (let j = i + 1; j < board.length; j++) {
					expect(distance(board[i], board[j])).toBeGreaterThanOrEqual(
						SQUARE_SIZE + MIN_GAP
					);
				}
			}
		}
	});

	it('is deterministic for the same rng seed', () => {
		expect(generateBoard(mulberry32(99))).toEqual(generateBoard(mulberry32(99)));
	});

	it('varies across different seeds', () => {
		const boards = [1, 2, 3, 4, 5].map((seed) => generateBoard(mulberry32(seed)));
		const distinct = new Set(boards.map((b) => JSON.stringify(b)));
		expect(distinct.size).toBeGreaterThan(1);
	});
});

describe('generateSequence', () => {
	it('lengths 3..NO_REPEAT_MAX_LENGTH produce distinct in-range indices', () => {
		for (let length = 3; length <= NO_REPEAT_MAX_LENGTH; length++) {
			for (let seed = 1; seed <= 20; seed++) {
				const sequence = generateSequence(mulberry32(seed * 100 + length), length);
				expect(sequence).toHaveLength(length);
				for (const index of sequence) {
					expect(index).toBeGreaterThanOrEqual(0);
					expect(index).toBeLessThan(BOARD_SQUARES);
				}
				expect(new Set(sequence).size).toBe(length);
			}
		}
	});

	it('lengths above NO_REPEAT_MAX_LENGTH allow repeats but never consecutive ones', () => {
		for (let length = NO_REPEAT_MAX_LENGTH + 1; length <= 11; length++) {
			for (let seed = 1; seed <= 20; seed++) {
				const sequence = generateSequence(mulberry32(seed * 100 + length), length);
				expect(sequence).toHaveLength(length);
				for (let i = 0; i < sequence.length; i++) {
					expect(sequence[i]).toBeGreaterThanOrEqual(0);
					expect(sequence[i]).toBeLessThan(BOARD_SQUARES);
					if (i > 0) {
						expect(sequence[i]).not.toBe(sequence[i - 1]);
					}
				}
			}
		}
	});

	it('throws on length < 1 (fail-fast guard)', () => {
		expect(() => generateSequence(mulberry32(1), 0)).toThrow();
		expect(() => generateSequence(mulberry32(1), -3)).toThrow();
	});
});

describe('evaluateRound', () => {
	it('marks exact match in order as correct', () => {
		const state = recallState(createGameState(mulberry32(5)));
		const result = evaluateRound(state, [...state.sequence], 4200);
		expect(result.isCorrect).toBe(true);
		expect(result.attempt).toBe(state.attempt);
		expect(result.sequenceLength).toBe(state.sequenceLength);
		expect(result.answerMs).toBe(4200);
	});

	it('marks wrong order as incorrect', () => {
		const state = recallState(createGameState(mulberry32(5)));
		const reversed = [...state.sequence].reverse();
		// Перестановка-палиндром не информативна: добиваемся реального иного порядка.
		const clicks = reversed.every((v, i) => v === state.sequence[i])
			? [state.sequence[1], state.sequence[0], ...state.sequence.slice(2)]
			: reversed;
		const result = evaluateRound(state, clicks, 1000);
		expect(result.isCorrect).toBe(false);
	});

	it('marks too short and too long click lists as incorrect', () => {
		const state = recallState(createGameState(mulberry32(5)));
		expect(
			evaluateRound(state, state.sequence.slice(0, state.sequence.length - 1), 500).isCorrect
		).toBe(false);
		expect(evaluateRound(state, [...state.sequence, 0], 500).isCorrect).toBe(false);
	});

	it('throws outside the recall phase (fail-fast guard)', () => {
		const state = createGameState(mulberry32(5));
		const phases: CorsiPhase[] = ['intro', 'presentation', 'feedback', 'finished'];
		for (const phase of phases) {
			expect(() => evaluateRound({ ...state, phase }, [], 100)).toThrow();
		}
	});
});

describe('nextRound', () => {
	it('grows sequence length by 1 after a correct answer', () => {
		const state = recallState(createGameState(mulberry32(11)));
		const outcome = evaluateRound(state, correctClicks(state), 3000);
		const next = nextRound(state, outcome, mulberry32(12));
		expect(next.sequenceLength).toBe(state.sequenceLength + 1);
		expect(next.attempt).toBe(state.attempt + 1);
		expect(next.phase).toBe('presentation');
		expect(next.correctCount).toBe(1);
		expect(next.errorCount).toBe(0);
	});

	it('keeps the same length but a NEW random sequence after a wrong answer', () => {
		const state = recallState(createGameState(mulberry32(11)));
		const outcome = evaluateRound(state, [], ANSWER_TIMEOUT_MS);
		const rngSeed = 77;
		const next = nextRound(state, outcome, mulberry32(rngSeed));
		expect(next.sequenceLength).toBe(state.sequenceLength);
		expect(next.attempt).toBe(state.attempt + 1);
		expect(next.correctCount).toBe(0);
		expect(next.errorCount).toBe(1);
		// Детерминированная проверка «новизны»: nextRound расходует rng только
		// на generateSequence, поэтому последовательность обязана совпасть с
		// generateSequence на том же свежем сиде — и отличаться от старой.
		expect(next.sequence).toEqual(generateSequence(mulberry32(rngSeed), state.sequenceLength));
		expect(next.sequence).not.toEqual(state.sequence);
	});

	it('preserves the board between rounds', () => {
		const state = recallState(createGameState(mulberry32(11)));
		const outcome = evaluateRound(state, correctClicks(state), 1000);
		const next = nextRound(state, outcome, mulberry32(12));
		expect(next.board).toBe(state.board);
	});

	it('finishes after TOTAL_ROUNDS attempts', () => {
		let state = createGameState(mulberry32(3));
		for (let i = 0; i < TOTAL_ROUNDS; i++) {
			const recall = recallState(state);
			const outcome = evaluateRound(recall, correctClicks(recall), 1000);
			state = nextRound(recall, outcome, mulberry32(100 + i));
		}
		expect(state.phase).toBe('finished');
		expect(state.attempt).toBe(TOTAL_ROUNDS);
		expect(state.correctCount).toBe(TOTAL_ROUNDS);
		expect(state.errorCount).toBe(0);
	});

	it('is idempotent once finished', () => {
		let state = createGameState(mulberry32(3));
		const recall = recallState(state);
		const outcome = evaluateRound(recall, [], ANSWER_TIMEOUT_MS);
		state = nextRound(recall, outcome, mulberry32(1));
		for (let i = 0; i < TOTAL_ROUNDS - 1; i++) {
			const r = recallState(state);
			state = nextRound(r, evaluateRound(r, [], ANSWER_TIMEOUT_MS), mulberry32(2 + i));
		}
		expect(state.phase).toBe('finished');
		const frozen = nextRound(
			state,
			{ attempt: TOTAL_ROUNDS, sequenceLength: 3, isCorrect: true, answerMs: 1 },
			mulberry32(9)
		);
		expect(frozen).toBe(state);
	});

	it('reaches lengths 3..11 across 9 correct rounds in a row', () => {
		let state = createGameState(mulberry32(3));
		const seenLengths: number[] = [state.sequenceLength];
		for (let i = 0; i < TOTAL_ROUNDS; i++) {
			const recall = recallState(state);
			const outcome = evaluateRound(recall, correctClicks(recall), 2000);
			state = nextRound(recall, outcome, mulberry32(200 + i));
			if (state.phase !== 'finished') seenLengths.push(state.sequenceLength);
		}
		expect(seenLengths).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11]);
	});

	it('does not grow length on errors in alternating correct/wrong rounds', () => {
		let state = createGameState(mulberry32(3));
		const lengths: number[] = [state.sequenceLength];
		for (let i = 0; i < TOTAL_ROUNDS - 1; i++) {
			const recall = recallState(state);
			// Чередуем: чётный шаг — верный ответ, нечётный — ошибка (пустые клики).
			const clicks = i % 2 === 0 ? correctClicks(recall) : [];
			const outcome = evaluateRound(recall, clicks, 1000);
			state = nextRound(recall, outcome, mulberry32(300 + i));
			if (state.phase !== 'finished') lengths.push(state.sequenceLength);
		}
		// Верно → +1, ошибка → без роста: длина пляшет вокруг 3..4, никогда не растёт на ошибке.
		for (let i = 1; i < lengths.length; i++) {
			const grew = lengths[i] - lengths[i - 1];
			expect(grew).toBeLessThanOrEqual(1);
			// Шаг i-1: чётный → верный ответ (рост +1), нечётный → ошибка (рост 0).
			if ((i - 1) % 2 === 0) expect(grew).toBe(1);
			else expect(grew).toBe(0);
		}
	});
});

describe('createGameState', () => {
	it('starts at attempt 1, intro phase, start length, zero counters', () => {
		const state = createGameState(mulberry32(21));
		expect(state.attempt).toBe(1);
		expect(state.sequenceLength).toBe(START_SEQUENCE_LENGTH);
		expect(state.phase).toBe('intro');
		expect(state.board).toHaveLength(BOARD_SQUARES);
		expect(state.sequence).toHaveLength(START_SEQUENCE_LENGTH);
		expect(state.correctCount).toBe(0);
		expect(state.errorCount).toBe(0);
	});
});

describe('buildMeta', () => {
	it('returns string metadata about the exercise', () => {
		expect(buildMeta()).toEqual({
			rounds: String(TOTAL_ROUNDS),
			startLength: String(START_SEQUENCE_LENGTH),
			answerTimeoutMs: String(ANSWER_TIMEOUT_MS)
		});
	});
});

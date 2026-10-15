import { describe, expect, it } from 'vitest';
import type { NumericStroopTask } from '../types';
import { NumericStroopGame } from './numeric-stroop-game';

const TRIALS = 1000;

function bigSide(task: NumericStroopTask): 'left' | 'right' {
	return task.left.size === 'big' ? 'left' : 'right';
}

describe('NumericStroopGame task generation', () => {
	it('keeps congruency distribution near 50/50', () => {
		const game = new NumericStroopGame();
		let congruentCount = 0;

		for (let i = 0; i < TRIALS; i++) {
			if (game.getCurrentTask().congruent) congruentCount++;
			game.handleAnswer('left');
		}

		const ratio = congruentCount / TRIALS;
		expect(ratio).toBeGreaterThanOrEqual(0.4);
		expect(ratio).toBeLessThanOrEqual(0.6);
	});

	it('uses digit values in 1..9 with distinct sides', () => {
		const game = new NumericStroopGame();

		for (let i = 0; i < TRIALS; i++) {
			const { left, right } = game.getCurrentTask();
			expect(left.value).toBeGreaterThanOrEqual(1);
			expect(left.value).toBeLessThanOrEqual(9);
			expect(right.value).toBeGreaterThanOrEqual(1);
			expect(right.value).toBeLessThanOrEqual(9);
			expect(left.value).not.toBe(right.value);
			game.handleAnswer('right');
		}
	});

	it('always renders exactly one side with size "big"', () => {
		const game = new NumericStroopGame();

		for (let i = 0; i < TRIALS; i++) {
			const { left, right } = game.getCurrentTask();
			expect([left.size, right.size].sort().join(',')).toBe('big,small');
			game.handleAnswer('left');
		}
	});

	it('sets correctAnswer to the side with size "big"', () => {
		const game = new NumericStroopGame();

		for (let i = 0; i < TRIALS; i++) {
			const task = game.getCurrentTask();
			expect(task.correctAnswer).toBe(bigSide(task));
			game.handleAnswer('left');
		}
	});

	it('keeps congruent flag consistent with the big-side value', () => {
		const game = new NumericStroopGame();

		for (let i = 0; i < TRIALS; i++) {
			const task = game.getCurrentTask();
			const bigValue = bigSide(task) === 'left' ? task.left.value : task.right.value;
			const smallValue = bigSide(task) === 'left' ? task.right.value : task.left.value;
			expect(task.congruent).toBe(bigValue > smallValue);
			game.handleAnswer('right');
		}
	});

	it('never repeats the same task twice in a row', () => {
		const game = new NumericStroopGame();
		let previous = game.getCurrentTask();

		for (let i = 0; i < TRIALS; i++) {
			game.handleAnswer('left');
			const current = game.getCurrentTask();
			const same =
				current.left.value === previous.left.value &&
				current.right.value === previous.right.value &&
				current.correctAnswer === previous.correctAnswer;
			expect(same).toBe(false);
			previous = current;
		}
	});
});

describe('NumericStroopGame answers', () => {
	it('records results with correct isCorrect, time and attempt counter', () => {
		const game = new NumericStroopGame();

		for (let i = 0; i < 10; i++) {
			game.startNextTask();
			const task = game.getCurrentTask();
			game.handleAnswer(task.correctAnswer);
		}

		const results = game.getResults();
		expect(results).toHaveLength(10);
		results.forEach((result, i) => {
			expect(result.attempt).toBe(i);
			expect(result.isCorrect).toBe(true);
			expect(result.userAnswer).toBe(result.correctAnswer);
			expect(result.time).toBeGreaterThanOrEqual(0);
		});
	});

	it('marks wrong answers as incorrect', () => {
		const game = new NumericStroopGame();
		game.startNextTask();
		const task = game.getCurrentTask();
		const wrongAnswer: 'left' | 'right' = task.correctAnswer === 'left' ? 'right' : 'left';

		game.handleAnswer(wrongAnswer);

		const [result] = game.getResults();
		expect(result.isCorrect).toBe(false);
		expect(result.userAnswer).toBe(wrongAnswer);
	});
});

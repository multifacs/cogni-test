import { describe, expect, it } from 'vitest';
import type { NumericStroopTask, Side } from '../types';
import { RULE_BY_BACKGROUND } from '../types';
import { NumericStroopGame } from './numeric-stroop-game';

const TRIALS = 1000;

function bigSide(task: NumericStroopTask): Side {
	return task.left.size === 'big' ? 'left' : 'right';
}

function bigValueSide(task: NumericStroopTask): Side {
	return task.left.value > task.right.value ? 'left' : 'right';
}

function expectedAnswer(task: NumericStroopTask): Side {
	return RULE_BY_BACKGROUND[task.background] === 'size' ? bigSide(task) : bigValueSide(task);
}

function findGreenIncongruent(game: NumericStroopGame): NumericStroopTask {
	for (let i = 0; i < TRIALS; i++) {
		const task = game.getCurrentTask();
		if (task.background === 'green' && bigValueSide(task) !== bigSide(task)) {
			return task;
		}
		game.handleAnswer('left');
	}
	throw new Error('No green incongruent task generated');
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

	it('keeps background (rule) distribution near 50/50', () => {
		const game = new NumericStroopGame();
		let yellowCount = 0;
		let greenCount = 0;

		for (let i = 0; i < TRIALS; i++) {
			const { background } = game.getCurrentTask();
			if (background === 'yellow') yellowCount++;
			else greenCount++;
			game.handleAnswer('left');
		}

		expect(yellowCount / TRIALS).toBeGreaterThanOrEqual(0.4);
		expect(yellowCount / TRIALS).toBeLessThanOrEqual(0.6);
		expect(greenCount / TRIALS).toBeGreaterThanOrEqual(0.4);
		expect(greenCount / TRIALS).toBeLessThanOrEqual(0.6);
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

	it('asks by font size on yellow and by value on green', () => {
		const game = new NumericStroopGame();
		let yellowSeen = 0;
		let greenSeen = 0;

		for (let i = 0; i < TRIALS; i++) {
			const task = game.getCurrentTask();

			if (task.background === 'yellow') {
				yellowSeen++;
				expect(task.correctAnswer).toBe(bigSide(task));
			} else {
				greenSeen++;
				expect(task.correctAnswer).toBe(bigValueSide(task));
			}
			expect(task.correctAnswer).toBe(expectedAnswer(task));
			game.handleAnswer('left');
		}

		expect(yellowSeen).toBeGreaterThan(0);
		expect(greenSeen).toBeGreaterThan(0);
	});

	it('keeps congruent flag consistent with the big-side value regardless of rule', () => {
		const game = new NumericStroopGame();

		for (let i = 0; i < TRIALS; i++) {
			const task = game.getCurrentTask();
			const bigValue = task.left.size === 'big' ? task.left.value : task.right.value;
			const smallValue = task.left.size === 'big' ? task.right.value : task.left.value;
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
				current.background === previous.background &&
				current.left.value === previous.left.value &&
				current.right.value === previous.right.value &&
				current.correctAnswer === previous.correctAnswer;
			expect(same).toBe(false);
			previous = current;
		}
	});
});

describe('NumericStroopGame answers', () => {
	it('records results with correct isCorrect, background, time and attempt counter', () => {
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
			expect(['yellow', 'green']).toContain(result.background);
			expect(result.time).toBeGreaterThanOrEqual(0);
		});
	});

	it('marks wrong answers as incorrect', () => {
		const game = new NumericStroopGame();
		game.startNextTask();
		const task = game.getCurrentTask();
		const wrongAnswer: Side = task.correctAnswer === 'left' ? 'right' : 'left';

		game.handleAnswer(wrongAnswer);

		const [result] = game.getResults();
		expect(result.isCorrect).toBe(false);
		expect(result.userAnswer).toBe(wrongAnswer);
	});

	it('judges green tasks by value, not by font size', () => {
		// Green + incongruent: the big font sits on the smaller value.
		const correctGame = new NumericStroopGame();
		const correctTask = findGreenIncongruent(correctGame);
		correctGame.startNextTask();
		correctGame.handleAnswer(bigValueSide(correctTask));
		expect(correctGame.getResults().at(-1)?.isCorrect).toBe(true);

		const wrongGame = new NumericStroopGame();
		const wrongTask = findGreenIncongruent(wrongGame);
		wrongGame.startNextTask();
		wrongGame.handleAnswer(bigSide(wrongTask));
		expect(wrongGame.getResults().at(-1)?.isCorrect).toBe(false);
	});
});

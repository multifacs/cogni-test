import { render, cleanup } from 'vitest-browser-svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Playground from './Playground.svelte';
import { page } from 'vitest/browser';
import type { NumericStroopResult, NumericStroopTask, Side } from './types';

// app.css подключает Tailwind — без него утилиты кнопок
// не сгенерируются в тестовом окружении (инцидент campimetry)
import '../../../app.css';

/**
 * Детерминированный стаб NumericStroopGame: выдаёт задачи по кругу
 * и записывает ответы с isCorrect по correctAnswer (сторона крупного шрифта).
 */
class StubGame {
	private tasks: NumericStroopTask[];
	private index = 0;
	private results: NumericStroopResult[] = [];

	constructor(tasks: NumericStroopTask[]) {
		this.tasks = tasks;
	}

	getCurrentTask(): NumericStroopTask {
		return this.tasks[this.index % this.tasks.length];
	}

	startNextTask(): void {}

	handleAnswer(answer: Side): void {
		const task = this.getCurrentTask();
		this.results.push({
			attempt: this.results.length,
			time: 100,
			leftValue: task.left.value,
			rightValue: task.right.value,
			congruent: task.congruent,
			correctAnswer: task.correctAnswer,
			userAnswer: answer,
			isCorrect: answer === task.correctAnswer
		});
		this.index++;
	}

	getResults(): NumericStroopResult[] {
		return this.results;
	}
}

// Неконгруэнтная пара: крупный шрифт (big) у МЕНЬШЕГО значения
const incongruentTask: NumericStroopTask = {
	left: { value: 2, size: 'big' },
	right: { value: 7, size: 'small' },
	correctAnswer: 'left', // сторона с big-шрифтом
	congruent: false
};

const otherTask: NumericStroopTask = {
	left: { value: 9, size: 'small' },
	right: { value: 4, size: 'big' },
	correctAnswer: 'right',
	congruent: false
};

// Короткая длительность: игра завершается на третьем тике интервала
// (~3 с реального времени) — реального 60-секундного ожидания нет,
// при этом на клики остаётся ~2,9 с запаса.
const SHORT_DURATION_MS = 2500;

async function mountPlayground(tasks: NumericStroopTask[], durationMs = SHORT_DURATION_MS) {
	const game = new StubGame(tasks);
	const gameEnd = vi.fn();
	const sendResults = vi.fn();
	const mounted = await render(Playground, {
		props: { gameEnd, sendResults, game, durationMs }
	});
	return { ...mounted, game, gameEnd, sendResults };
}

function getNumbers(container: HTMLElement): HTMLElement[] {
	return Array.from(container.querySelectorAll('.number'));
}

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe('Playground — числовой Струп', () => {
	it('клик по «Слева» записывает ответ и показывает новую пару', async () => {
		const { container, game, sendResults, gameEnd } = await mountPlayground([
			incongruentTask,
			otherTask
		]);

		let numbers = getNumbers(container);
		expect(numbers[0].textContent).toBe('2');
		expect(numbers[1].textContent).toBe('7');

		await page.getByRole('button', { name: 'Слева' }).click();

		// После ответа сразу появляется новая пара
		numbers = getNumbers(container);
		expect(numbers[0].textContent).toBe('9');
		expect(numbers[1].textContent).toBe('4');

		await vi.waitFor(
			() => {
				expect(sendResults).toHaveBeenCalledTimes(1);
			},
			{ timeout: 8000 }
		);

		expect(gameEnd).toHaveBeenCalledTimes(1);
		const results = sendResults.mock.calls[0][0] as NumericStroopResult[];
		expect(results).toHaveLength(1);
		expect(results[0].userAnswer).toBe('left');
		expect(results[0].correctAnswer).toBe('left');
		expect(game.getResults()).toEqual(results);
	});

	it('isCorrect считается по размеру шрифта, а не по значению числа', async () => {
		// Неконгруэнтная пара: слева 2 (big), справа 7 (small).
		// Клик по «Слева» — верно, хотя значение 2 < 7.
		const first = await mountPlayground([incongruentTask]);
		await page.getByRole('button', { name: 'Слева' }).click();
		await vi.waitFor(
			() => {
				expect(first.sendResults).toHaveBeenCalledTimes(1);
			},
			{ timeout: 8000 }
		);
		let results = first.sendResults.mock.calls[0][0] as NumericStroopResult[];
		expect(results[0].isCorrect).toBe(true);

		// Обратная проверка: клик по «Справа» (значение больше, шрифт меньше) — неверно
		cleanup();
		const second = await mountPlayground([incongruentTask]);
		await page.getByRole('button', { name: 'Справа' }).click();
		await vi.waitFor(
			() => {
				expect(second.sendResults).toHaveBeenCalledTimes(1);
			},
			{ timeout: 8000 }
		);
		results = second.sendResults.mock.calls[0][0] as NumericStroopResult[];
		expect(results[0].isCorrect).toBe(false);
		expect(results[0].userAnswer).toBe('right');
	});

	it('конец таймера: gameEnd вызывается раньше sendResults с полными результатами', async () => {
		const { gameEnd, sendResults } = await mountPlayground([incongruentTask, otherTask]);

		await page.getByRole('button', { name: 'Слева' }).click();
		await page.getByRole('button', { name: 'Справа' }).click();

		await vi.waitFor(
			() => {
				expect(sendResults).toHaveBeenCalledTimes(1);
			},
			{ timeout: 8000 }
		);

		expect(gameEnd).toHaveBeenCalledTimes(1);
		// Порядок контракта: gameEnd() → sendResults() в одном тике
		expect(gameEnd.mock.invocationCallOrder[0]).toBeLessThan(
			sendResults.mock.invocationCallOrder[0]
		);

		const results = sendResults.mock.calls[0][0] as NumericStroopResult[];
		expect(results).toHaveLength(2);
		expect(results.map((r) => r.userAnswer)).toEqual(['left', 'right']);
	});
});

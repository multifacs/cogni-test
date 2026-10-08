import { page, userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import '../../../../app.css';
import RotationGame from './RotationGame.svelte';
import type { RotationAnswerRow } from '../types';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(what: string, predicate: () => boolean, timeoutMs = 5000) {
	const start = performance.now();
	while (performance.now() - start < timeoutMs) {
		if (predicate()) return;
		await sleep(25);
	}
	throw new Error(`Timed out waiting for: ${what}`);
}

function counterText(): string {
	return (
		document.querySelector<HTMLElement>('[data-testid="rotation-counter"]')?.textContent ?? ''
	);
}

function makeProps() {
	const gameEnd = vi.fn();
	const sendResults = vi.fn();
	const rows = () => sendResults.mock.calls[0]?.[0] as RotationAnswerRow[];
	return { gameEnd, sendResults, rows };
}

describe('RotationGame', () => {
	it('click-through: 9 кликов, полные строки результатов, gameEnd в конце', async () => {
		const props = makeProps();
		const { unmount } = await render(RotationGame, {
			gameEnd: props.gameEnd,
			sendResults: props.sendResults,
			taskMs: 5000
		});

		// Клик строго после переключения задания: между кликами есть 400 мс блокировки,
		// ждём счётчик следующего задания — клик никогда не попадает в залоченный кадр.
		for (let task = 1; task <= 9; task++) {
			await waitFor(`task ${task} rendered`, () => counterText() === `Задание ${task}/9`);
			await userEvent.click(page.getByTestId('rotation-option-0'));
		}

		await waitFor('game end', () => props.gameEnd.mock.calls.length > 0, 10000);

		expect(props.gameEnd).toHaveBeenCalledTimes(1);
		expect(props.sendResults).toHaveBeenCalledTimes(1);

		const rows = props.rows();
		expect(rows).toHaveLength(9);
		expect(rows.map((row) => row.taskIndex)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
		for (const row of rows) {
			expect(typeof row.isCorrect).toBe('boolean');
			expect(row.responseTimeMs).toBeGreaterThan(0);
			expect([0, 1, 2, 3]).toContain(row.correctIndex);
			expect([0, 1, 2, 3]).toContain(row.selectedIndex);
			expect(row.timedOut).toBe(false);
			expect([1, 2, 3]).toContain(row.difficultyLevel);
		}

		unmount();
	}, 60000);

	it('timeout: без кликов все 9 заданий уходят в таймаут', async () => {
		const props = makeProps();
		const { unmount } = await render(RotationGame, {
			gameEnd: props.gameEnd,
			sendResults: props.sendResults,
			taskMs: 400
		});

		// 9 заданий × 400 мс ≈ 4 с; ждём с запасом.
		await waitFor('game end', () => props.gameEnd.mock.calls.length > 0, 20000);

		expect(props.gameEnd).toHaveBeenCalledTimes(1);
		expect(props.sendResults).toHaveBeenCalledTimes(1);

		const rows = props.rows();
		expect(rows).toHaveLength(9);
		expect(rows.map((row) => row.taskIndex)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
		for (const row of rows) {
			expect(row.selectedIndex).toBeNull();
			expect(row.timedOut).toBe(true);
			expect(row.isCorrect).toBe(false);
			expect(row.responseTimeMs).toBeGreaterThanOrEqual(0);
			expect([0, 1, 2, 3]).toContain(row.correctIndex);
		}

		unmount();
	}, 45000);

	it('mixed session: answered task then timed-out task', async () => {
		const props = makeProps();
		const { unmount } = await render(RotationGame, {
			gameEnd: props.gameEnd,
			sendResults: props.sendResults,
			taskMs: 600
		});

		// Task 1: answer immediately with a click.
		await waitFor('task 1 rendered', () => counterText() === 'Задание 1/9');
		await userEvent.click(page.getByTestId('rotation-option-0'));

		// Task 2: no click — let it time out. The rest of the tasks also time out.
		await waitFor('task 2 rendered', () => counterText() === 'Задание 2/9');
		await waitFor('game end', () => props.gameEnd.mock.calls.length > 0, 20000);

		expect(props.gameEnd).toHaveBeenCalledTimes(1);
		expect(props.sendResults).toHaveBeenCalledTimes(1);

		const rows = props.rows();
		expect(rows).toHaveLength(9);
		expect(rows.map((row) => row.taskIndex)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);

		// Answered task must never be recorded as timed out (guards M1).
		expect(rows[0].timedOut).toBe(false);
		expect(rows[0].selectedIndex).toBe(0);
		// Timed-out task: null answer, incorrect.
		expect(rows[1].timedOut).toBe(true);
		expect(rows[1].selectedIndex).toBeNull();
		expect(rows[1].isCorrect).toBe(false);

		unmount();
	}, 45000);
});

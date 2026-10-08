import { page, userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import OrigamiStage from './OrigamiStage.svelte';
import '../../../../app.css';
import type { OrigamiStep, Pt } from '../types';

/** Быстрый автоплей: 3 шага укладываются в ~120 мс. */
const STEP_MS = 40;

const IDENTITY = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const SQUARE: Pt[] = [
	{ x: 0, y: 0 },
	{ x: 100, y: 0 },
	{ x: 100, y: 100 },
	{ x: 0, y: 100 }
];

/** Собираем 3 шага (sheet → fold → puncture) с различимым числом точек прокола. */
function makeSteps(dotsOnPuncture: number): OrigamiStep[] {
	return [
		{ kind: 'sheet', pieces: [{ poly: SQUARE, toSheet: IDENTITY }], dots: [] },
		{
			kind: 'fold',
			pieces: [{ poly: SQUARE, toSheet: IDENTITY }],
			crease: { a: 1, b: 0, c: -50 },
			movedPolys: [],
			dots: []
		},
		{
			kind: 'puncture',
			pieces: [{ poly: SQUARE, toSheet: IDENTITY }],
			dots: Array.from({ length: dotsOnPuncture }, (_, i) => ({ x: 40 + i * 10, y: 50 }))
		}
	];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function counter(): HTMLElement | null {
	return document.querySelector<HTMLElement>('.tabular-nums');
}

function dotsRendered(): number {
	return document.querySelectorAll('svg circle').length;
}

async function waitFor(what: string, predicate: () => boolean, timeoutMs = 5000) {
	const start = performance.now();
	while (performance.now() - start < timeoutMs) {
		if (predicate()) return;
		await sleep(25);
	}
	throw new Error(`Timed out waiting for: ${what}`);
}

/** Ждёт ровно заданный текст счётчика шагов («1 / 3»). */
async function waitForCounter(text: string, timeoutMs = 5000) {
	await waitFor(`counter "${text}"`, () => counter()?.textContent === text, timeoutMs);
}

describe('OrigamiStage — смена массива steps (задание 2+)', () => {
	it('перезапускает воспроизведение при замене steps новым массивом той же длины', async () => {
		const onfinished = vi.fn();
		const stepsA = makeSteps(1);
		const stepsB = makeSteps(2);

		const { rerender } = await render(OrigamiStage, {
			steps: stepsA,
			stepMs: STEP_MS,
			onfinished
		});

		// Задание 1 доиграло до конца
		await waitForCounter('3 / 3');
		await waitFor(
			'onfinished (первое воспроизведение)',
			() => onfinished.mock.calls.length >= 1
		);
		expect(onfinished).toHaveBeenCalledTimes(1);
		expect(dotsRendered()).toBe(1);

		// Смена задания: НОВЫЙ массив ТОЙ ЖЕ ДЛИНЫ 3 — ключевой кейс бага
		await rerender({ steps: stepsB });

		// Счётчик сбросился на первый шаг
		await waitForCounter('1 / 3');
		// Автоплей проигрывает задание 2 и завершается повторно
		await waitFor(
			'onfinished (второе воспроизведение)',
			() => onfinished.mock.calls.length >= 2
		);
		await waitForCounter('3 / 3');
		// Отрисован именно последний шаг массива B (2 точки прокола, не 1)
		expect(dotsRendered()).toBe(2);
	}, 15000);

	it('кнопка «Повторить» после смены steps перезапускает с первого шага', async () => {
		const onfinished = vi.fn();
		const stepsA = makeSteps(1);
		const stepsB = makeSteps(2);

		const { rerender } = await render(OrigamiStage, {
			steps: stepsA,
			stepMs: STEP_MS,
			onfinished
		});

		await waitForCounter('3 / 3');
		await rerender({ steps: stepsB });
		await waitForCounter('1 / 3');

		// Дождёмся середины воспроизведения и нажмём «Повторить»
		await waitForCounter('2 / 3');
		const callsBeforeReplay = onfinished.mock.calls.length;
		await userEvent.click(page.getByRole('button', { name: 'Повторить' }));

		// Воспроизведение ушло на первый шаг и снова доигрывает до конца
		await waitForCounter('1 / 3');
		await waitFor(
			'onfinished после повтора',
			() => onfinished.mock.calls.length >= callsBeforeReplay + 1
		);
		await waitForCounter('3 / 3');
		expect(dotsRendered()).toBe(2);
	}, 15000);

	it('после завершения интервал не тикает: onfinished не вызывается повторно', async () => {
		const onfinished = vi.fn();

		await render(OrigamiStage, {
			steps: makeSteps(1),
			stepMs: STEP_MS,
			onfinished
		});

		await waitForCounter('3 / 3');
		await waitFor('onfinished', () => onfinished.mock.calls.length >= 1);

		// Запас в 5 тиков: зависший интервал дёрнул бы onfinished ещё раз
		await sleep(STEP_MS * 5);
		expect(onfinished).toHaveBeenCalledTimes(1);
	}, 15000);
});

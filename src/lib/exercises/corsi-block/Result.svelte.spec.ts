import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Result from './Result.svelte';
import '../../../app.css';
import { Chart } from 'chart.js';
import type { CorsiBlockResult } from './types';

/** 9 заходов с дублирующимися длинами (ретраи после ошибок):
 *  длины 3,4,5,5,5,6,6,6,6; верные — 1,2,3,5.
 *  Агрегаты по фикстуре:
 *  - всего 9; спан (макс. верная длина) = 5; макс. достигнутая длина = 6
 *  - верно/ошибок = 4/5; среднее время = 34200/9 ≈ 3800 мс → «3.8 с»
 *  - окно ответа: meta.answerTimeoutMs '15000' → «15 с» */
const fixture: CorsiBlockResult[] = [
	{ attempt: 1, sequenceLength: 3, isCorrect: true, answerMs: 2000 },
	{ attempt: 2, sequenceLength: 4, isCorrect: true, answerMs: 2600 },
	{ attempt: 3, sequenceLength: 5, isCorrect: true, answerMs: 3400 },
	{ attempt: 4, sequenceLength: 5, isCorrect: false, answerMs: 700 },
	{ attempt: 5, sequenceLength: 5, isCorrect: true, answerMs: 3600 },
	{ attempt: 6, sequenceLength: 6, isCorrect: false, answerMs: 15000 },
	{ attempt: 7, sequenceLength: 6, isCorrect: false, answerMs: 900 },
	{ attempt: 8, sequenceLength: 6, isCorrect: false, answerMs: 1200 },
	{ attempt: 9, sequenceLength: 6, isCorrect: false, answerMs: 4800 }
];

/** Ячейка единственной сводной строки (tbody td:nth-child(column)). */
function summaryCell(column: number): HTMLElement {
	const table = page.getByRole('table').element();
	return table.querySelector(`tbody tr:nth-child(1) td:nth-child(${column})`)!;
}

describe('Corsi block Result', () => {
	it('renders summary table: attempts, span, max length, correct/errors, avg time, window', async () => {
		await render(Result, {
			results: fixture,
			meta: { rounds: '9', startLength: '3', answerTimeoutMs: '15000' }
		});

		const table = page.getByRole('table').element();
		const headers = Array.from(table.querySelectorAll('thead th')).map((th) => th.textContent);
		expect(headers).toEqual([
			'Заходов',
			'Спан',
			'Макс. длина',
			'Верно / ошибок',
			'Среднее время',
			'Окно ответа'
		]);

		// 9 заходов; спан 5 (верная макс. длина, НЕ 6); макс. длина 6; 4/5;
		// среднее 34200/9 ≈ 3800 мс → «3.8 с»; окно 15000 → «15 с»
		expect(summaryCell(1).textContent).toBe('9');
		expect(summaryCell(2).textContent).toBe('5');
		expect(summaryCell(3).textContent).toBe('6');
		expect(summaryCell(4).textContent).toBe('4 / 5');
		expect(summaryCell(5).textContent).toBe('3.8 с');
		expect(summaryCell(6).textContent).toBe('15 с');
	});

	it('renders without meta: empty window cell, no throw', async () => {
		await render(Result, { results: fixture, meta: null });

		expect(summaryCell(1).textContent).toBe('9');
		expect(summaryCell(6).textContent).toBe('');
	});

	it('спан «—», когда ни одного верного захода', async () => {
		const allWrong = fixture.map((r) => ({ ...r, isCorrect: false }));
		await render(Result, { results: allWrong, meta: null });

		expect(summaryCell(2).textContent).toBe('—');
		// Макс. длина при этом определена
		expect(summaryCell(3).textContent).toBe('6');
	});
});

describe('Corsi block ResultsChart', () => {
	const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

	/** Chart.js создаётся в onMount — ждём появления инстанса на canvas. */
	async function waitForChart(): Promise<Chart> {
		const start = performance.now();
		while (performance.now() - start < 5000) {
			const canvas = document.querySelector<HTMLCanvasElement>('canvas');
			const chart = canvas ? Chart.getChart(canvas) : undefined;
			if (chart) return chart;
			await sleep(25);
		}
		throw new Error('Timed out waiting for chart instance');
	}

	it('renders a canvas and creates a chart.js instance', async () => {
		await render(Result, { results: fixture, meta: null });

		expect(document.querySelector('canvas')).not.toBeNull();

		const chart = await waitForChart();
		expect(chart).toBeInstanceOf(Chart);
		expect(Object.keys(Chart.instances).length).toBeGreaterThan(0);
	});

	it('X axis labels are sequence lengths with retries preserved (not collapsed)', async () => {
		await render(Result, { results: fixture, meta: null });

		const chart = await waitForChart();
		// Дубликаты длин — ретраи — остаются отдельными точками по X
		expect(chart.data.labels).toEqual([3, 4, 5, 5, 5, 6, 6, 6, 6]);
		expect(chart.data.datasets).toHaveLength(1);
		expect(chart.data.datasets[0].data).toHaveLength(9);
	});

	it('tooltip callbacks: attempt number, length and answer time with status', async () => {
		await render(Result, { results: fixture, meta: null });

		const chart = await waitForChart();
		const callbacks = (
			chart.options.plugins as {
				tooltip: { callbacks: Record<string, (ctx: never) => unknown> };
			}
		).tooltip.callbacks;

		// Верный заход №1: длина 3, 2000 мс
		const correctPoint = chart.data.datasets[0].data[0] as unknown;
		// title получает МАССИВ контекстов (контракт Chart.js), label/afterLabel — один.
		expect(callbacks.title([{ raw: correctPoint }] as never)).toBe('Заход 1');
		expect(callbacks.label({ raw: correctPoint } as never)).toBe('Длина: 3');
		expect(callbacks.afterLabel({ raw: correctPoint } as never)).toBe('Время: 2000 мс (Верно)');

		// Ошибочный заход №4 (ретрай длины 5): 700 мс
		const errorPoint = chart.data.datasets[0].data[3] as unknown;
		expect(callbacks.title([{ raw: errorPoint }] as never)).toBe('Заход 4');
		expect(callbacks.label({ raw: errorPoint } as never)).toBe('Длина: 5');
		expect(callbacks.afterLabel({ raw: errorPoint } as never)).toBe('Время: 700 мс (Ошибка)');
	});
});

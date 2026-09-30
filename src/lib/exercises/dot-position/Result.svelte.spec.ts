import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Result from './Result.svelte';
import '../../../app.css';
import { Chart } from 'chart.js';
import type { DotPositionResult } from './types';

/** 9 раундов: 3 этапа, correct-маска, два нетап-раунда (distance: null).
 *  reactionMs: раунды 1–9 = 800, 900, 3000, 700, 650, 2800, 600, 620, 2500.
 *  Агрегаты по фикстуре:
 *  - всего верно: 5 из 9; средняя реакция: 12570/9 ≈ 1396.7 мс → «1.4 с»
 *  - windowSize '0.1' → «10%» */
const fixture: DotPositionResult[] = [
	{ attempt: 1, stage: 1, reactionMs: 800, correct: true, distance: 0.05 },
	{ attempt: 2, stage: 1, reactionMs: 900, correct: false, distance: 0.3 },
	{ attempt: 3, stage: 1, reactionMs: 3000, correct: false, distance: null },
	{ attempt: 4, stage: 2, reactionMs: 700, correct: true, distance: 0.02 },
	{ attempt: 5, stage: 2, reactionMs: 650, correct: true, distance: 0.04 },
	{ attempt: 6, stage: 2, reactionMs: 2800, correct: false, distance: null },
	{ attempt: 7, stage: 3, reactionMs: 600, correct: true, distance: 0.01 },
	{ attempt: 8, stage: 3, reactionMs: 620, correct: true, distance: 0.03 },
	{ attempt: 9, stage: 3, reactionMs: 2500, correct: false, distance: 0.4 }
];

/** Ячейка единственной сводной строки (tbody td:nth-child(column)). */
function summaryCell(column: number): HTMLElement {
	const table = page.getByRole('table').element();
	return table.querySelector(`tbody tr:nth-child(1) td:nth-child(${column})`)!;
}

describe('Dot position Result', () => {
	it('renders summary table with correct count, average reaction and hit window', async () => {
		await render(Result, {
			results: fixture,
			meta: { dotsPerStage: '3', windowSize: '0.1' }
		});

		const table = page.getByRole('table').element();
		const headers = Array.from(table.querySelectorAll('thead th')).map((th) => th.textContent);
		expect(headers).toEqual(['Верно', 'Средняя реакция', 'Окно попадания']);

		// Верно 5 из 9; средняя 12570/9 ≈ 1396.7 мс → «1.4 с»; окно 0.1 → «10%»
		expect(summaryCell(1).textContent).toBe('5 из 9');
		expect(summaryCell(2).textContent).toBe('1.4 с');
		expect(summaryCell(3).textContent).toBe('10%');
	});

	it('renders without meta: empty hit-window cell, no throw', async () => {
		await render(Result, { results: fixture, meta: null });

		// meta=null → windowText='' (пустая ячейка, не блок целиком)
		expect(summaryCell(1).textContent).toBe('5 из 9');
		expect(summaryCell(3).textContent).toBe('');
	});
});

describe('Dot position ResultsChart', () => {
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

	it('builds 3 stage datasets with 3 points each and stage labels', async () => {
		await render(Result, { results: fixture, meta: null });

		const chart = await waitForChart();
		expect(chart.data.datasets).toHaveLength(3);

		const labels = chart.data.datasets.map((ds) => ds.label);
		expect(labels).toContain('Этап 1 (сетка 5×5)');
		expect(labels).toContain('Этап 2 (сетка 3×3)');
		expect(labels).toContain('Этап 3 (без сетки)');

		for (const dataset of chart.data.datasets) {
			expect(dataset.data).toHaveLength(3);
		}
	});

	it('tooltip callbacks distinguish tap and no-answer rounds', async () => {
		await render(Result, { results: fixture, meta: null });

		const chart = await waitForChart();
		const callbacks = (
			chart.options.plugins as {
				tooltip: { callbacks: Record<string, (ctx: never) => unknown> };
			}
		).tooltip.callbacks;

		// Тап-раунд: attempt 1, distance 0.05
		const tapPoint = chart.data.datasets[0].data[0] as { x: number; y: number };
		expect(callbacks.afterLabel({ raw: tapPoint } as never)).toBe('Отклонение: 0.05');
		expect(callbacks.label({ raw: tapPoint } as never)).toBe('Реакция: 800.00 мс (Верно)');

		// Нетап-раунд: attempt 3, distance null
		const noAnswerPoint = chart.data.datasets[0].data[2] as { x: number; y: number };
		expect(callbacks.afterLabel({ raw: noAnswerPoint } as never)).toBe('Нет ответа');
	});
});

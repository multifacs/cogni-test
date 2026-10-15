import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Result from './Result.svelte';
import '../../../app.css';
import { Chart } from 'chart.js';
import type { SimonResult } from './types';

/**
 * Полная сессия 35 проб (5 + 10 + 20) с известными агрегатами
 * (позиции согласованы с конгруэнтностью: red→left, blue→right,
 * green→up, yellow→down):
 *
 * Часть 1 (t1–t5): 5 проб, 3/2, 60 %, среднее (500+700+600+900)/4
 *  = 675 мс, таймаутов 1 (t4).
 * Часть 2 (t6–t15): 10 проб, 7/3, 70 %, среднее 8550/9 = 950 мс,
 *  таймаутов 1 (t11).
 * Часть 3 (t16–t35): 20 проб, 14/6, 70 %, среднее 12170/17 ≈ 715.9
 *  → 716 мс, таймаутов 3 (t23, t28, t35).
 * Итого: 35 проб, 24/11, 69 %, среднее 23420/30 ≈ 780.7 → 781 мс,
 *  таймаутов 5.
 *
 * Эффект Симона (блоки 2–3, только верные): конгруэнтные 15 проб,
 *  среднее 11290/15 ≈ 752.7 мс; инконгруэнтные 6 проб, среднее
 *  5130/6 = 855 мс; эффект ≈ 102.3 → «102 мс».
 */
type FixtureRow = [
	block: SimonResult['block'],
	trialIndex: number,
	color: SimonResult['color'],
	position: SimonResult['position'],
	congruency: SimonResult['congruency'],
	isCorrect: boolean,
	responseTimeMs: number,
	timedOut: boolean
];

const rows: FixtureRow[] = [
	// Часть 1: центр, neutral
	[1, 1, 'red', 'center', 'neutral', true, 500, false],
	[1, 2, 'blue', 'center', 'neutral', true, 700, false],
	[1, 3, 'red', 'center', 'neutral', false, 600, false],
	[1, 4, 'blue', 'center', 'neutral', false, 3000, true],
	[1, 5, 'red', 'center', 'neutral', true, 900, false],
	// Часть 2: red→left, blue→right
	[2, 6, 'red', 'left', 'congruent', true, 800, false],
	[2, 7, 'blue', 'left', 'incongruent', true, 1000, false],
	[2, 8, 'red', 'left', 'congruent', false, 700, false],
	[2, 9, 'blue', 'right', 'congruent', true, 900, false],
	[2, 10, 'red', 'right', 'incongruent', true, 1100, false],
	[2, 11, 'blue', 'left', 'incongruent', false, 3000, true],
	[2, 12, 'red', 'left', 'congruent', true, 850, false],
	[2, 13, 'blue', 'left', 'incongruent', false, 1200, false],
	[2, 14, 'red', 'left', 'congruent', true, 950, false],
	[2, 15, 'blue', 'right', 'congruent', true, 1050, false],
	// Часть 3: red→left, blue→right, green→up, yellow→down
	[3, 16, 'red', 'left', 'congruent', true, 600, false],
	[3, 17, 'blue', 'right', 'congruent', true, 700, false],
	[3, 18, 'green', 'up', 'congruent', true, 650, false],
	[3, 19, 'yellow', 'up', 'incongruent', true, 750, false],
	[3, 20, 'red', 'right', 'incongruent', false, 500, false],
	[3, 21, 'blue', 'left', 'incongruent', true, 800, false],
	[3, 22, 'green', 'up', 'congruent', true, 620, false],
	[3, 23, 'yellow', 'up', 'incongruent', false, 3000, true],
	[3, 24, 'red', 'left', 'congruent', true, 680, false],
	[3, 25, 'blue', 'left', 'incongruent', false, 900, false],
	[3, 26, 'green', 'up', 'congruent', true, 710, false],
	[3, 27, 'yellow', 'left', 'incongruent', true, 760, false],
	[3, 28, 'red', 'up', 'incongruent', false, 3000, true],
	[3, 29, 'blue', 'left', 'incongruent', true, 720, false],
	[3, 30, 'green', 'up', 'congruent', true, 640, false],
	[3, 31, 'yellow', 'left', 'incongruent', false, 1000, false],
	[3, 32, 'red', 'left', 'congruent', true, 660, false],
	[3, 33, 'blue', 'right', 'congruent', true, 780, false],
	[3, 34, 'green', 'up', 'congruent', true, 700, false],
	[3, 35, 'yellow', 'left', 'incongruent', false, 3000, true]
];

const fixture: SimonResult[] = rows.map(
	([block, trialIndex, color, position, congruency, isCorrect, responseTimeMs, timedOut]) => ({
		block,
		trialIndex,
		color,
		position,
		congruency,
		isCorrect,
		responseTimeMs,
		timedOut
	})
);

/** Ячейка сводной таблицы: строка rowIndex (1-based), колонка column (1-based). */
function summaryCell(rowIndex: number, column: number): HTMLElement {
	const table = page.getByRole('table').element();
	return table.querySelector(`tbody tr:nth-child(${rowIndex}) td:nth-child(${column})`)!;
}

describe('Simon Result', () => {
	it('renders per-block summary table with overall row, simon effect and window', async () => {
		await render(Result, {
			results: fixture,
			meta: { blocks: '5+10+20', windowMs: '3000' }
		});

		const table = page.getByRole('table').element();
		const headers = Array.from(table.querySelectorAll('thead th')).map((th) => th.textContent);
		expect(headers).toEqual([
			'Часть',
			'Проб',
			'Верно / ошибок',
			'Точность',
			'Среднее время',
			'Таймауты'
		]);

		// Часть 1: 5 проб, 3/2, 60 %, 675 мс, 1 таймаут
		expect(summaryCell(1, 1).textContent).toBe('Часть 1');
		expect(summaryCell(1, 2).textContent).toBe('5');
		expect(summaryCell(1, 3).textContent).toBe('3 / 2');
		expect(summaryCell(1, 4).textContent).toBe('60 %');
		expect(summaryCell(1, 5).textContent).toBe('675 мс');
		expect(summaryCell(1, 6).textContent).toBe('1');

		// Часть 2: 10 проб, 7/3, 70 %, 950 мс, 1 таймаут
		expect(summaryCell(2, 1).textContent).toBe('Часть 2');
		expect(summaryCell(2, 2).textContent).toBe('10');
		expect(summaryCell(2, 3).textContent).toBe('7 / 3');
		expect(summaryCell(2, 4).textContent).toBe('70 %');
		expect(summaryCell(2, 5).textContent).toBe('950 мс');
		expect(summaryCell(2, 6).textContent).toBe('1');

		// Часть 3: 20 проб, 14/6, 70 %, 716 мс, 3 таймаута
		expect(summaryCell(3, 1).textContent).toBe('Часть 3');
		expect(summaryCell(3, 2).textContent).toBe('20');
		expect(summaryCell(3, 3).textContent).toBe('14 / 6');
		expect(summaryCell(3, 4).textContent).toBe('70 %');
		expect(summaryCell(3, 5).textContent).toBe('716 мс');
		expect(summaryCell(3, 6).textContent).toBe('3');

		// Итого: 35 проб, 24/11, 69 %, 781 мс, 5 таймаутов
		expect(summaryCell(4, 1).textContent).toBe('Итого');
		expect(summaryCell(4, 2).textContent).toBe('35');
		expect(summaryCell(4, 3).textContent).toBe('24 / 11');
		expect(summaryCell(4, 4).textContent).toBe('69 %');
		expect(summaryCell(4, 5).textContent).toBe('781 мс');
		expect(summaryCell(4, 6).textContent).toBe('5');

		// Эффект Симона: 855 − 752.7 ≈ 102.3 → 102 мс.
		// Regex-локатор: текст параграфа разбит на несколько text nodes.
		const effectText = page.getByText(/Эффект Симона/).element().textContent;
		expect(effectText).toContain('Эффект Симона (инконгруэнтные − конгруэнтные):');
		expect(effectText).toContain('102 мс');

		// Окно ответа: meta.windowMs '3000' → «3 с»
		expect(page.getByText(/Окно ответа/).element().textContent).toBe('Окно ответа: 3 с');
	});

	it('renders without meta: no window line, no throw', async () => {
		await render(Result, { results: fixture, meta: null });

		expect(summaryCell(4, 2).textContent).toBe('35');
		expect(page.getByText(/Окно ответа/).elements()).toHaveLength(0);
	});

	it('empty results: no crash, zero totals with «—», no canvas', async () => {
		await render(Result, { results: [], meta: null });

		// Блочных строк нет; остаётся строка «Итого» с нулями
		const table = page.getByRole('table').element();
		expect(table.querySelectorAll('tbody tr')).toHaveLength(1);
		expect(summaryCell(1, 1).textContent).toBe('Итого');
		expect(summaryCell(1, 2).textContent).toBe('0');
		expect(summaryCell(1, 3).textContent).toBe('0 / 0');
		expect(summaryCell(1, 4).textContent).toBe('0 %');
		expect(summaryCell(1, 5).textContent).toBe('—');
		expect(summaryCell(1, 6).textContent).toBe('0');

		// Эффект неопределим — «—»; канвас не рендерится
		const effectText = page.getByText(/Эффект Симона/).element().textContent;
		expect(effectText).toContain('—');
		expect(document.querySelector('canvas')).toBeNull();
	});
});

describe('Simon ResultsChart', () => {
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

	it('X axis labels are trial indices 1..35, one dataset of 35 points', async () => {
		await render(Result, { results: fixture, meta: null });

		const chart = await waitForChart();
		expect(chart.data.labels).toEqual(Array.from({ length: 35 }, (_, i) => i + 1));
		expect(chart.data.datasets).toHaveLength(1);
		expect(chart.data.datasets[0].data).toHaveLength(35);
	});
});

import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Result from './Result.svelte';
import '../../../app.css';
import type { DotPositionResult } from './types';

/** 9 раундов: 3 этапа, correct-маска, два нетап-раунда (distance: null).
 *  reactionMs: раунды 1–9 = 800, 900, 3000, 700, 650, 2800, 600, 620, 2500.
 *  Агрегаты по фикстуре:
 *  - всего верно: 5 из 9; средняя реакция: 12570/9 ≈ 1396.7 мс → «1.4 с»
 *  - этап 1: верно 1, ошибок 2, ср. 4700/3 ≈ 1566.7 → «1.6 с»
 *  - этап 2: верно 2, ошибок 1, ср. 4150/3 ≈ 1383.3 → «1.4 с»
 *  - этап 3: верно 2, ошибок 1, ср. 3720/3 = 1240 → «1.2 с»
 *  - среднее отклонение тапа по 7 определённым distance: 0.85/7 ≈ 0.12 */
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

function stageCell(row: number, column: number): HTMLElement {
	const table = page.getByRole('table').element();
	return table.querySelector(`tbody tr:nth-child(${row}) td:nth-child(${column})`)!;
}

describe('Dot position Result', () => {
	it('renders summary header with correct count, average reaction and hit window', async () => {
		await render(Result, {
			results: fixture,
			meta: { dotsPerStage: '3', windowSize: '0.1' }
		});

		expect(page.getByText('Верно: 5 из 9').element()).toBeTruthy();
		expect(page.getByText('Средняя реакция: 1.4 с').element()).toBeTruthy();
		expect(page.getByText('Окно попадания: 10%').element()).toBeTruthy();
	});

	it('renders per-stage table with fixture numbers; stage 3 labelled «без сетки»', async () => {
		await render(Result, {
			results: fixture,
			meta: { dotsPerStage: '3', windowSize: '0.1' }
		});

		expect(page.getByText('Этап 1 (сетка 5×5)').element()).toBeTruthy();
		expect(page.getByText('Этап 2 (сетка 3×3)').element()).toBeTruthy();
		expect(page.getByText('Этап 3 (без сетки)').element()).toBeTruthy();

		// Этап 1: верно 1, ошибок 2, ср. реакция 1.6 с
		expect(stageCell(1, 2).textContent).toBe('1');
		expect(stageCell(1, 3).textContent).toBe('2');
		expect(stageCell(1, 4).textContent).toBe('1.6 с');
		// Этап 2: верно 2, ошибок 1, ср. реакция 1.4 с
		expect(stageCell(2, 2).textContent).toBe('2');
		expect(stageCell(2, 3).textContent).toBe('1');
		expect(stageCell(2, 4).textContent).toBe('1.4 с');
		// Этап 3: верно 2, ошибок 1, ср. реакция 1.2 с
		expect(stageCell(3, 2).textContent).toBe('2');
		expect(stageCell(3, 3).textContent).toBe('1');
		expect(stageCell(3, 4).textContent).toBe('1.2 с');
	});

	it('renders without meta: no hit-window block, no throw', async () => {
		await render(Result, { results: fixture, meta: null });

		expect(page.getByText('Верно: 5 из 9').element()).toBeTruthy();
		expect(page.getByText(/Окно попадания/).query()).toBeNull();
	});

	it('null distances do not break aggregates: average tap deviation over defined distances', async () => {
		await render(Result, {
			results: fixture,
			meta: { dotsPerStage: '3', windowSize: '0.1' }
		});

		// 7 определённых distance (два нетапа отфильтрованы): 0.85 / 7 ≈ 0.12
		expect(page.getByText('Среднее отклонение тапа: 0.12').element()).toBeTruthy();
	});
});

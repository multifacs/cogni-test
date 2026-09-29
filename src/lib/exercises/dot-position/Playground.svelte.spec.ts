import { page, userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Playground from './Playground.svelte';
import '../../../app.css';
import type { MetaResult } from '$lib/exercises/types';
import type { DotPositionResult } from './types';
import { createRoundState, isHit, TIME_RESPOND_MS } from './logic/engine';

/** Ускоренные фазы — компонент принимает их через пропы (инъекция времени).
 *  Запас по memorizeMs важен: клик «при видимой точке» должен успеть
 *  сработать до переключения в respond, иначе он засчитается попаданием. */
const MEMORIZE_MS = 300;
const RESPOND_MS = 400;

/** Детерминированный ГПСЧ: randomPosition всегда даёт центр поля (0.5, 0.5). */
const rng = () => 0.5;

function makeProps() {
	const gameEnd = vi.fn();
	const sendResults = vi.fn((_payload: MetaResult) => {
		void _payload;
	});
	return {
		gameEnd,
		sendResults,
		results: () => sendResults.mock.calls[0]?.[0].results as DotPositionResult[],
		meta: () => sendResults.mock.calls[0]?.[0].meta as Record<string, string>
	};
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function panel(): HTMLElement | null {
	return document.querySelector<HTMLElement>('.dot-panel');
}

async function waitFor(what: string, predicate: () => boolean, timeoutMs = 5000) {
	const start = performance.now();
	while (performance.now() - start < timeoutMs) {
		if (predicate()) return;
		await sleep(25);
	}
	throw new Error(`Timed out waiting for: ${what}`);
}

/** Ждёт фазу ответа: точка скрыта, панель принимает тапы. */
function waitForRespond() {
	return waitFor('respond phase', () => panel()?.dataset.phase === 'respond');
}

/** Ждёт фазу показа точки. */
function waitForMemorize() {
	return waitFor('memorize phase', () => panel()?.dataset.phase === 'memorize');
}

describe('Dot position playground — click-through', () => {
	it('plays all 9 rounds with grid changes, hit/miss/timeout rounds and a complete result set', async () => {
		// Позиция точки вычислима заранее теми же функциями движка:
		// rng() = 0.5 → центр поля, клик в центр панели — гарантированное попадание.
		const expectedPosition = createRoundState(rng).position;
		expect(expectedPosition).toEqual({ x: 0.5, y: 0.5 });
		expect(isHit(expectedPosition, { x: 0.5, y: 0.5 })).toBe(true);
		// А угол поля — гарантированный промах.
		expect(isHit(expectedPosition, { x: 0.1, y: 0.1 })).toBe(false);

		const props = makeProps();
		await render(Playground, {
			gameEnd: props.gameEnd,
			sendResults: props.sendResults,
			memorizeMs: MEMORIZE_MS,
			respondMs: RESPOND_MS,
			rng
		});

		// Этап 1: сетка 5×5
		expect(page.getByText('Этап 1 из 3').query()).toBeTruthy();
		expect(panel()?.dataset.grid).toBe('5');

		// Тап при видимой точке (фаза memorize) игнорируется
		await userEvent.click(panel()!);
		await waitForRespond();
		expect(page.getByText('Верно: 0').query()).toBeTruthy();
		expect(page.getByText('Ошибок: 0').query()).toBeTruthy();

		// Раунд 1 — промах: тап по центру левой верхней ячейки сетки
		await userEvent.click(document.querySelector('.grid-overlay > div')!);
		await waitForMemorize();
		expect(page.getByText('Ошибок: 1').query()).toBeTruthy();

		// Раунд 2 — попадание: тап в центр панели
		await waitForRespond();
		await userEvent.click(panel()!);
		await waitForMemorize();
		expect(page.getByText('Верно: 1').query()).toBeTruthy();

		// Раунд 3 — таймаут: не тапаем, ждём истечения respondMs
		await waitForRespond();
		await waitForMemorize();

		// Этап 2: сетка 3×3, счётчики сохранены
		expect(page.getByText('Этап 2 из 3').query()).toBeTruthy();
		expect(panel()?.dataset.grid).toBe('3');
		expect(page.getByText('Верно: 1').query()).toBeTruthy();
		expect(page.getByText('Ошибок: 2').query()).toBeTruthy();

		// Раунды 4–6 — попадания
		for (let round = 4; round <= 6; round++) {
			await waitForRespond();
			await userEvent.click(panel()!);
			await waitForMemorize();
		}

		// Этап 3: без сетки
		expect(page.getByText('Этап 3 из 3').query()).toBeTruthy();
		expect(panel()?.dataset.grid).toBe('0');
		expect(document.querySelector('.grid-overlay')).toBeNull();

		// Раунды 7–8 — попадания, раунд 9 — таймаут
		await waitForRespond();
		await userEvent.click(panel()!);
		await waitForMemorize();
		await waitForRespond();
		await userEvent.click(panel()!);
		await waitForMemorize();
		await waitForRespond();
		await waitFor('finished phase', () => panel()?.dataset.phase === 'finished');

		// Итог: 6 верных, 3 ошибки
		expect(page.getByText('Верно: 6').query()).toBeTruthy();
		expect(page.getByText('Ошибок: 3').query()).toBeTruthy();

		// Контракт завершения: ровно по одному вызову
		expect(props.gameEnd).toHaveBeenCalledTimes(1);
		expect(props.sendResults).toHaveBeenCalledTimes(1);

		const results = props.results();
		expect(results).toHaveLength(9);
		// Сквозная нумерация и раскладка по этапам 3×3
		expect(results.map((r) => r.attempt)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
		expect(results.map((r) => r.stage)).toEqual([1, 1, 1, 2, 2, 2, 3, 3, 3]);
		// Раунд 1 — промах, 2 — попадание, 3 — таймаут, 4–8 — попадания, 9 — таймаут
		expect(results.map((r) => r.correct)).toEqual([
			false,
			true,
			false,
			true,
			true,
			true,
			true,
			true,
			false
		]);
		// Нетап-раунды: расстояние не определено, реакция — полный таймаут
		for (const r of [results[2], results[8]]) {
			expect(r.distance).toBeNull();
			expect(r.reactionMs).toBe(TIME_RESPOND_MS);
		}
		// Тап-раунды: расстояние определено, промах раунда 1 — далёкий тап
		expect(results[0].distance).not.toBeNull();
		expect(results[0].distance! > 0.1).toBe(true);
		for (const r of [results[1], results[3], results[4], results[5], results[6], results[7]]) {
			expect(r.distance).not.toBeNull();
			expect(r.distance! <= 0.1).toBe(true);
		}

		// Мета упражнения
		expect(props.meta()).toEqual({ dotsPerStage: '3', windowSize: '0.1' });
	}, 30000);

	it('игнорирует тап вне панели: счётчики не меняются, раунд не завершается', async () => {
		const props = makeProps();
		const { unmount } = await render(Playground, {
			gameEnd: props.gameEnd,
			sendResults: props.sendResults,
			memorizeMs: MEMORIZE_MS,
			respondMs: RESPOND_MS,
			rng
		});

		await waitForRespond();

		// Тап по контейнеру счётчиков — вне .dot-panel, обработчик
		// onpointerdown которого не должен сработать.
		await userEvent.click(page.getByText('Этап 1 из 3'));

		// Запас по времени: если бы тап «протёк» в панель, раунд завершился
		// бы мгновенно и фаза ушла в memorize следующего раунда.
		await sleep(150);
		expect(panel()?.dataset.phase).toBe('respond');
		expect(page.getByText('Верно: 0').query()).toBeTruthy();
		expect(page.getByText('Ошибок: 0').query()).toBeTruthy();

		// Раунд завершился только штатным таймаутом respondMs
		await waitForMemorize();
		expect(page.getByText('Верно: 0').query()).toBeTruthy();
		expect(page.getByText('Ошибок: 1').query()).toBeTruthy();

		unmount();
	}, 15000);

	it('клик по реальным координатам точки: в memorize игнор, в respond — попадание', async () => {
		// rng = 0.225 → позиция не в центре: 0.1 + 0.225 * 0.8 = 0.28 по обеим осям
		const rngOffCenter = () => 0.225;
		const expectedPosition = createRoundState(rngOffCenter).position;
		expect(expectedPosition).toEqual({ x: 0.28, y: 0.28 });
		// Клик ровно в точку — расстояние 0, гарантированное попадание
		expect(isHit(expectedPosition, expectedPosition)).toBe(true);

		const props = makeProps();
		const { unmount } = await render(Playground, {
			gameEnd: props.gameEnd,
			sendResults: props.sendResults,
			memorizeMs: MEMORIZE_MS,
			respondMs: RESPOND_MS,
			rng: rngOffCenter
		});

		// Пиксельные координаты точки — те же, что использует компонент:
		// normalizeTap делит (clientX - rect.left) на minSide панели.
		const rect = () => panel()!.getBoundingClientRect();
		const dotClient = () => {
			const r = rect();
			const minSide = Math.min(r.width, r.height);
			return {
				clientX: r.left + expectedPosition.x * minSide,
				clientY: r.top + expectedPosition.y * minSide
			};
		};

		// Тап по координатам точки в memorize-фазе: игнор, счётчики не тронуты
		const memorizeTap = dotClient();
		panel()!.dispatchEvent(
			new PointerEvent('pointerdown', {
				bubbles: true,
				clientX: memorizeTap.clientX,
				clientY: memorizeTap.clientY
			})
		);
		await sleep(50);
		expect(page.getByText('Верно: 0').query()).toBeTruthy();
		expect(page.getByText('Ошибок: 0').query()).toBeTruthy();
		// Штатный переход memorize → respond
		await waitForRespond();

		// Тап по тем же координатам в respond-фазе: попадание (расстояние 0)
		const respondTap = dotClient();
		panel()!.dispatchEvent(
			new PointerEvent('pointerdown', {
				bubbles: true,
				clientX: respondTap.clientX,
				clientY: respondTap.clientY
			})
		);
		await waitForMemorize();
		expect(page.getByText('Верно: 1').query()).toBeTruthy();
		expect(page.getByText('Ошибок: 0').query()).toBeTruthy();

		unmount();
	}, 15000);
});

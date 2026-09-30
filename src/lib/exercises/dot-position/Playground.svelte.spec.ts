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
 *  сработать до переключения в wait, иначе он засчитается попаданием. */
const MEMORIZE_MS = 300;
const WAIT_MS = 200;
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

/** Фраза состояния над полем («Запоминай» / «Приготовься» / «Отвечай»). */
function phrase(): HTMLElement | null {
	return document.querySelector<HTMLElement>('.phase-phrase');
}

/** Все кружки-прогресса (9 штук, один на раунд). */
function dots(): HTMLElement[] {
	return [...document.querySelectorAll<HTMLElement>('.progress-dot')];
}

/** Ширина заливки прогресс-бара в процентах (NaN, если бар ещё не отрисован). */
function fillWidth(): number {
	const fill = document.querySelector<HTMLElement>('[role="progressbar"] > div');
	return fill ? Number.parseFloat(fill.style.width) : Number.NaN;
}

/** Ждёт, пока ширина заливки строго вырастет относительно первого сэмпла,
 *  и ассертит рост. Поллинг каждые 25 мс: timeLeft обновляется интервалом
 *  100 мс, и два одиночных сэмпла с фиксированным зазором могут попасть
 *  в один слот. */
async function waitForFillGrowth(phase: string, timeoutMs = 500) {
	await waitFor('progress bar rendered', () => !Number.isNaN(fillWidth()));
	const firstSample = fillWidth();
	await waitFor(`${phase} fill growth`, () => fillWidth() > firstSample, timeoutMs);
	expect(fillWidth()).toBeGreaterThan(firstSample);
}

/** Пройденные кружки: раунды до текущего включительно уже завершены. */
function pastCount(): number {
	return dots().filter((d) => d.dataset.state === 'past').length;
}

async function waitFor(what: string, predicate: () => boolean, timeoutMs = 5000) {
	const start = performance.now();
	while (performance.now() - start < timeoutMs) {
		if (predicate()) return;
		await sleep(25);
	}
	throw new Error(`Timed out waiting for: ${what}`);
}

/** Ждёт фазу показа точки. */
function waitForMemorize() {
	return waitFor('memorize phase', () => panel()?.dataset.phase === 'memorize');
}

/** Ждёт фазу паузы: точка скрыта, ввод игнорируется. */
function waitForWait() {
	return waitFor('wait phase', () => panel()?.dataset.phase === 'wait');
}

/** Ждёт фазу ответа: точка скрыта, панель принимает тапы. */
function waitForRespond() {
	return waitFor('respond phase', () => panel()?.dataset.phase === 'respond');
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
			waitMs: WAIT_MS,
			respondMs: RESPOND_MS,
			rng
		});

		// Этап 1: сетка 5×5 — проверяем сетку и раскладку кружков по этапам
		expect(panel()?.dataset.grid).toBe('5');
		expect(dots()).toHaveLength(9);
		expect(dots()[0].dataset.stage).toBe('1');
		expect(dots()[3].dataset.stage).toBe('2');
		expect(dots()[6].dataset.stage).toBe('3');
		// Текущий раунд — первый кружок, пройденных ещё нет
		expect(dots()[0].dataset.state).toBe('current');
		expect(pastCount()).toBe(0);

		// Анти-чит: в memorize-фазе курсор на панели скрыт (нельзя
		// «припарковать» его на точке), в respond — снова виден.
		expect(getComputedStyle(panel()!).cursor).toBe('none');
		// Фраза состояния в memorize
		expect(phrase()?.textContent).toBe('Запоминай');

		// Тап при видимой точке (фаза memorize) игнорируется
		await userEvent.click(panel()!);
		await waitForWait();
		// Анти-чит действует и в wait: точка скрыта, но курсор всё ещё спрятан
		expect(getComputedStyle(panel()!).cursor).toBe('none');
		expect(phrase()?.textContent).toBe('Приготовься');
		await waitForRespond();
		expect(getComputedStyle(panel()!).cursor).toBe('pointer');
		expect(phrase()?.textContent).toBe('Отвечай');
		// Панель в respond подсвечена светло-зелёным
		expect(panel()?.classList.contains('bg-green-50')).toBe(true);
		expect(pastCount()).toBe(0);

		// Раунд 1 — промах: тап по центру левой верхней ячейки сетки
		await userEvent.click(document.querySelector('.grid-overlay > div')!);
		await waitForMemorize();
		expect(pastCount()).toBe(1);

		// Раунд 2 — попадание: тап в центр панели
		await waitForRespond();
		await userEvent.click(panel()!);
		await waitForMemorize();
		expect(pastCount()).toBe(2);

		// Раунд 3 — таймаут: не тапаем, ждём истечения respondMs
		await waitForRespond();
		await waitForMemorize();
		expect(pastCount()).toBe(3);

		// Этап 2: сетка 3×3, прогресс кружков сохранён
		expect(panel()?.dataset.grid).toBe('3');
		expect(dots()[3].dataset.state).toBe('current');

		// Раунды 4–6 — попадания
		for (let round = 4; round <= 6; round++) {
			await waitForRespond();
			await userEvent.click(panel()!);
			await waitForMemorize();
		}
		expect(pastCount()).toBe(6);

		// Этап 3: без сетки
		expect(panel()?.dataset.grid).toBe('0');
		expect(document.querySelector('.grid-overlay')).toBeNull();
		expect(dots()[6].dataset.state).toBe('current');

		// Раунды 7–8 — попадания, раунд 9 — таймаут
		await waitForRespond();
		await userEvent.click(panel()!);
		await waitForMemorize();
		await waitForRespond();
		await userEvent.click(panel()!);
		await waitForMemorize();
		await waitForRespond();
		await waitFor('finished phase', () => panel()?.dataset.phase === 'finished');

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
	}, 45000);

	it('игнорирует тап вне панели: раунд не завершается, кружки не двигаются', async () => {
		const props = makeProps();
		const { unmount } = await render(Playground, {
			gameEnd: props.gameEnd,
			sendResults: props.sendResults,
			memorizeMs: MEMORIZE_MS,
			waitMs: WAIT_MS,
			respondMs: RESPOND_MS,
			rng
		});

		await waitForRespond();

		// Тап по фразе состояния — элемент над полем, вне .dot-panel,
		// обработчик onpointerdown которого не должен сработать.
		await userEvent.click(page.getByText('Отвечай'));

		// Запас по времени: если бы тап «протёк» в панель, раунд завершился
		// бы мгновенно и фаза ушла в memorize следующего раунда.
		await sleep(150);
		expect(panel()?.dataset.phase).toBe('respond');
		expect(pastCount()).toBe(0);
		expect(props.sendResults).not.toHaveBeenCalled();

		// Раунд завершился только штатным таймаутом respondMs
		await waitForMemorize();
		expect(pastCount()).toBe(1);
		expect(props.sendResults).not.toHaveBeenCalled();

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
			waitMs: WAIT_MS,
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

		// Тап по координатам точки в memorize-фазе: игнор, раунд не завершён
		const memorizeTap = dotClient();
		panel()!.dispatchEvent(
			new PointerEvent('pointerdown', {
				bubbles: true,
				clientX: memorizeTap.clientX,
				clientY: memorizeTap.clientY
			})
		);
		await sleep(50);
		expect(panel()?.dataset.phase).toBe('memorize');
		expect(pastCount()).toBe(0);
		// Штатный переход memorize → wait → respond
		await waitForWait();
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
		expect(pastCount()).toBe(1);
		expect(dots()[0].dataset.state).toBe('past');
		expect(dots()[1].dataset.state).toBe('current');

		unmount();
	}, 15000);

	it('progress bar fills left-to-right during a phase', async () => {
		const props = makeProps();
		const { unmount } = await render(Playground, {
			gameEnd: props.gameEnd,
			sendResults: props.sendResults,
			memorizeMs: MEMORIZE_MS,
			waitMs: WAIT_MS,
			respondMs: RESPOND_MS,
			rng
		});

		// Бар инвертирован: показывает пройденное время (elapsed), а не остаток —
		// ширина заливки растёт в течение фазы, а не уменьшается.
		await waitForMemorize();
		await waitForFillGrowth('memorize');

		// Та же механика в respond-фазе: бар продолжает заполняться слева направо.
		await waitForRespond();
		await waitForFillGrowth('respond');

		unmount();
	}, 15000);
});

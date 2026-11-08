import { userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Playground from './Playground.svelte';
import '../../../app.css';
import type { MetaResult } from '$lib/exercises/types';
import type { SimonBlock, SimonColor, SimonResult } from './types';
import { COLOR_TO_POSITION } from './logic/engine';

/** Детерминированный ГПСЧ (mulberry32): одинаковый сид → одинаковая сессия. */
function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const SEED = 42;
/**
 * Короткие части для браузерного теста: длительность — единственный
 * источник недетерминизма числа проб, поэтому 4 с на часть дают
 * несколько проб даже под нагрузкой CI.
 */
const BLOCK_MS = 4000;
const BLOCK_DURATIONS: Record<SimonBlock, number> = { 1: BLOCK_MS, 2: BLOCK_MS, 3: BLOCK_MS };
/** Вспышка достаточно длинная, чтобы тест успел надёжно её заметить. */
const FEEDBACK_MS = 400;

function makeProps() {
	const gameEnd = vi.fn();
	const sendResults = vi.fn((_payload: MetaResult) => {
		void _payload;
	});
	return {
		gameEnd,
		sendResults,
		results: () => sendResults.mock.calls[0]?.[0].results as SimonResult[],
		meta: () => sendResults.mock.calls[0]?.[0].meta as Record<string, string>
	};
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Элемент с текущей фазой (data-phase — тестовый хук Playground). */
function panel(): HTMLElement | null {
	return document.querySelector<HTMLElement>('[data-phase]');
}

/** Фраза состояния над полем («Отвечай стрелкой по цвету» / «Верно» / «Ошибка»). */
function phrase(): HTMLElement | null {
	return document.querySelector<HTMLElement>('.phase-phrase');
}

/** Кружок-стимул текущей пробы (data-circle — тестовый хук). */
function circle(): HTMLElement | null {
	return document.querySelector<HTMLElement>('[data-circle]');
}

/** Кнопка ответа по цвету (data-button — тестовый хук Playground). */
function button(color: SimonColor): HTMLElement | null {
	return document.querySelector<HTMLElement>(`[data-button="${color}"]`);
}

/** Экран инструкции части. */
function continueButton(): HTMLElement | null {
	return document.querySelector<HTMLElement>('[data-continue]');
}

async function waitFor(what: string, predicate: () => boolean, timeoutMs = 10_000) {
	const start = performance.now();
	while (performance.now() - start < timeoutMs) {
		if (predicate()) return;
		await sleep(25);
	}
	throw new Error(`Timed out waiting for: ${what}`);
}

/**
 * Доигрывает сессию до финиша: жмёт «продолжить» на интро частей и отвечает
 * на каждую показанную пробу её цветом (кнопки — стрелки, data-button
 * по-прежнему цвет). Неотвеченные пробы на границе части отбрасываются
 * самим компонентом — тест их не досчитывает.
 */
async function playUntilFinished() {
	for (let guard = 0; guard < 600; guard++) {
		const phase = panel()?.dataset.phase;
		if (phase === 'finished') return;
		if (phase === 'block-intro') {
			await userEvent.click(continueButton()!);
			continue;
		}
		if (phase === 'stimulus') {
			const color = circle()!.dataset.color as SimonColor;
			await userEvent.click(button(color)!);
			// Ответ обработан, если компонент ушёл в фидбек (или сразу закрыл часть).
			await waitFor('answer processed', () =>
				['feedback', 'block-intro', 'finished'].includes(panel()?.dataset.phase ?? '')
			);
			continue;
		}
		await waitFor('next phase', () => {
			const next = panel()?.dataset.phase;
			return next === 'stimulus' || next === 'block-intro' || next === 'finished';
		});
	}
	throw new Error('Сессия не завершилась за отведённое число шагов');
}

describe('Simon playground — click-through', () => {
	it('непрерывный прогон: части по таймеру, стрелки без цветов, результаты сохранены', async () => {
		const props = makeProps();
		const { unmount } = await render(Playground, {
			gameEnd: props.gameEnd,
			sendResults: props.sendResults,
			blockDurationsMs: BLOCK_DURATIONS,
			feedbackMs: FEEDBACK_MS,
			rng: mulberry32(SEED)
		});

		// Кнопки ответа — стрелки без цветовой заливки (проверяем на интро части 1).
		expect(button('red')!.textContent?.trim()).toBe('←');
		expect(button('blue')!.textContent?.trim()).toBe('→');
		expect(button('red')!.className).not.toContain('bg-red-500');
		expect(button('blue')!.className).not.toContain('bg-blue-500');

		await playUntilFinished();
		await waitFor('finished phase', () => panel()?.dataset.phase === 'finished');

		// Контракт завершения: ровно по одному вызову.
		expect(props.gameEnd).toHaveBeenCalledTimes(1);
		expect(props.sendResults).toHaveBeenCalledTimes(1);

		const results = props.results();
		expect(results.length).toBeGreaterThan(0);
		// Нумерация сохранённых ответов непрерывна, начиная с 1.
		expect(results.map((r) => r.trialIndex)).toEqual(results.map((_, i) => i + 1));
		expect(results.every((r) => r.isCorrect)).toBe(true);
		expect(results.every((r) => !r.timedOut)).toBe(true);
		expect(results.every((r) => r.responseTimeMs > 0)).toBe(true);

		// Все три части успели дать хотя бы по одной пробе.
		expect([...new Set(results.map((r) => r.block))]).toEqual([1, 2, 3]);

		// Каждая сохранённая проба валидна для своего блока.
		for (const r of results) {
			if (r.block === 1) {
				expect(['red', 'blue']).toContain(r.color);
				expect(r.position).toBe('center');
				expect(r.congruency).toBe('neutral');
				continue;
			}
			expect(r.position).not.toBe('center');
			if (r.block === 2) expect(['red', 'blue']).toContain(r.color);
			expect(r.congruency === 'congruent').toBe(r.position === COLOR_TO_POSITION[r.color]);
		}

		// Мета упражнения — константы движка, а не инъекция теста.
		expect(props.meta()).toEqual({ blockDurationsMs: '10000+30000+60000' });

		unmount();
	}, 120_000);

	it('неверный ответ: isCorrect false, цвет нажатой стрелки зафиксирован как ответ', async () => {
		const props = makeProps();
		const { unmount } = await render(Playground, {
			gameEnd: props.gameEnd,
			sendResults: props.sendResults,
			blockDurationsMs: BLOCK_DURATIONS,
			feedbackMs: FEEDBACK_MS,
			rng: mulberry32(SEED)
		});

		await waitFor('block 1 intro', () => panel()?.dataset.phase === 'block-intro');
		await userEvent.click(continueButton()!);
		await waitFor('block 1 stimulus', () => panel()?.dataset.phase === 'stimulus');

		// Первая проба: намеренно неправильный цвет (в части 1 только red/blue).
		const firstColor = circle()!.dataset.color as SimonColor;
		const wrongColor: SimonColor = firstColor === 'red' ? 'blue' : 'red';
		await userEvent.click(button(wrongColor)!);
		await waitFor('feedback phase', () => panel()?.dataset.phase === 'feedback');
		expect(phrase()?.textContent).toBe('Ошибка');

		// Остальные пробы доигрываем верно, чтобы сессия дошла до sendResults.
		await playUntilFinished();
		await waitFor('finished phase', () => panel()?.dataset.phase === 'finished');

		const results = props.results();
		expect(results.length).toBeGreaterThan(0);
		expect(results[0].isCorrect).toBe(false);
		expect(results[0].timedOut).toBe(false);
		expect(results[0].trialIndex).toBe(1);
		expect(results[0].color).toBe(firstColor);
		expect(results.slice(1).every((r) => r.isCorrect)).toBe(true);

		unmount();
	}, 120_000);

	it('таймер части: без ответов в части 1 её пробы не сохраняются, часть 2 начинается с 1', async () => {
		const props = makeProps();
		const { unmount } = await render(Playground, {
			gameEnd: props.gameEnd,
			sendResults: props.sendResults,
			blockDurationsMs: BLOCK_DURATIONS,
			feedbackMs: FEEDBACK_MS,
			rng: mulberry32(SEED)
		});

		await waitFor('block 1 intro', () => panel()?.dataset.phase === 'block-intro');
		await userEvent.click(continueButton()!);
		await waitFor('block 1 stimulus', () => panel()?.dataset.phase === 'stimulus');

		// Не отвечаем: часть 1 должна закрыться сама по общему таймеру.
		await waitFor(
			'block 2 intro',
			() => panel()?.dataset.block === '2' && panel()?.dataset.phase === 'block-intro',
			BLOCK_MS + 5000
		);
		expect(props.sendResults).not.toHaveBeenCalled();

		await playUntilFinished();
		await waitFor('finished phase', () => panel()?.dataset.phase === 'finished');

		const results = props.results();
		expect(results.length).toBeGreaterThan(0);
		// Неотвеченная проба части 1 не сохранилась и не заняла trialIndex.
		expect(results.some((r) => r.block === 1)).toBe(false);
		expect(results[0].block).toBe(2);
		expect(results[0].trialIndex).toBe(1);

		unmount();
	}, 120_000);
});

import { userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Playground from './Playground.svelte';
import '../../../app.css';
import type { MetaResult } from '$lib/exercises/types';
import type { SimonColor, SimonResult } from './types';
import { buildSession, TOTAL_TRIALS } from './logic/engine';

/** Ускоренные фазы — компонент принимает их через пропы (инъекция времени).
 *  Окно ответа (4000 мс) с запасом вмещает trusted-клик userEvent. */
/** Интро блока длинное: тест тапает по data-continue раньше таймера, а
 *  короткое интро (100 мс) детачит кнопку до завершения stability-check
 *  trusted-клика («element was detached»). */
const INTRO_MS = 3000;
const FEEDBACK_MS = 120;
const ITI_MS = 80;
const RESPONSE_WINDOW_MS = 4000;

/** Детерминированный ГПСЧ (mulberry32): одинаковый сид → одинаковая сессия.
 *  Фабрика выдаёт СВЕЖИЙ поток на каждый вызов: компонент и эталонный прогон
 *  движка потребляют одинаковый поток независимо. */
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

/** Фраза состояния над полем («Отвечай по цвету» / «Верно» / «Ошибка»). */
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

async function waitFor(what: string, predicate: () => boolean, timeoutMs = 10_000) {
	const start = performance.now();
	while (performance.now() - start < timeoutMs) {
		if (predicate()) return;
		await sleep(25);
	}
	throw new Error(`Timed out waiting for: ${what}`);
}

/** Дожидается начала следующей пробы: пропускает экран инструкции блока
 *  (тап по data-continue), если он показан. */
async function nextStimulus() {
	await waitFor('stimulus or block-intro', () =>
		panel() ? panel().dataset.phase === 'stimulus' || panel().dataset.phase === 'block-intro' : false
	);
	if (panel().dataset.phase === 'block-intro') {
		await userEvent.click(document.querySelector<HTMLElement>('[data-continue]')!);
	}
	await waitFor('stimulus phase', () => panel()?.dataset.phase === 'stimulus');
}

/** Отвечает на текущую пробу цветом expected: кнопкой или стрелкой
 *  (ArrowLeft=red, ArrowRight=blue). */
async function answerColor(color: SimonColor, useKeyboard: 'left' | 'right' | null = null) {
	const el = circle()!;
	expect(el.dataset.color).toBe(color);
	if (useKeyboard) {
		await userEvent.keyboard(useKeyboard === 'left' ? '[ArrowLeft]' : '[ArrowRight]');
	} else {
		await userEvent.click(button(color)!);
	}
	await waitFor('feedback phase', () => panel()?.dataset.phase === 'feedback');
}

/** Стрелка, соответствующая цвету (red→left, blue→right). */
function arrowFor(color: SimonColor): 'left' | 'right' {
	return color === 'red' ? 'left' : 'right';
}

describe('Simon playground — click-through', () => {
	it('полный прогон: 35 проб (клавиатура в блоке 1, кнопки в блоках 2–3), кружки сверены с движком, sendResults ровно один раз, gameEnd вызван', async () => {
		// Сверка с движком: тот же сид даёт ту же сессию из 35 проб.
		const expected = buildSession(mulberry32(SEED));
		expect(expected).toHaveLength(TOTAL_TRIALS);

		const props = makeProps();
		const { unmount } = await render(Playground, {
			gameEnd: props.gameEnd,
			sendResults: props.sendResults,
			introMs: INTRO_MS,
			responseWindowMs: RESPONSE_WINDOW_MS,
			feedbackMs: FEEDBACK_MS,
			itiMs: ITI_MS,
			rng: mulberry32(SEED)
		});

		for (let i = 0; i < expected.length; i++) {
			await nextStimulus();
			const trial = expected[i];
			// Кружок совпадает с движком: и цвет, и позиция.
			expect(circle()!.dataset.color).toBe(trial.color);
			expect(circle()!.dataset.position).toBe(trial.position);
			// Блок 1 — клавиатура (red/blue → стрелки left/right), остальное кнопками.
			await answerColor(trial.color, trial.block === 1 ? arrowFor(trial.color) : null);
		}

		await waitFor('finished phase', () => panel()?.dataset.phase === 'finished');

		// Контракт завершения: ровно по одному вызову.
		expect(props.gameEnd).toHaveBeenCalledTimes(1);
		expect(props.sendResults).toHaveBeenCalledTimes(1);

		const results = props.results();
		expect(results).toHaveLength(35);
		expect(results.map((r) => r.trialIndex)).toEqual(Array.from({ length: 35 }, (_, i) => i + 1));
		// Все ответы верные, таймаутов нет.
		expect(results.every((r) => r.isCorrect)).toBe(true);
		expect(results.every((r) => !r.timedOut)).toBe(true);
		// Время ответа внутри окна и положительное.
		for (const r of results) {
			expect(r.responseTimeMs).toBeGreaterThan(0);
			expect(r.responseTimeMs).toBeLessThan(RESPONSE_WINDOW_MS);
		}

		// Мета упражнения (константы движка, а не инъекция теста).
		expect(props.meta()).toEqual({ blocks: '5+10+20', windowMs: '3000' });

		unmount();
		// Полный прогон 35 проб флакует под параллельной нагрузкой client-прогона CI.
	}, 120_000);

	it('неверный ответ: isCorrect false, цвет нажатой кнопки зафиксирован как ответ', async () => {
		const expected = buildSession(mulberry32(SEED));
		const props = makeProps();
		const { unmount } = await render(Playground, {
			gameEnd: props.gameEnd,
			sendResults: props.sendResults,
			introMs: INTRO_MS,
			responseWindowMs: RESPONSE_WINDOW_MS,
			feedbackMs: FEEDBACK_MS,
			itiMs: ITI_MS,
			rng: mulberry32(SEED)
		});

		// Первая проба: намеренно неправильный цвет (в блоке 1 только red/blue).
		await nextStimulus();
		const first = expected[0];
		const wrongColor: SimonColor = first.color === 'red' ? 'blue' : 'red';
		expect(circle()!.dataset.color).toBe(first.color);
		await userEvent.click(button(wrongColor)!);
		await waitFor('feedback phase', () => panel()?.dataset.phase === 'feedback');
		expect(phrase()?.textContent).toBe('Ошибка');

		// Остальные пробы доигрываем верно, чтобы сессия дошла до sendResults.
		for (let i = 1; i < expected.length; i++) {
			await nextStimulus();
			await answerColor(expected[i].color);
		}
		await waitFor('finished phase', () => panel()?.dataset.phase === 'finished');

		const results = props.results();
		expect(results).toHaveLength(35);
		expect(results[0].isCorrect).toBe(false);
		expect(results[0].timedOut).toBe(false);
		expect(results[0].trialIndex).toBe(1);
		expect(results.slice(1).every((r) => r.isCorrect)).toBe(true);

		unmount();
	}, 120_000);

	it('таймаут: без ответа проба ошибочная, timedOut true и время = окну', async () => {
		const expected = buildSession(mulberry32(SEED));
		const props = makeProps();
		// Короткое окно только для таймаутной первой пробы; остальные пробы
		// доигрываем сразу по появлению кружка (клик укладывается в окно).
		const SHORT_WINDOW_MS = 1000;
		const { unmount } = await render(Playground, {
			gameEnd: props.gameEnd,
			sendResults: props.sendResults,
			introMs: INTRO_MS,
			responseWindowMs: SHORT_WINDOW_MS,
			feedbackMs: FEEDBACK_MS,
			itiMs: ITI_MS,
			rng: mulberry32(SEED)
		});

		// Первая проба: не отвечаем — окно истекает само.
		await nextStimulus();
		await waitFor('feedback phase', () => panel()?.dataset.phase === 'feedback');
		expect(phrase()?.textContent).toBe('Ошибка');

		for (let i = 1; i < expected.length; i++) {
			await nextStimulus();
			await answerColor(expected[i].color);
		}
		await waitFor('finished phase', () => panel()?.dataset.phase === 'finished');

		const results = props.results();
		expect(results[0].timedOut).toBe(true);
		expect(results[0].isCorrect).toBe(false);
		expect(results[0].responseTimeMs).toBe(SHORT_WINDOW_MS);
		// Мета — константы движка, а не инъекция теста.
		expect(props.meta()).toEqual({ blocks: '5+10+20', windowMs: '3000' });

		unmount();
	}, 120_000);
});

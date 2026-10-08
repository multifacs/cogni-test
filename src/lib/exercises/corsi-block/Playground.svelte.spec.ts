import { userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Playground from './Playground.svelte';
import '../../../app.css';
import type { MetaResult } from '$lib/exercises/types';
import type { CorsiBlockResult } from './types';
import { createGameState } from './logic/engine';

/** Ускоренные фазы — компонент принимает их через пропы (инъекция времени).
 *  Окно ответа (4000 мс) должно вмещать 6 trusted-кликов userEvent по
 *  Tailwind-минишеням; отдельный таймаут-тест использует своё короткое окно. */
const INTRO_MS = 100;
const PRESENT_MS = 150;
const GAP_MS = 80;
const FEEDBACK_MS = 150;
const ANSWER_TIMEOUT_MS = 4000;

/** Детерминированный ГПСЧ (mulberry32): одинаковый сид → одинаковые доска и
 *  последовательности. Фабрика выдаёт СВЕЖИЙ поток на каждый вызов: компонент и
 *  «эталонный» прогон движка потребляют одинаковый поток независимо. */
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
		results: () => sendResults.mock.calls[0]?.[0].results as CorsiBlockResult[],
		meta: () => sendResults.mock.calls[0]?.[0].meta as Record<string, string>
	};
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function panel(): HTMLElement | null {
	return document.querySelector<HTMLElement>('[data-phase]');
}

/** Фраза состояния над полем («Запоминай» / «Повтори» / «Верно» / «Ошибка»). */
function phrase(): HTMLElement | null {
	return document.querySelector<HTMLElement>('.phase-phrase');
}

/** Все кружки-прогресса (9 штук, один на заход). */
function dots(): HTMLElement[] {
	return [...document.querySelectorAll<HTMLElement>('.progress-dot')];
}

/** Пройденные кружки: заходы до текущего включительно уже завершены. */
function pastCount(): number {
	return dots().filter((d) => d.dataset.state === 'past').length;
}

/** Квадрат по индексу (data-square-index — тестовый хук Playground). */
function square(index: number): HTMLElement | null {
	return document.querySelector<HTMLElement>(`[data-square-index="${index}"]`);
}

/** Индекс подсвеченного квадрата или null (data-lit — тестовый хук). */
function litSquare(): number | null {
	const el = document.querySelector<HTMLElement>('[data-lit="true"]');
	return el ? Number(el.dataset.squareIndex) : null;
}

/** Первый кликнутый (синий) квадрат или null (data-clicked — тестовый хук). */
function clickedSquare(): HTMLElement | null {
	return document.querySelector<HTMLElement>('[data-clicked="true"]');
}

async function waitFor(what: string, predicate: () => boolean, timeoutMs = 5000) {
	const start = performance.now();
	while (performance.now() - start < timeoutMs) {
		if (predicate()) return;
		await sleep(25);
	}
	throw new Error(`Timed out waiting for: ${what}`);
}

/** Поллинг с шагом 10 мс: окно подсвета короткое (PRESENT_MS=150), 25 мс может
 *  проскочить момент между гашением и следующей подсветкой. */
async function waitForFast(what: string, predicate: () => boolean, timeoutMs = 5000) {
	const start = performance.now();
	while (performance.now() - start < timeoutMs) {
		if (predicate()) return;
		await sleep(10);
	}
	throw new Error(`Timed out waiting for: ${what}`);
}

/** Записывает порядок подсветки текущего захода прямо из DOM (data-lit) и
 *  дожидается фазы recall. Полностью детерминировано: не зависит от rng. */
async function recordSequence(): Promise<number[]> {
	await waitForFast('presentation phase', () => panel()?.dataset.phase === 'presentation');
	const seq: number[] = [];
	for (;;) {
		await waitForFast(
			'lit square or phase change',
			() => panel()?.dataset.phase !== 'presentation' || litSquare() !== null
		);
		if (panel()?.dataset.phase !== 'presentation') break;
		seq.push(litSquare()!);
		await waitForFast('square unlit', () => litSquare() === null);
	}
	await waitForFast('recall phase', () => panel()?.dataset.phase === 'recall');
	return seq;
}

async function playCorrectRound() {
	const seq = await recordSequence();
	for (const index of seq) {
		await userEvent.click(square(index)!);
	}
	await waitFor('feedback phase', () => panel()?.dataset.phase === 'feedback');
}

async function playWrongRound() {
	const seq = await recordSequence();
	// Квадрат, гарантированно отличный от первого в последовательности.
	const wrong = (seq[0] + 1) % 9;
	await userEvent.click(square(wrong)!);
	await waitFor('feedback phase', () => panel()?.dataset.phase === 'feedback');
}

async function playTimeoutRound() {
	await recordSequence();
	// Не кликаем: раунд завершится таймаутом answerTimeoutMs.
	await waitFor('feedback phase', () => panel()?.dataset.phase === 'feedback');
}

describe('Corsi block playground — click-through', () => {
	it('верный заход: клики по последовательности → «Верно», следующий заход длиннее; доска свёрена с движком', async () => {
		// Сверка с движком: тот же сид даёт ту же доску и первую последовательность.
		const expected = createGameState(mulberry32(SEED));
		expect(expected.sequenceLength).toBe(3);

		const props = makeProps();
		const { unmount } = await render(Playground, {
			gameEnd: props.gameEnd,
			sendResults: props.sendResults,
			introMs: INTRO_MS,
			presentMs: PRESENT_MS,
			gapMs: GAP_MS,
			feedbackMs: FEEDBACK_MS,
			answerTimeoutMs: ANSWER_TIMEOUT_MS,
			rng: mulberry32(SEED)
		});

		expect(dots()).toHaveLength(9);
		expect(dots()[0].dataset.state).toBe('current');
		expect(pastCount()).toBe(0);

		const seq = await recordSequence();
		// Порядок подсветки совпадает с последовательностью движка
		expect(seq).toEqual(expected.sequence);

		// Доска: центры ВСЕХ квадратов совпадают с движковыми (% от панели)
		for (let i = 0; i < expected.board.length; i++) {
			const el = square(i)!;
			expect(Number.parseFloat(el.style.left) / 100).toBeCloseTo(expected.board[i].x, 5);
			expect(Number.parseFloat(el.style.top) / 100).toBeCloseTo(expected.board[i].y, 5);
		}

		for (const index of seq) {
			await userEvent.click(square(index)!);
		}
		await waitFor('feedback phase', () => panel()?.dataset.phase === 'feedback');
		expect(phrase()?.textContent).toBe('Верно');

		// Рост длины: следующий заход показывает 4 подсвета (3 + 1)
		const nextSeq = await recordSequence();
		expect(nextSeq).toHaveLength(4);
		expect(dots()[0].dataset.state).toBe('past');
		expect(dots()[1].dataset.state).toBe('current');

		unmount();
	}, 20000);

	it('неверный клик: раунд сразу ошибочный, длина повторяется с новой последовательностью', async () => {
		const props = makeProps();
		const { unmount } = await render(Playground, {
			gameEnd: props.gameEnd,
			sendResults: props.sendResults,
			introMs: INTRO_MS,
			presentMs: PRESENT_MS,
			gapMs: GAP_MS,
			feedbackMs: FEEDBACK_MS,
			answerTimeoutMs: ANSWER_TIMEOUT_MS,
			rng: mulberry32(SEED)
		});

		const seq = await recordSequence();
		expect(seq).toHaveLength(3);

		// Клик по чужому квадрату завершает раунд НЕМЕДЛЕННО — до истечения окна.
		const wrong = (seq[0] + 1) % 9;
		await userEvent.click(square(wrong)!);
		await waitFor('feedback phase', () => panel()?.dataset.phase === 'feedback');
		expect(phrase()?.textContent).toBe('Ошибка');
		// Неверный клик виден в фиде: квадрат остаётся подсвеченным синим.
		expect(square(wrong)!.dataset.clicked).toBe('true');

		// Ошибка не удлиняет последовательность, но она всегда новая (вариант B)
		const nextSeq = await recordSequence();
		expect(nextSeq).toHaveLength(3);
		expect(nextSeq).not.toEqual(seq);
		expect(pastCount()).toBe(1);

		unmount();
	}, 20000);

	it('таймаут: без кликов раунд ошибочный, длина повторяется', async () => {
		const props = makeProps();
		const { unmount } = await render(Playground, {
			gameEnd: props.gameEnd,
			sendResults: props.sendResults,
			introMs: INTRO_MS,
			presentMs: PRESENT_MS,
			gapMs: GAP_MS,
			feedbackMs: FEEDBACK_MS,
			// Короткое окно: кликов нет, длинное окно только тормозило бы тест.
			answerTimeoutMs: 600,
			rng: mulberry32(SEED)
		});

		await recordSequence();
		await waitFor('feedback phase', () => panel()?.dataset.phase === 'feedback');
		expect(phrase()?.textContent).toBe('Ошибка');

		const nextSeq = await recordSequence();
		expect(nextSeq).toHaveLength(3);
		expect(pastCount()).toBe(1);

		unmount();
	}, 15000);

	it('клик в фазе presentation игнорируется: фаза не меняется, результат не создаётся, раунд продолжается', async () => {
		const props = makeProps();
		const { unmount } = await render(Playground, {
			gameEnd: props.gameEnd,
			sendResults: props.sendResults,
			introMs: INTRO_MS,
			presentMs: PRESENT_MS,
			gapMs: GAP_MS,
			feedbackMs: FEEDBACK_MS,
			answerTimeoutMs: ANSWER_TIMEOUT_MS,
			rng: mulberry32(SEED)
		});

		await waitForFast('presentation phase', () => panel()?.dataset.phase === 'presentation');

		// Клик по квадрату во время показа последовательности — тихий no-op.
		await userEvent.click(square(0)!);

		// Фаза не сменилась: мы всё ещё в presentation, а не в recall/feedback.
		expect(panel()?.dataset.phase).toBe('presentation');

		// Раунд продолжается: последовательность доигрывается до конца и
		// происходит нормальный переход в recall.
		await waitForFast(
			'recall phase after ignored click',
			() => panel()?.dataset.phase === 'recall'
		);

		// Результата пока нет: sendResults вызывается только после 9 заходов.
		expect(props.sendResults).not.toHaveBeenCalled();
		expect(props.results()).toBeUndefined();

		unmount();
	}, 20000);

	it('recall: кликнутые квадраты подсвечены синим до конца фазы, на новом заходе подсветка сброшена', async () => {
		const props = makeProps();
		const { unmount } = await render(Playground, {
			gameEnd: props.gameEnd,
			sendResults: props.sendResults,
			introMs: INTRO_MS,
			presentMs: PRESENT_MS,
			gapMs: GAP_MS,
			feedbackMs: FEEDBACK_MS,
			answerTimeoutMs: ANSWER_TIMEOUT_MS,
			rng: mulberry32(SEED)
		});

		const seq = await recordSequence();
		// До ввода синих (кликнутых) квадратов нет.
		expect(clickedSquare()).toBeNull();

		// Верный клик: квадрат загорается синим (data-clicked) и остаётся
		// подсвеченным — индикатор прогресса ввода.
		await userEvent.click(square(seq[0])!);
		expect(square(seq[0])!.dataset.clicked).toBe('true');

		await userEvent.click(square(seq[1])!);
		expect(square(seq[1])!.dataset.clicked).toBe('true');

		// Некликнутый квадрат подсвеченным не становится.
		const untouched = [0, 1, 2, 3, 4, 5, 6, 7, 8].find((i) => !seq.includes(i))!;
		expect(square(untouched)!.dataset.clicked).toBeUndefined();

		// Завершаем раунд верными кликами → feedback: подсветка ввода видна.
		for (let i = 2; i < seq.length; i++) {
			await userEvent.click(square(seq[i])!);
		}
		await waitFor('feedback phase', () => panel()?.dataset.phase === 'feedback');
		for (const index of seq) {
			expect(square(index)!.dataset.clicked).toBe('true');
		}

		// Новый заход: в presentation синих нет (showClicked гейтится фазой)…
		await waitForFast('next presentation', () => panel()?.dataset.phase === 'presentation');
		expect(clickedSquare()).toBeNull();

		// …и в recall нового захода подсветка сброшена (clear на старте фазы).
		const nextSeq = await recordSequence();
		expect(clickedSquare()).toBeNull();
		expect(nextSeq).toHaveLength(4);

		unmount();
	}, 20000);

	it('полный прогон: 9 заходов (верно/неверно/таймаут), sendResults ровно один раз, gameEnd вызван', async () => {
		const props = makeProps();
		const { unmount } = await render(Playground, {
			gameEnd: props.gameEnd,
			sendResults: props.sendResults,
			introMs: INTRO_MS,
			presentMs: PRESENT_MS,
			gapMs: GAP_MS,
			feedbackMs: FEEDBACK_MS,
			answerTimeoutMs: ANSWER_TIMEOUT_MS,
			rng: mulberry32(SEED)
		});

		// Заходы 1–2 верные (длина растёт 3→4→5), 3 — неверный клик,
		// 4 — таймаут, 5 — верный (5→6), 6–9 — неверные клики (длина 6).
		await playCorrectRound();
		await playCorrectRound();
		await playWrongRound();
		await playTimeoutRound();
		await playCorrectRound();
		await playWrongRound();
		await playWrongRound();
		await playWrongRound();
		await playWrongRound();

		await waitFor('finished phase', () => panel()?.dataset.phase === 'finished');
		// При finished кружки-прогресс скрываются (паттерн dot-position).
		expect(dots()).toHaveLength(0);

		// Контракт завершения: ровно по одному вызову
		expect(props.gameEnd).toHaveBeenCalledTimes(1);
		expect(props.sendResults).toHaveBeenCalledTimes(1);

		const results = props.results();
		expect(results).toHaveLength(9);
		expect(results.map((r) => r.attempt)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
		expect(results.map((r) => r.sequenceLength)).toEqual([3, 4, 5, 5, 5, 6, 6, 6, 6]);
		expect(results.map((r) => r.isCorrect)).toEqual([
			true,
			true,
			false,
			false,
			true,
			false,
			false,
			false,
			false
		]);
		// Таймаут-заход (№4): ответ тарифицирован как полный таймаут
		expect(results[3].answerMs).toBe(ANSWER_TIMEOUT_MS);
		// Верно завершённые заходы: время меньше окна ответа
		for (const r of [results[0], results[1], results[4]]) {
			expect(r.answerMs).toBeLessThan(ANSWER_TIMEOUT_MS);
			expect(r.answerMs).toBeGreaterThan(0);
		}

		// Мета упражнения (константы движка, а не инъекция теста)
		expect(props.meta()).toEqual({ rounds: '9', startLength: '3', answerTimeoutMs: '15000' });

		unmount();
		// 120 с: полный прогон 9 заходов флакует под параллельной нагрузкой полного client-прогона CI.
	}, 120_000);
});

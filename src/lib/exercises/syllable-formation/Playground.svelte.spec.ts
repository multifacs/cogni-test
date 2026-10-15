import '../../../app.css';
import { page, userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Playground from './Playground.svelte';
import { validateAssociation } from './logic/validation';
import type { SyllableFormationAttemptRow, SyllablePair } from './types';

/** Протокол мока воркера интервалов (см. vi.mock ниже). */
type MockIntervalWorker = {
	onmessage: ((e: { data: string }) => void) | null;
	postMessage: ReturnType<typeof vi.fn>;
	terminate: ReturnType<typeof vi.fn>;
};

const workerInstances = vi.hoisted(() => [] as MockIntervalWorker[]);

/** Мок веб-воркера: тот же протокол (start/stop/tick, тик раз в секунду),
 *  но в основном потоке — позволяет ассертить terminate. Реальный воркер
 *  покрыт косвенно: все переходы по таймауту идут через тики мока. */
vi.mock('$lib/workers/interval_worker.ts?worker', () => {
	return {
		default: class {
			onmessage: ((e: { data: string }) => void) | null = null;
			timer: ReturnType<typeof setInterval> | undefined;
			postMessage = vi.fn((msg: string) => {
				if (msg === 'start' && this.timer === undefined) {
					this.timer = setInterval(() => this.onmessage?.({ data: 'tick' }), 1000);
				}
				if (msg === 'stop') {
					clearInterval(this.timer);
					this.timer = undefined;
				}
			});
			terminate = vi.fn(() => {
				clearInterval(this.timer);
				this.timer = undefined;
			});
			constructor() {
				workerInstances.push(this as unknown as MockIntervalWorker);
			}
		}
	};
});

/** Кандидаты ассоциаций: первый прошедший validateAssociation для конкретной
 *  пары используется в тесте. Список с запасом — генерация случайна. */
const CANDIDATE_ASSOCIATIONS = [
	'море',
	'поезд',
	'кошка',
	'лес',
	'дом',
	'зелёный трактор',
	'старый шкаф',
	'тихий вечер',
	'большой город',
	'тёплый чай'
];

/** 'ба-ко-ми ло-те-су' → ({ба, ко, ми}, {ло, те, су}) — обратная пара к pairToPhrase. */
function phraseToPair(phrase: string): SyllablePair {
	const [word1, word2] = phrase.trim().split(' ');
	return { word1: word1.split('-'), word2: word2.split('-') };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(what: string, predicate: () => boolean, timeoutMs = 10_000) {
	const start = performance.now();
	while (performance.now() - start < timeoutMs) {
		if (predicate()) return;
		await sleep(25);
	}
	throw new Error(`Timed out waiting for: ${what}`);
}

function memorizeInput(): HTMLInputElement | null {
	return document.querySelector<HTMLInputElement>('#association-input');
}

function recallInput(): HTMLInputElement | null {
	return document.querySelector<HTMLInputElement>('#recall-input');
}

function memorizePhrase(): string {
	const el = document.querySelector<HTMLElement>('[data-testid="memorize-phrase"]');
	if (!el?.textContent) throw new Error('memorize phrase not rendered');
	return el.textContent.trim();
}

function recallAssociation(): string {
	const el = document.querySelector<HTMLElement>('[data-testid="recall-association"]');
	if (!el?.textContent) throw new Error('recall association not rendered');
	return el.textContent.trim();
}

function makeProps() {
	return { gameEnd: vi.fn(), sendResults: vi.fn() };
}

function rows(props: { sendResults: ReturnType<typeof vi.fn> }): SyllableFormationAttemptRow[] {
	return props.sendResults.mock.calls[0]?.[0] as SyllableFormationAttemptRow[];
}

/** Вводит валидную ассоциацию на текущем memorize-шаге и сабмитит.
 *  Ассоциация подбирается по реальной паре из DOM через validateAssociation. */
async function answerMemorizeStep(associationToPhrase: Map<string, string>) {
	const phrase = memorizePhrase();
	const pair = phraseToPair(phrase);
	// Кандидат должен быть уникален по сессии: map «ассоциация → фраза» —
	// источник фразы на recall-этапе, одинаковые ключи затёрли бы друг друга.
	const association = CANDIDATE_ASSOCIATIONS.find(
		(c) => !associationToPhrase.has(c) && validateAssociation(c, pair).valid
	);
	if (!association) throw new Error(`no valid candidate association for phrase: ${phrase}`);
	associationToPhrase.set(association, phrase);
	await userEvent.fill(page.getByRole('textbox'), association);
	await userEvent.click(page.getByRole('button'));
}

describe('Syllable formation playground — click-through', () => {
	it('happy path: 5 ассоциаций + 5 верных восстановлений → все строки isCorrect, gameEnd один раз', async () => {
		const props = makeProps();
		const { unmount } = await render(Playground, {
			gameEnd: props.gameEnd,
			sendResults: props.sendResults,
			timeLimitMs: 60_000
		});

		await userEvent.click(page.getByRole('button')); // «Начать»

		const associationToPhrase = new Map<string, string>();
		for (let i = 0; i < 5; i++) {
			await waitFor(`memorize input ${i + 1}`, () => memorizeInput() !== null);
			await answerMemorizeStep(associationToPhrase);
		}

		for (let i = 0; i < 5; i++) {
			await waitFor(`recall input ${i + 1}`, () => recallInput() !== null);
			const phrase = associationToPhrase.get(recallAssociation());
			if (!phrase) throw new Error('recall association not matched to a memorized phrase');
			await userEvent.fill(page.getByRole('textbox'), phrase);
			await userEvent.click(page.getByRole('button'));
		}

		await waitFor('sendResults', () => props.sendResults.mock.calls.length === 1);

		const result = rows(props);
		expect(result).toHaveLength(5);
		expect(result.map((r) => r.pairIndex)).toEqual([1, 2, 3, 4, 5]);
		for (const r of result) {
			expect(r.association).toBeTruthy();
			expect(r.isCorrect).toBe(true);
			expect(r.timedOut).toBe(false);
			expect(r.recalledPhrase).toBeTruthy();
			expect(r.reactionTimeMs).toBeGreaterThan(0);
			expect(r.associationMs).toBeGreaterThan(0);
		}
		expect(props.gameEnd).toHaveBeenCalledTimes(1);

		unmount();
	}, 30_000);

	it('все таймауты на memorize: 5 строк без ассоциаций, associationMs = timeLimitMs, reactionTimeMs = 0', async () => {
		const props = makeProps();
		const { unmount } = await render(Playground, {
			gameEnd: props.gameEnd,
			sendResults: props.sendResults,
			// Тик воркера раз в секунду: каждый неотвеченный шаг завершается первым тиком.
			timeLimitMs: 300
		});

		await userEvent.click(page.getByRole('button')); // «Начать»
		await waitFor('memorize input', () => memorizeInput() !== null);

		// Ничего не вводим: 5 авто-переходов ≈ 5-6 с.
		await waitFor('sendResults', () => props.sendResults.mock.calls.length === 1, 20_000);

		const result = rows(props);
		expect(result).toHaveLength(5);
		expect(result.map((r) => r.pairIndex)).toEqual([1, 2, 3, 4, 5]);
		for (const r of result) {
			expect(r.association).toBeNull();
			expect(r.isCorrect).toBe(false);
			expect(r.timedOut).toBe(true);
			expect(r.associationMs).toBe(300);
			expect(r.reactionTimeMs).toBe(0);
			expect(r.recalledPhrase).toBeFalsy();
		}
		expect(props.gameEnd).toHaveBeenCalledTimes(1);

		// После завершения таймер остановлен: лишние тики не создают новых результатов.
		await sleep(1500);
		expect(props.sendResults).toHaveBeenCalledTimes(1);
		expect(props.gameEnd).toHaveBeenCalledTimes(1);

		unmount();
	}, 30_000);

	it('mixed: первая пара отвечена верно, остальные 4 — таймауты на memorize', async () => {
		const props = makeProps();
		const { unmount } = await render(Playground, {
			gameEnd: props.gameEnd,
			sendResults: props.sendResults,
			timeLimitMs: 300
		});

		await userEvent.click(page.getByRole('button')); // «Начать»
		await waitFor('memorize input', () => memorizeInput() !== null);

		// Шаг 1: запоминаем показанное сочетание, успеваем ответить до первого тика (~1 с).
		const step1Phrase = memorizePhrase();
		await answerMemorizeStep(new Map());

		// Шаги 2-5: таймауты без ввода.
		await waitFor('recall input', () => recallInput() !== null, 20_000);

		// Recall по единственной паре с ассоциацией: восстанавливаем сочетание верно.
		await userEvent.fill(page.getByRole('textbox'), step1Phrase);
		await userEvent.click(page.getByRole('button'));

		await waitFor('sendResults', () => props.sendResults.mock.calls.length === 1);

		const result = rows(props);
		expect(result).toHaveLength(5);
		expect(result.map((r) => r.pairIndex)).toEqual([1, 2, 3, 4, 5]);

		const answered = result.filter((r) => r.association !== null);
		expect(answered).toHaveLength(1);
		expect(answered[0].pairIndex).toBe(1);
		expect(answered[0].isCorrect).toBe(true);
		expect(answered[0].timedOut).toBe(false);
		expect(answered[0].recalledPhrase).toBeTruthy();

		const timedOutRows = result.filter((r) => r.association === null);
		expect(timedOutRows).toHaveLength(4);
		for (const r of timedOutRows) {
			expect(r.timedOut).toBe(true);
			expect(r.isCorrect).toBe(false);
			expect(r.associationMs).toBe(300);
			expect(r.recalledPhrase).toBeFalsy();
		}
		expect(props.gameEnd).toHaveBeenCalledTimes(1);

		unmount();
	}, 30_000);

	it('worker cleanup: unmount во время memorize вызывает terminate и не порождает результатов', async () => {
		const props = makeProps();
		const { unmount } = await render(Playground, {
			gameEnd: props.gameEnd,
			sendResults: props.sendResults,
			timeLimitMs: 60_000
		});

		await userEvent.click(page.getByRole('button')); // «Начать»
		await waitFor('memorize input', () => memorizeInput() !== null);

		const worker = workerInstances.at(-1);
		expect(worker).toBeTruthy();

		unmount();

		expect(worker!.terminate).toHaveBeenCalledTimes(1);
		// После unmount тики остановлены: игра не завершается сама.
		await sleep(1500);
		expect(props.sendResults).not.toHaveBeenCalled();
		expect(props.gameEnd).not.toHaveBeenCalled();
	}, 15_000);
});

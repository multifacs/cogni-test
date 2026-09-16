import { render, cleanup } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startStreaming, streaming } from '$lib/stores/streaming.svelte';
import type { TestData } from '$lib/tests';
import Page from './+page.svelte';
import type { DevAction } from '$lib/types/header-action';

// app.css подключает Tailwind — без него утилиты не сгенерируются
// в тестовом окружении (обязательный импорт browser-спеков проекта)
import '../../../../../app.css';

// ─── Хоистированные моки ──────────────────────────────────────────────

const navMocks = vi.hoisted(() => ({
	goto: vi.fn<(path: string) => Promise<void>>(() => Promise.resolve()),
	resolve: vi.fn((path: string) => path),
	url: {
		pathname: '/tests/stroop/playground',
		searchParams: new URLSearchParams()
	}
}));

vi.mock('$app/state', () => ({
	page: { url: navMocks.url }
}));

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => navMocks.goto(...(args as [string]))
}));

vi.mock('$app/paths', () => ({
	resolve: (path: string) => navMocks.resolve(path)
}));

// Оффлайн-очередь заменена шпионом: спек проверяет контракт страницы
// (enqueue с kind 'test' при сбое POST), а не саму очередь.
const queueMocks = vi.hoisted(() => ({
	// тип дженериком: параметры не объявляются в реализации (no-unused-vars),
	// но mock.calls[0] остаётся типизированным кортежем для ассертов
	enqueueAttempt: vi.fn<
		(
			slug: string,
			payload: { sessionId: string; results: unknown },
			kind?: string
		) => Promise<string>
	>(() => Promise.resolve('queue-el-1'))
}));

vi.mock('$lib/client/offline-queue', () => ({
	enqueueAttempt: queueMocks.enqueueAttempt
}));

// Реестр тестов заменён стабом: спек проверяет контракт страницы
// (gameEnd/sendResults wiring), а не рендер конкретной игры.
// game-stub даёт DOM-кнопки для вызова пропсов из теста.
vi.mock('$lib/tests', async () => {
	const { default: GameStub } = await import('$lib/testing/game-stub.svelte');
	return {
		testRegistry: {
			stroop: {
				title: 'Струп',
				playground: async () => ({ default: GameStub })
			}
		}
	};
});

// ─── Хелперы ──────────────────────────────────────────────────────────

type HeaderContext = { value: string; devAction: DevAction };

const SAMPLE_RESULTS = { correct: 7, wrong: 3, time: 1200 };

// game-stub отправляет MetaResult-форму ({ results, meta }) — см. $lib/testing/game-stub.svelte
const STUB_RESULTS = { results: [{ answer: 3, correct: true }], meta: {} };

// Фикстура streaming-очереди: stroop (текущий) + math (другой) — ассерты
// проверяют снятие именно stroop, а не очистку всей очереди.
const STREAM_TESTS: TestData[] = [
	{ name: 'stroop', title: 'Струп', path: '/tests/stroop/about', img: '' },
	{ name: 'math', title: 'Быстрый счет', path: '/tests/math/about', img: '' }
];

/** Имена тестов в streaming-очереди (для ассертов снятия). */
function queueNames(): string[] {
	return streaming.queue.map((item) => item.name);
}

function jsonResponse(payload: unknown) {
	return { ok: true, json: async () => payload };
}

function failedResponse() {
	return { ok: false, status: 500, json: async () => ({}) };
}

const fetchMock = vi.fn<(input: unknown, init?: RequestInit) => Promise<unknown>>();

/** Разворачивает тело POST-вызова fetch по индексу. */
function postCall(index: number) {
	const call = fetchMock.mock.calls[index];
	if (!call) throw new Error(`fetch call #${index} not recorded`);
	return { url: String(call[0]), body: JSON.parse(String(call[1]?.body)) };
}

/** Даёт $effect и динамическому import игровой компоненты отработать. */
async function settle(ms = 50) {
	await new Promise((r) => setTimeout(r, ms));
}

async function mountPage(data: Record<string, unknown>) {
	const ctx: HeaderContext = { value: 'Струп', devAction: null };
	const result = await render(Page, {
		props: { data } as never,
		// (app) layout в реальном приложении задаёт контекст headerText;
		// mount-опция context даёт странице тот же getContext('headerText')
		context: new Map([['headerText', ctx]])
	});
	await settle();
	return { ...result, ctx };
}

// ─── Хуки ─────────────────────────────────────────────────────────────

beforeEach(() => {
	// дефолт: любой POST успешен (generate-random и save)
	fetchMock.mockReset();
	fetchMock.mockImplementation(async () => jsonResponse({ results: SAMPLE_RESULTS }));
	vi.stubGlobal('fetch', fetchMock);
	navMocks.url.searchParams = new URLSearchParams();
	// streaming-store — module-level $state: сброс между кейсами обязателен,
	// иначе очередь утекает в следующий тест
	startStreaming([], {});
	queueMocks.enqueueAttempt.mockReset();
	queueMocks.enqueueAttempt.mockImplementation(async () => 'queue-el-1');
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	fetchMock.mockClear();
	navMocks.goto.mockClear();
	navMocks.resolve.mockClear();
	queueMocks.enqueueAttempt.mockClear();
});

// ─── Тесты ────────────────────────────────────────────────────────────

describe('tests playground — devAction «Автопрохождение»', () => {
	it('в DEV-режиме регистрирует кнопку с label и прямой ссылкой onclick', async () => {
		const { ctx } = await mountPage({ slug: 'stroop', isDevMode: true });

		expect(ctx.devAction).not.toBeNull();
		expect(ctx.devAction!.label).toBe('Автопрохождение');
		expect(typeof ctx.devAction!.onclick).toBe('function');
	});

	it('onclick: POST generate-random → сохранение → goto на страницу результатов ровно один раз', async () => {
		const { ctx } = await mountPage({ slug: 'stroop', isDevMode: true });

		await ctx.devAction!.onclick();

		// первый запрос — генерация случайных результатов
		const generate = postCall(0);
		expect(generate.url).toBe('/tests/stroop/playground');
		expect(generate.body.action).toBe('generate-random');

		// второй — сохранение через onSendResults (standalone-ветка)
		const save = postCall(1);
		expect(save.url).toBe('/tests/stroop/playground');
		expect(save.body.results).toEqual(SAMPLE_RESULTS);
		expect(save.body.action).toBeUndefined();
		expect(typeof save.body.sessionId).toBe('string');

		// навигация теперь внутри onSendResults — ровно один goto
		expect(navMocks.goto).toHaveBeenCalledTimes(1);
		expect(navMocks.goto).toHaveBeenCalledWith('/tests/stroop/results');
	});

	it('onclick в GTO-режиме: сохранение без вызова goto результатов (переход внутри onSendResults)', async () => {
		navMocks.url.searchParams = new URLSearchParams('gtoSessionId=42');
		fetchMock.mockImplementation(async (input: unknown) => {
			if (String(input).includes('/gto/')) {
				return jsonResponse({ nextTestUrl: '/tests/raven-matrices/about?gtoSessionId=42' });
			}
			return jsonResponse({ results: SAMPLE_RESULTS });
		});

		const { ctx } = await mountPage({ slug: 'stroop', isDevMode: true });
		await ctx.devAction!.onclick();

		const save = postCall(1);
		expect(save.url).toBe('/gto/session/42/play');
		expect(save.body.action).toBe('save-result');
		expect(save.body.testType).toBe('stroop');
		expect(save.body.results).toEqual(SAMPLE_RESULTS);

		// goto — только переход nextTestUrl из ответа GTO, не страница результатов
		expect(navMocks.goto).toHaveBeenCalledTimes(1);
		expect(navMocks.goto).toHaveBeenCalledWith('/tests/raven-matrices/about?gtoSessionId=42');
	});

	it('без isDevMode ничего не регистрирует и не падает', async () => {
		const { ctx } = await mountPage({ slug: 'stroop' });

		expect(ctx.devAction).toBeNull();
		expect(fetchMock).not.toHaveBeenCalled();
		expect(navMocks.goto).not.toHaveBeenCalled();
	});

	it('с неизвестным слагом (не в реестре) кнопка не регистрируется', async () => {
		const { ctx } = await mountPage({ slug: 'unknown-test', isDevMode: true });

		expect(ctx.devAction).toBeNull();
	});

	it('без контекста headerText страница не падает и ничего не регистрирует (null-guard)', async () => {
		// контекст (app)-layout отсутствует (например, рендер вне layout):
		// guard headerContext должен молча пропустить регистрацию devAction
		const result = await render(Page, {
			props: { data: { slug: 'stroop', isDevMode: true } } as never,
			context: new Map()
		});
		await settle();

		// сам факт успешного рендера без throw — и есть проверка guard
		expect(result.container).toBeTruthy();
		expect(fetchMock).not.toHaveBeenCalled();
		expect(navMocks.goto).not.toHaveBeenCalled();

		await result.unmount();
	});

	it('сбрасывает devAction при размонтировании (кнопка не утекает на другие страницы)', async () => {
		const { ctx, unmount } = await mountPage({ slug: 'stroop', isDevMode: true });
		expect(ctx.devAction).not.toBeNull();

		await unmount();
		expect(ctx.devAction).toBeNull();
	});
});

describe('tests playground — await-before-navigate контракт onSendResults', () => {
	it('(a) goto вызывается только ПОСЛЕ разрешения save-fetch (deferred fetch)', async () => {
		let resolveSave!: () => void;
		const saveDeferred = new Promise<void>((r) => (resolveSave = r));
		fetchMock.mockImplementation(async (_input: unknown, init?: RequestInit) => {
			const body = JSON.parse(String(init?.body ?? '{}'));
			if (body.action === 'generate-random') return jsonResponse({ results: SAMPLE_RESULTS });
			await saveDeferred;
			return jsonResponse({ sessionId: 'sess-1' });
		});

		const { ctx } = await mountPage({ slug: 'stroop', isDevMode: true });
		const autoplay = ctx.devAction!.onclick();
		await settle();

		// сохранение ещё в полёте — навигации нет
		expect(navMocks.goto).not.toHaveBeenCalled();

		resolveSave();
		await autoplay;

		expect(navMocks.goto).toHaveBeenCalledTimes(1);
		expect(navMocks.goto).toHaveBeenCalledWith('/tests/stroop/results');
	});

	it('(b) POST save !ok: enqueueAttempt(kind test) → goto на результаты, error-UI нет', async () => {
		fetchMock.mockImplementation(async () => failedResponse());

		await mountPage({ slug: 'stroop' });

		// реальный контракт игры: gameEnd() до sendResults(), один тик
		await userEvent.click(page.getByTestId('stub-full-run'));
		await settle();

		// оффлайн-fallback: попытка поставлена в очередь с kind 'test'
		expect(queueMocks.enqueueAttempt).toHaveBeenCalledTimes(1);
		const [slugArg, payload, kindArg] = queueMocks.enqueueAttempt.mock.calls[0];
		expect(slugArg).toBe('stroop');
		expect(kindArg).toBe('test');
		expect(payload.sessionId).toBe(postCall(0).body.sessionId);
		expect(payload.results).toEqual(STUB_RESULTS);

		// навигация на страницу результатов (там красный бейдж «Ожидает загрузки»)
		expect(navMocks.goto).toHaveBeenCalledTimes(1);
		expect(navMocks.goto).toHaveBeenCalledWith('/tests/stroop/results');

		// error-UI не показывается — страница не остаётся в состоянии ошибки
		await expect
			.element(page.getByText('Не удалось сохранить результаты'))
			.not.toBeInTheDocument();
	});

	it('(b2) POST save !ok + enqueueAttempt отвергнут: goto нет, error-UI виден', async () => {
		fetchMock.mockImplementation(async () => failedResponse());
		queueMocks.enqueueAttempt.mockImplementation(async () => {
			throw new Error('quota exceeded');
		});

		await mountPage({ slug: 'stroop' });

		await userEvent.click(page.getByTestId('stub-full-run'));
		await settle();

		expect(queueMocks.enqueueAttempt).toHaveBeenCalledTimes(1);
		// отказ очереди → общий catch → saveError без навигации
		expect(navMocks.goto).not.toHaveBeenCalled();
		await expect.element(page.getByText('Не удалось сохранить результаты')).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Попробовать снова' })).toBeVisible();
	});

	it('(c) GTO-режим: /gto/ fetch !ok — goto нет, error-UI', async () => {
		navMocks.url.searchParams = new URLSearchParams('gtoSessionId=42');
		fetchMock.mockImplementation(async (input: unknown) => {
			if (String(input).includes('/gto/')) return failedResponse();
			return jsonResponse({ results: SAMPLE_RESULTS });
		});

		await mountPage({ slug: 'stroop' });

		await userEvent.click(page.getByTestId('stub-full-run'));
		await settle();

		expect(navMocks.goto).not.toHaveBeenCalled();
		await expect.element(page.getByText('Не удалось сохранить результаты')).toBeVisible();
	});

	it('(d) double-fire: второй вызов save-пути во время isSaving не дублирует POST', async () => {
		let resolveSave!: () => void;
		const saveDeferred = new Promise<void>((r) => (resolveSave = r));
		fetchMock.mockImplementation(async () => {
			await saveDeferred;
			return jsonResponse({ sessionId: 'sess-1' });
		});

		await mountPage({ slug: 'stroop' });

		const send = page.getByTestId('stub-send-only');
		await userEvent.click(send);
		// второй клик пока первый save в полёте — guard isSaving должен его съесть
		await userEvent.click(send);
		resolveSave();
		await settle();

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(navMocks.goto).toHaveBeenCalledTimes(1);
		expect(navMocks.goto).toHaveBeenCalledWith('/tests/stroop/results');
	});
});

describe('tests playground — Назад disabled в потоковом режиме', () => {
	it('(i) очередь непуста без GTO: during-game «Назад» disabled', async () => {
		startStreaming(STREAM_TESTS, {});

		await mountPage({ slug: 'stroop' });

		// isGameEnd=false после mount — единственная «Назад» в DOM (нижняя панель)
		await expect.element(page.getByRole('button', { name: 'Назад' })).toBeDisabled();
	});

	it('(ii) очередь пуста: during-game «Назад» активна', async () => {
		startStreaming([], {});

		await mountPage({ slug: 'stroop' });

		await expect.element(page.getByRole('button', { name: 'Назад' })).toBeEnabled();
	});

	it('(iii) очередь непуста + gtoSessionId: «Назад» активна (GTO не использует стрим)', async () => {
		startStreaming(STREAM_TESTS, {});
		navMocks.url.searchParams = new URLSearchParams('gtoSessionId=42');

		await mountPage({ slug: 'stroop' });

		await expect.element(page.getByRole('button', { name: 'Назад' })).toBeEnabled();
	});

	it('(iv) очередь непуста + error-screen: «Назад» disabled', async () => {
		startStreaming(STREAM_TESTS, {});
		// паттерн кейса (b2): save POST !ok + отвергнутая очередь → error-UI
		fetchMock.mockImplementation(async () => failedResponse());
		queueMocks.enqueueAttempt.mockImplementation(async () => {
			throw new Error('quota exceeded');
		});

		await mountPage({ slug: 'stroop' });
		await userEvent.click(page.getByTestId('stub-full-run'));
		await settle();

		await expect.element(page.getByText('Не удалось сохранить результаты')).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Назад' })).toBeDisabled();
	});

	it('(v) очередь непуста + end-screen: «Назад» disabled', async () => {
		startStreaming(STREAM_TESTS, {});

		await mountPage({ slug: 'stroop' });
		// дефолтный fetch-мок: save успешен → end-screen без навигации (goto-мок)
		await userEvent.click(page.getByTestId('stub-full-run'));
		await settle();

		await expect.element(page.getByRole('button', { name: 'Результаты' })).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Назад' })).toBeDisabled();
	});
});

describe('tests playground — StreamingBadge удалён со страницы', () => {
	it('(i) очередь непуста (resolved-ветка): бейджа нет', async () => {
		startStreaming(STREAM_TESTS, {});

		await mountPage({ slug: 'stroop' });

		await expect.element(page.getByText('Потоковое прохождение')).not.toBeInTheDocument();
	});

	it('(ii) очередь непуста + gtoSessionId: бейджа нет', async () => {
		startStreaming(STREAM_TESTS, {});
		navMocks.url.searchParams = new URLSearchParams('gtoSessionId=42');

		await mountPage({ slug: 'stroop' });

		await expect.element(page.getByText('Потоковое прохождение')).not.toBeInTheDocument();
	});
});

describe('tests playground — completeTest в save-оркестраторе (streaming-store)', () => {
	it('(i) standalone save 201: тест снят с очереди, goto на results', async () => {
		startStreaming(STREAM_TESTS, {});

		await mountPage({ slug: 'stroop' });
		await userEvent.click(page.getByTestId('stub-full-run'));
		await settle();

		// stroop снят с очереди, math остался
		expect(queueNames()).toEqual(['math']);
		expect(navMocks.goto).toHaveBeenCalledWith('/tests/stroop/results');
	});

	it('(ii) offline-enqueue (POST не ок): тест снят с очереди, goto на results', async () => {
		startStreaming(STREAM_TESTS, {});
		fetchMock.mockImplementation(async () => failedResponse());

		await mountPage({ slug: 'stroop' });
		await userEvent.click(page.getByTestId('stub-full-run'));
		await settle();

		expect(queueMocks.enqueueAttempt).toHaveBeenCalledTimes(1);
		expect(queueNames()).toEqual(['math']);
		expect(navMocks.goto).toHaveBeenCalledWith('/tests/stroop/results');
	});

	it('(iii) GTO-save: тест НЕ снимается с очереди', async () => {
		startStreaming(STREAM_TESTS, {});
		navMocks.url.searchParams = new URLSearchParams('gtoSessionId=42');
		fetchMock.mockImplementation(async (input: unknown) => {
			if (String(input).includes('/gto/')) {
				return jsonResponse({ nextTestUrl: '/tests/math/about?gtoSessionId=42' });
			}
			return jsonResponse({ results: SAMPLE_RESULTS });
		});

		await mountPage({ slug: 'stroop' });
		await userEvent.click(page.getByTestId('stub-full-run'));
		await settle();

		// GTO-ветка не трогает streaming-очередь
		expect(queueNames()).toEqual(['stroop', 'math']);
	});

	it('(iv) saveError (throw в catch): тест НЕ снят, goto нет', async () => {
		startStreaming(STREAM_TESTS, {});
		fetchMock.mockImplementation(async () => {
			throw new Error('network down');
		});

		await mountPage({ slug: 'stroop' });
		await userEvent.click(page.getByTestId('stub-full-run'));
		await settle();

		expect(queueNames()).toEqual(['stroop', 'math']);
		expect(navMocks.goto).not.toHaveBeenCalled();
		await expect.element(page.getByText('Не удалось сохранить результаты')).toBeVisible();
	});
});

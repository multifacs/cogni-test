import { render, cleanup } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Page from './+page.svelte';
import type { DevAction } from '$lib/types/header-action';
import { enqueueAttempt } from '$lib/client/offline-queue';

// app.css подключает Tailwind — без него утилиты не сгенерируются
// в тестовом окружении (обязательный импорт browser-спеков проекта)
import '../../../../../app.css';

// ─── Хоистированные моки ──────────────────────────────────────────────

const navMocks = vi.hoisted(() => ({
	goto: vi.fn<(url: string | URL, opts?: { invalidateAll?: boolean }) => Promise<void>>(() =>
		Promise.resolve()
	),
	resolve: vi.fn((path: string) => path),
	url: {
		pathname: '/exercises/raven-matrices/playground',
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

// Реестр упражнений заменён стабом: спек проверяет контракт страницы
// (gameEnd/sendResults wiring, devAction-регистрация), а не рендер
// конкретной игры. game-stub даёт DOM-кнопки для вызова пропсов из теста.
vi.mock('$lib/exercises', async () => {
	const { default: GameStub } = await import('$lib/testing/game-stub.svelte');
	return {
		exerciseRegistry: {
			'raven-matrices': {
				name: 'raven-matrices',
				title: 'Матрицы Равена',
				playground: async () => ({ default: GameStub }),
				result: true
			},
			rhythm: {
				name: 'rhythm',
				title: 'Ритм',
				playground: async () => ({ default: GameStub }),
				result: true
			}
		},
		EXERCISE_SLUG_TO_TEST_TYPE: {
			'raven-matrices': 'ravenMatrices',
			rhythm: 'rhythm'
		}
	};
});

// Оффлайн-очередь замокана: enqueueAttempt проверяем вызовом,
// flushQueue — fire-and-forget, в спеке достаточно резолва
vi.mock('$lib/client/offline-queue', () => ({
	enqueueAttempt: vi.fn(),
	flushQueue: vi.fn(() => Promise.resolve())
}));

// ─── Хелперы ──────────────────────────────────────────────────────────

type HeaderContext = { value: string; devAction: DevAction };

const SAMPLE_RESULTS = { results: [{ answer: 3, correct: true }], meta: {} };

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
	const ctx: HeaderContext = { value: 'Матрицы Равена', devAction: null };
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
	// enqueueAttempt теперь async: дефолт — успешная запись в очередь;
	// mockReset, чтобы реализации из тестов (e)/(f) не утекали дальше
	vi.mocked(enqueueAttempt).mockReset();
	vi.mocked(enqueueAttempt).mockResolvedValue('stub-queue-id');
	navMocks.url.searchParams = new URLSearchParams();
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	fetchMock.mockClear();
	navMocks.goto.mockClear();
	navMocks.resolve.mockClear();
});

// ─── Тесты ────────────────────────────────────────────────────────────

describe('exercises playground — devAction «Автопрохождение»', () => {
	it('в DEV-режиме регистрирует кнопку только для raven-matrices', async () => {
		const { ctx } = await mountPage({ slug: 'raven-matrices', isDevMode: true });

		expect(ctx.devAction).not.toBeNull();
		expect(ctx.devAction!.label).toBe('Автопрохождение');
		expect(typeof ctx.devAction!.onclick).toBe('function');
	});

	it('onclick: POST generate-random → сохранение результатов → переход на страницу результатов', async () => {
		const { ctx } = await mountPage({ slug: 'raven-matrices', isDevMode: true });

		await ctx.devAction!.onclick();

		// первый запрос — генерация случайных результатов
		const generate = postCall(0);
		expect(generate.url).toBe('/exercises/raven-matrices/playground');
		expect(generate.body.action).toBe('generate-random');

		// второй — сохранение через onSendResults (standalone-ветка)
		const save = postCall(1);
		expect(save.url).toBe('/exercises/raven-matrices/playground');
		expect(save.body.results).toEqual(SAMPLE_RESULTS);
		expect(typeof save.body.sessionId).toBe('string');

		// onSendResults → goto на страницу результатов (raven имеет result-страницу)
		expect(navMocks.goto).toHaveBeenCalledWith('/exercises/raven-matrices/results');
	});

	it('без isDevMode ничего не регистрирует и не падает', async () => {
		const { ctx } = await mountPage({ slug: 'raven-matrices' });

		expect(ctx.devAction).toBeNull();
		expect(fetchMock).not.toHaveBeenCalled();
		expect(navMocks.goto).not.toHaveBeenCalled();
	});

	it('для другого упражнения (rhythm) кнопка не регистрируется даже в DEV-режиме', async () => {
		const { ctx } = await mountPage({ slug: 'rhythm', isDevMode: true });

		expect(ctx.devAction).toBeNull();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('без контекста headerText страница не падает и ничего не регистрирует (null-guard)', async () => {
		// контекст (app)-layout отсутствует (например, рендер вне layout):
		// guard headerContext должен молча пропустить регистрацию devAction
		const result = await render(Page, {
			props: { data: { slug: 'raven-matrices', isDevMode: true } } as never,
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
		const { ctx, unmount } = await mountPage({ slug: 'raven-matrices', isDevMode: true });
		expect(ctx.devAction).not.toBeNull();

		await unmount();
		expect(ctx.devAction).toBeNull();
	});
});

describe('exercises playground — await-before-navigate контракт onSendResults', () => {
	it('(a) goto вызывается только ПОСЛЕ разрешения save-fetch (deferred fetch)', async () => {
		let resolveSave!: () => void;
		const saveDeferred = new Promise<void>((r) => (resolveSave = r));
		fetchMock.mockImplementation(async (_input: unknown, init?: RequestInit) => {
			const body = JSON.parse(String(init?.body ?? '{}'));
			if (body.action === 'generate-random') return jsonResponse({ results: SAMPLE_RESULTS });
			await saveDeferred;
			return jsonResponse({ sessionId: 'sess-1' });
		});

		const { ctx } = await mountPage({ slug: 'raven-matrices', isDevMode: true });
		const autoplay = ctx.devAction!.onclick();
		await settle();

		// сохранение ещё в полёте — навигации нет
		expect(navMocks.goto).not.toHaveBeenCalled();

		resolveSave();
		await autoplay;

		expect(navMocks.goto).toHaveBeenCalledTimes(1);
		expect(navMocks.goto).toHaveBeenCalledWith('/exercises/raven-matrices/results');
	});

	it('(b) rhythm: POST fail → enqueueAttempt(slug, {sessionId, results}) → goto(results)', async () => {
		fetchMock.mockImplementation(async () => failedResponse());

		await mountPage({ slug: 'rhythm' });

		await userEvent.click(page.getByTestId('stub-full-run'));
		await settle();

		expect(enqueueAttempt).toHaveBeenCalledTimes(1);
		const [enqueueSlug, payload] = vi.mocked(enqueueAttempt).mock.calls[0];
		expect(enqueueSlug).toBe('rhythm');
		expect(payload.sessionId).toBe(postCall(0).body.sessionId);
		expect(payload.results).toEqual(SAMPLE_RESULTS);

		// попытка видна как pending на странице результатов — навигация разрешена
		expect(navMocks.goto).toHaveBeenCalledTimes(1);
		expect(navMocks.goto).toHaveBeenCalledWith('/exercises/rhythm/results');
	});

	it('(c) универсальный fallback (не-offline): POST fail → enqueueAttempt → goto, без error-UI', async () => {
		fetchMock.mockImplementation(async () => failedResponse());

		const mounted = await mountPage({ slug: 'raven-matrices' });

		// реальный контракт игры: gameEnd() до sendResults(), один тик
		await userEvent.click(page.getByTestId('stub-full-run'));
		await settle();

		// данных безопасно поставлены в очередь — навигация разрешена
		expect(enqueueAttempt).toHaveBeenCalledTimes(1);
		const [enqueueSlug, payload] = vi.mocked(enqueueAttempt).mock.calls[0];
		expect(enqueueSlug).toBe('raven-matrices');
		expect(payload.sessionId).toBe(postCall(0).body.sessionId);
		expect(payload.results).toEqual(SAMPLE_RESULTS);

		expect(navMocks.goto).toHaveBeenCalledTimes(1);
		expect(navMocks.goto).toHaveBeenCalledWith('/exercises/raven-matrices/results');

		// error-UI не показывается: попытка в очереди, а не потеряна
		expect(mounted.container.textContent).not.toContain('Не удалось сохранить результаты');
	});

	it('(e) enqueue-throw: POST fail + enqueueAttempt кидает → goto нет, error-UI, retry виден', async () => {
		fetchMock.mockImplementation(async () => failedResponse());
		vi.mocked(enqueueAttempt).mockImplementation(() => {
			throw new Error('storage');
		});

		await mountPage({ slug: 'rhythm' });

		await userEvent.click(page.getByTestId('stub-full-run'));
		await settle();

		// outer catch страницы перехватил throw из enqueueAttempt:
		// навигации нет, пользователь видит error/retry UI
		expect(navMocks.goto).not.toHaveBeenCalled();
		await expect.element(page.getByText('Не удалось сохранить результаты')).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Попробовать снова' })).toBeVisible();
	});

	it('(f) enqueue-reject: POST fail + enqueueAttempt отклоняется → goto нет, error-UI, retry виден', async () => {
		// MAJOR-1: реалистичный сценарий отказа — асинхронный rejection
		// (localforage/quota), а не синхронный throw
		fetchMock.mockImplementation(async () => failedResponse());
		vi.mocked(enqueueAttempt).mockRejectedValue(new Error('quota'));

		await mountPage({ slug: 'rhythm' });

		await userEvent.click(page.getByTestId('stub-full-run'));
		await settle();

		// await enqueueAttempt отклонился → outer catch → error-UI без навигации
		expect(navMocks.goto).not.toHaveBeenCalled();
		await expect.element(page.getByText('Не удалось сохранить результаты')).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Попробовать снова' })).toBeVisible();
	});

	it('(d) double-fire: второй вызов save-пути во время isSaving не дублирует POST', async () => {
		let resolveSave!: () => void;
		const saveDeferred = new Promise<void>((r) => (resolveSave = r));
		fetchMock.mockImplementation(async () => {
			await saveDeferred;
			return jsonResponse({ sessionId: 'sess-1' });
		});

		await mountPage({ slug: 'raven-matrices' });

		const send = page.getByTestId('stub-send-only');
		await userEvent.click(send);
		// второй клик пока первый save в полёте — guard isSaving должен его съесть
		await userEvent.click(send);
		resolveSave();
		await settle();

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(navMocks.goto).toHaveBeenCalledTimes(1);
		expect(navMocks.goto).toHaveBeenCalledWith('/exercises/raven-matrices/results');
	});
});

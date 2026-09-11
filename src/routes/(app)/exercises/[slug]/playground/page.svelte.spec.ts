import { render, cleanup } from 'vitest-browser-svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Page from './+page.svelte';
import type { DevAction } from '$lib/types/header-action';

// app.css подключает Tailwind — без него утилиты не сгенерируются
// в тестовом окружении (обязательный импорт browser-спеков проекта)
import '../../../../../app.css';

// ─── Хоистированные моки ──────────────────────────────────────────────

const navMocks = vi.hoisted(() => ({
	goto: vi.fn(() => Promise.resolve()),
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

// Реестр упражнений заменён стабом: спек проверяет wiring devAction
// (регистрация только для raven-matrices), а не рендер конкретной игры.
vi.mock('$lib/exercises', async () => {
	const { default: Spinner } = await import('$lib/components/ui/Spinner.svelte');
	return {
		exerciseRegistry: {
			'raven-matrices': {
				name: 'raven-matrices',
				title: 'Матрицы Равена',
				playground: async () => ({ default: Spinner }),
				result: true
			},
			rhythm: {
				name: 'rhythm',
				title: 'Ритм'
			}
		},
		EXERCISE_SLUG_TO_TEST_TYPE: {
			'raven-matrices': 'ravenMatrices',
			rhythm: 'rhythm'
		}
	};
});

// Оффлайн-очередь не нужна в спеке: проверяем только, что flush вызван
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

const fetchMock = vi.fn<(input: unknown, init?: RequestInit) => Promise<unknown>>(async () =>
	jsonResponse({ results: SAMPLE_RESULTS })
);

async function mountPage(data: Record<string, unknown>) {
	const ctx: HeaderContext = { value: 'Матрицы Равена', devAction: null };
	const result = await render(Page, {
		props: { data } as never,
		// (app) layout в реальном приложении задаёт контекст headerText;
		// mount-опция context даёт странице тот же getContext('headerText')
		context: new Map([['headerText', ctx]])
	});
	// даём $effect (регистрация devAction) и динамическому import отработать
	await new Promise((r) => setTimeout(r, 50));
	return { ...result, ctx };
}

function postCall(index: number) {
	const call = fetchMock.mock.calls[index];
	if (!call) throw new Error(`fetch call #${index} not recorded`);
	return { url: String(call[0]), body: JSON.parse(String(call[1]?.body)) };
}

// ─── Хуки ─────────────────────────────────────────────────────────────

beforeEach(() => {
	vi.stubGlobal('fetch', fetchMock);
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

		// onGameEnd → goto на страницу результатов (raven имеет result-страницу)
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
		await new Promise((r) => setTimeout(r, 50));

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

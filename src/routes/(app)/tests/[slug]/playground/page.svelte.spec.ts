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

// Реестр тестов заменён стабом: спек проверяет wiring devAction, а не
// рендер конкретной игры. Spinner — реальный лёгкий компонент проекта.
vi.mock('$lib/tests', async () => {
	const { default: Spinner } = await import('$lib/components/ui/Spinner.svelte');
	return {
		testRegistry: {
			stroop: {
				title: 'Струп',
				playground: async () => ({ default: Spinner })
			}
		}
	};
});

// ─── Хелперы ──────────────────────────────────────────────────────────

type HeaderContext = { value: string; devAction: DevAction };

const SAMPLE_RESULTS = { correct: 7, wrong: 3, time: 1200 };

function jsonResponse(payload: unknown) {
	return { ok: true, json: async () => payload };
}

const fetchMock = vi.fn<(input: unknown, init?: RequestInit) => Promise<unknown>>(async () =>
	jsonResponse({ results: SAMPLE_RESULTS })
);

async function mountPage(data: Record<string, unknown>) {
	const ctx: HeaderContext = { value: 'Струп', devAction: null };
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

describe('tests playground — devAction «Автопрохождение»', () => {
	it('в DEV-режиме регистрирует кнопку с label и прямой ссылкой onclick', async () => {
		const { ctx } = await mountPage({ slug: 'stroop', isDevMode: true });

		expect(ctx.devAction).not.toBeNull();
		expect(ctx.devAction!.label).toBe('Автопрохождение');
		expect(typeof ctx.devAction!.onclick).toBe('function');
	});

	it('onclick: POST generate-random → сохранение результатов → переход на страницу результатов', async () => {
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

		// onGameEnd → goto на страницу результатов
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
		await new Promise((r) => setTimeout(r, 50));

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

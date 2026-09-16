import { render, cleanup } from 'vitest-browser-svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Page from './+page.svelte';

// app.css подключает Tailwind — без него утилиты не сгенерируются
// в тестовом окружении, и trusted-клик может промахиваться по мишеням
import '../../../app.css';

import { streaming, startStreaming, requestStreamingStart } from '$lib/stores/streaming.svelte';

// ─── Хоистированные моки navigation ───────────────────────────────────

const navMocks = vi.hoisted(() => ({
	goto: vi.fn<(path: string) => Promise<void>>(() => Promise.resolve()),
	resolve: vi.fn<(path: string) => string>((path: string) => path)
}));

// ─── Моки ─────────────────────────────────────────────────────────────

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => navMocks.goto(...(args as [string]))
}));

vi.mock('$app/paths', () => ({
	resolve: (path: string) => navMocks.resolve(path)
}));

vi.mock('$app/environment', () => ({
	browser: true
}));

// ─── Фикстуры ─────────────────────────────────────────────────────────

const testsFixture = [
	{
		name: 'stroop',
		title: 'Цвет и смысл',
		path: '/tests/stroop/about',
		img: '/tests/stroop.svg'
	},
	{ name: 'math', title: 'Быстрый счет', path: '/tests/math/about', img: '/tests/math1.svg' },
	{
		name: 'munsterberg',
		title: 'Поиск слов',
		path: '/tests/munsterberg/about',
		img: '/tests/munsterberg1.svg'
	}
];

function makeData(options: { testSessionCounts?: Record<string, number> } = {}) {
	return {
		tests: testsFixture,
		testSessionCounts: options.testSessionCounts ?? {}
	};
}

// ─── Хелперы ──────────────────────────────────────────────────────────

async function mountPage(data: ReturnType<typeof makeData>) {
	const result = await render(Page, { props: { data: data as never } });
	// onMount синхронен, но рендер после него асинхронен — даём кадр
	await new Promise((r) => requestAnimationFrame(() => r(undefined)));
	await new Promise((r) => setTimeout(r, 20));
	return result;
}

// ─── Хуки ─────────────────────────────────────────────────────────────

beforeEach(() => {
	// Сброс in-memory store между тестами через публичный API
	startStreaming([], {});
	navMocks.goto.mockClear();
	navMocks.resolve.mockClear();
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

// ─── Тесты ────────────────────────────────────────────────────────────

describe('/tests page — streaming store wiring', () => {
	it('клик по карточке запуска строит очередь в store и переходит к первому непройденному тесту', async () => {
		const data = makeData({ testSessionCounts: { stroop: 1 } }); // stroop пройден → очередь из math и munsterberg
		const { container } = await mountPage(data);

		// Trusted userEvent.click промахивался по adaptive-раскладке
		// RecommendationCard в headless Chromium; trusted click + Enter
		// покрыты RecommendationCard.svelte.test.ts. Здесь — page-level wiring.
		const link = container.querySelector('a.card');
		expect(link).toBeTruthy();
		const event = new MouseEvent('click', { cancelable: true, bubbles: true });
		link!.dispatchEvent(event);

		// Очередь построена в store: непройденные по порядку реестра
		expect(streaming.queue.map((item) => item.name)).toEqual(['math', 'munsterberg']);

		// Переход к первому непройденному
		expect(navMocks.goto).toHaveBeenCalledTimes(1);
		expect(navMocks.goto).toHaveBeenCalledWith('/tests/math/about');
	});

	it('заход на страницу с живой очередью в store сразу уходит к первому тесту очереди', async () => {
		startStreaming(testsFixture, { stroop: 0 }); // живая очередь: stroop, math, munsterberg
		const data = makeData({ testSessionCounts: { stroop: 0 } });
		await mountPage(data);

		expect(navMocks.goto).toHaveBeenCalledTimes(1);
		expect(navMocks.goto).toHaveBeenCalledWith('/tests/stroop/about');
	});

	it('регрессия: все counts ≥1 + живая очередь из всех тестов → goto первого, без ухода на /home', async () => {
		// Раньше localforage-флаг сбрасывался и страница уходила на /home
		startStreaming(testsFixture, {}); // очередь из всех тестов (режим повтора серии)
		const data = makeData({
			testSessionCounts: { stroop: 1, math: 2, munsterberg: 1 }
		});
		await mountPage(data);

		expect(navMocks.goto).toHaveBeenCalledTimes(1);
		expect(navMocks.goto).toHaveBeenCalledWith('/tests/stroop/about');
		const gotoArgs = navMocks.goto.mock.calls.map((call) => call[0]);
		expect(gotoArgs).not.toContain('/home');
	});

	it('pendingStart=true (после home-кнопки) материализует очередь из data и уходит к первому', async () => {
		requestStreamingStart();
		const data = makeData({ testSessionCounts: { stroop: 1 } }); // первый непройденный — math
		await mountPage(data);

		expect(streaming.pendingStart).toBe(false);
		expect(streaming.queue.map((item) => item.name)).toEqual(['math', 'munsterberg']);
		expect(navMocks.goto).toHaveBeenCalledTimes(1);
		expect(navMocks.goto).toHaveBeenCalledWith('/tests/math/about');
	});

	it('пустая очередь без pendingStart — обычная сетка без goto', async () => {
		const data = makeData();
		const { container } = await mountPage(data);

		expect(navMocks.goto).not.toHaveBeenCalled();
		// Сетка тестов отрендерена
		const cards = container.querySelectorAll('a.card');
		expect(cards.length).toBeGreaterThan(0);
		expect(container.textContent).toContain('Цвет и смысл');
	});
});

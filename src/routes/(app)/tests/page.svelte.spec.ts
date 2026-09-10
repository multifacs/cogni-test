import { render, cleanup } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import localforage from 'localforage';
import Page from './+page.svelte';

// app.css подключает Tailwind — без него утилиты не сгенерируются
// в тестовом окружении, и trusted-клик может промахиваться по мишеням
import '../../../app.css';

// ─── Хоистированные моки navigation ───────────────────────────────────

const navMocks = vi.hoisted(() => ({
	goto: vi.fn<[(string | URL)?], Promise<void>>(() => Promise.resolve()),
	resolve: vi.fn<[string], string>((path: string) => path)
}));

// ─── Моки ─────────────────────────────────────────────────────────────

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => navMocks.goto(...(args as [string]))
}));

vi.mock('$app/paths', () => ({
	resolve: (path: string) => navMocks.resolve(path)
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
	const result = await render(Page, { props: { data } });
	// onMount с await localforage... выполняется асинхронно;
	// даём достаточно времени на отработку микрозадач и рендер
	await new Promise((r) => requestAnimationFrame(() => r(undefined)));
	await new Promise((r) => setTimeout(r, 80));
	return result;
}

// ─── Хуки ─────────────────────────────────────────────────────────────

beforeEach(async () => {
	await localforage.clear();
	navMocks.goto.mockClear();
	navMocks.resolve.mockClear();
});

afterEach(async () => {
	cleanup();
	vi.clearAllMocks();
	await localforage.clear();
});

// ─── Тесты ────────────────────────────────────────────────────────────

describe('/tests page — streaming mode wiring', () => {
	it('клик по карточке запуска потокового прохождения устанавливает флаг и переходит к первому непройденному тесту', async () => {
		const data = makeData({ testSessionCounts: { stroop: 1 } }); // stroop seeded as completed → expected redirect target is the second registry entry, math
		const { container } = await mountPage(data);

		// Ждём появления сетки (runAllMode === false после onMount)
		const link = container.querySelector('a.card');
		expect(link).toBeTruthy();

		// Trusted userEvent.click missed the adaptive RecommendationCard layout under
		// headless Chromium; trusted click + Enter are covered by
		// RecommendationCard.svelte.test.ts. This spec covers page-level wiring.
		const event = new MouseEvent('click', { cancelable: true, bubbles: true });
		link!.dispatchEvent(event);

		// startStreaming асинхронен (await localforage.setItem); ждём отработки
		await vi.waitFor(() => expect(navMocks.goto).toHaveBeenCalledTimes(1));

		// Флаг должен быть установлен
		expect(await localforage.getItem('runAllMode')).toBe(true);

		// Переход к первому непройденному по порядку реестра
		expect(navMocks.goto).toHaveBeenLastCalledWith('/tests/math/about');
	});

	it('при входе с активным флагом и наличии непройденных тестов сразу переходит к первому из них', async () => {
		await localforage.setItem('runAllMode', true);
		const data = makeData({ testSessionCounts: { stroop: 0 } }); // stroop непройден
		await mountPage(data);

		expect(navMocks.goto).toHaveBeenCalledTimes(1);
		expect(navMocks.goto).toHaveBeenCalledWith('/tests/stroop/about');
	});

	it('при входе с активным флагом и полностью пройденной серией сбрасывает флаг и уходит на /home', async () => {
		await localforage.setItem('runAllMode', true);
		const data = makeData({
			testSessionCounts: { stroop: 1, math: 2, munsterberg: 1 }
		});
		await mountPage(data);

		expect(await localforage.getItem('runAllMode')).toBe(false);
		expect(navMocks.goto).toHaveBeenCalledTimes(1);
		expect(navMocks.goto).toHaveBeenCalledWith('/home');
	});
});

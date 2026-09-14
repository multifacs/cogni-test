import { render, cleanup } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import localforage from 'localforage';
import Page from './+page.svelte';
import AboutStub from '$lib/testing/game-stub.svelte';

// app.css подключает Tailwind — без него утилиты не сгенерируются
// в тестовом окружении (обязательный импорт browser-спеков проекта)
import '../../../../../app.css';

// ─── Хоистированные моки ──────────────────────────────────────────────

const navMocks = vi.hoisted(() => ({
	goto: vi.fn(() => Promise.resolve()),
	resolve: vi.fn((path: string) => path),
	url: {
		pathname: '/tests/stroop/about',
		searchParams: new URLSearchParams()
	}
}));

vi.mock('$app/state', () => ({
	page: { url: navMocks.url }
}));

// Button.svelte импортирует goto из $app/navigation — мок обязателен
vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => navMocks.goto(...(args as [string]))
}));

vi.mock('$app/paths', () => ({
	resolve: (path: string) => navMocks.resolve(path)
}));

// Реестр тестов заменён стабом: about-страница рендерит `<Component></Component>`
// без пропсов — game-stub подходит как about-контент. Реализация about()
// переключается тестом (resolved / pending) через хоистированный шпион.
const registryMocks = vi.hoisted(() => ({
	about: vi.fn(async () => ({ default: null as unknown }))
}));

vi.mock('$lib/tests', () => ({
	testRegistry: {
		stroop: {
			title: 'Струп',
			about: () => registryMocks.about()
		}
	}
}));

// ─── Хелперы ──────────────────────────────────────────────────────────

/** Даёт $effect, промису about() и onMount-localforage отработать. */
async function settle(ms = 50) {
	await new Promise((r) => setTimeout(r, ms));
}

async function mountPage(data: Record<string, unknown>) {
	const result = await render(Page, { props: { data } as never });
	await settle();
	return result;
}

// ─── Хуки ─────────────────────────────────────────────────────────────

beforeEach(async () => {
	// runAllMode читается в onMount: между кейсами флаг обязан сбрасываться
	await localforage.removeItem('runAllMode');
	navMocks.url.searchParams = new URLSearchParams();
	registryMocks.about.mockReset();
	registryMocks.about.mockImplementation(async () => ({ default: AboutStub }));
});

afterEach(() => {
	cleanup();
	navMocks.goto.mockClear();
	navMocks.resolve.mockClear();
	registryMocks.about.mockClear();
});

// ─── Тесты ────────────────────────────────────────────────────────────

describe('tests about — Назад disabled в потоковом режиме', () => {
	it('(a) resolved-ветка: runAllMode=true → «Назад» disabled; без флага — активна', async () => {
		await localforage.setItem('runAllMode', true);
		await mountPage({ slug: 'stroop' });

		// about() уже разрешился → resolved-ветка (Component загружен)
		await expect.element(page.getByText('stub-full-run')).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Назад' })).toBeDisabled();

		// пере-маунт без флага
		cleanup();
		await localforage.setItem('runAllMode', false);
		await mountPage({ slug: 'stroop' });

		await expect.element(page.getByText('stub-full-run')).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Назад' })).toBeEnabled();
	});

	it('(b) pending-ветка (Spinner): runAllMode=true → «Назад» disabled', async () => {
		await localforage.setItem('runAllMode', true);
		// about() никогда не разрешается — страница остаётся в loading-ветке
		registryMocks.about.mockImplementation(() => new Promise(() => {}));

		await mountPage({ slug: 'stroop' });

		await expect.element(page.getByText('Загрузка теста stroop...')).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Назад' })).toBeDisabled();
	});

	it('(c) GTO: runAllMode=true + gtoSessionId → «Назад» активна (GTO не использует runAllMode)', async () => {
		await localforage.setItem('runAllMode', true);
		navMocks.url.searchParams = new URLSearchParams('gtoSessionId=42');

		await mountPage({ slug: 'stroop' });

		await expect.element(page.getByText('stub-full-run')).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Назад' })).toBeEnabled();
	});
});

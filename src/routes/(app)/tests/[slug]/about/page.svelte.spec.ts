import { render, cleanup } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startStreaming } from '$lib/stores/streaming.svelte';
import type { TestData } from '$lib/tests';
import Page from './+page.svelte';
import AboutStub from '$lib/testing/game-stub.svelte';

// app.css подключает Tailwind — без него утилиты не сгенерируются
// в тестовом окружении (обязательный импорт browser-спеков проекта)
import '../../../../../app.css';

// ─── Хоистированные моки ──────────────────────────────────────────────

const navMocks = vi.hoisted(() => ({
	goto: vi.fn<(path: string) => Promise<void>>(() => Promise.resolve()),
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

/** Даёт $effect и промису about() отработать. */
async function settle(ms = 50) {
	await new Promise((r) => setTimeout(r, ms));
}

// Фикстура streaming-очереди: stroop (текущий) + math (другой)
const STREAM_TESTS: TestData[] = [
	{ name: 'stroop', title: 'Струп', path: '/tests/stroop/about', img: '' },
	{ name: 'math', title: 'Быстрый счет', path: '/tests/math/about', img: '' }
];

async function mountPage(data: Record<string, unknown>) {
	const result = await render(Page, { props: { data } as never });
	await settle();
	return result;
}

// ─── Хуки ─────────────────────────────────────────────────────────────

beforeEach(() => {
	// streaming-store — module-level $state: сброс между кейсами обязателен,
	// иначе очередь утекает в следующий тест
	startStreaming([], {});
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
	it('(a) resolved-ветка: очередь непуста → «Назад» disabled; пустая — активна', async () => {
		startStreaming(STREAM_TESTS, {});
		await mountPage({ slug: 'stroop' });

		// about() уже разрешился → resolved-ветка (Component загружен)
		await expect.element(page.getByText('stub-full-run')).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Назад' })).toBeDisabled();

		// пере-маунт с пустой очередью
		cleanup();
		startStreaming([], {});
		await mountPage({ slug: 'stroop' });

		await expect.element(page.getByText('stub-full-run')).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Назад' })).toBeEnabled();
	});

	it('(b) pending-ветка (Spinner): очередь непуста → «Назад» disabled', async () => {
		startStreaming(STREAM_TESTS, {});
		// about() никогда не разрешается — страница остаётся в loading-ветке
		registryMocks.about.mockImplementation(() => new Promise(() => {}));

		await mountPage({ slug: 'stroop' });

		await expect.element(page.getByText('Загрузка теста stroop...')).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Назад' })).toBeDisabled();
	});

	it('(c) GTO: очередь непуста + gtoSessionId → «Назад» активна (GTO не использует стрим)', async () => {
		startStreaming(STREAM_TESTS, {});
		navMocks.url.searchParams = new URLSearchParams('gtoSessionId=42');

		await mountPage({ slug: 'stroop' });

		await expect.element(page.getByText('stub-full-run')).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Назад' })).toBeEnabled();
	});
});

describe('tests about — StreamingBadge удалён со страницы', () => {
	it('(a) resolved-ветка + очередь непуста: бейджа нет', async () => {
		startStreaming(STREAM_TESTS, {});
		await mountPage({ slug: 'stroop' });

		await expect.element(page.getByText('stub-full-run')).toBeVisible();
		await expect.element(page.getByText('Потоковое прохождение')).not.toBeInTheDocument();
	});

	it('(b) pending-ветка (Spinner) + очередь непуста: бейджа нет', async () => {
		startStreaming(STREAM_TESTS, {});
		// about() никогда не разрешается — страница остаётся в loading-ветке
		registryMocks.about.mockImplementation(() => new Promise(() => {}));

		await mountPage({ slug: 'stroop' });

		await expect.element(page.getByText('Загрузка теста stroop...')).toBeVisible();
		await expect.element(page.getByText('Потоковое прохождение')).not.toBeInTheDocument();
	});
});

import { render, cleanup } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ErrorPage from './+error.svelte';

// app.css подключает Tailwind — без него утилиты не сгенерируются
// в тестовом окружении, и trusted-клик может промахиваться по мишеням
import '../../../../app.css';

// ─── Хоистированные моки navigation ───────────────────────────────────

const navMocks = vi.hoisted(() => ({
	goto: vi.fn<(path: string) => Promise<void>>(() => Promise.resolve()),
	resolve: vi.fn<(path: string) => string>((path: string) => path),
	// Страница читает page.url (?from=ai) — управляем через реальный URL
	pageUrl: new URL('http://localhost/tests/stroop')
}));

vi.mock('$app/state', () => ({
	page: { url: navMocks.pageUrl }
}));

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => navMocks.goto(...(args as [string]))
}));

vi.mock('$app/paths', () => ({
	resolve: (path: string) => navMocks.resolve(path),
	// $app/state требует именованные экспорты assets/base из paths-модуля
	assets: '',
	base: ''
}));

vi.mock('$app/environment', () => ({
	browser: true
}));

// ─── Хелперы ──────────────────────────────────────────────────────────

async function mountPage() {
	const result = await render(ErrorPage, {
		props: { error: new Error('not found'), status: 404 } as never
	});
	await new Promise((r) => setTimeout(r, 20));
	return result;
}

// ─── Хуки ─────────────────────────────────────────────────────────────

beforeEach(() => {
	navMocks.goto.mockClear();
	navMocks.resolve.mockClear();
	// from=ai не должен протекать между тестами
	navMocks.pageUrl.searchParams.delete('from');
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

// ─── Тесты ────────────────────────────────────────────────────────────

describe('+error.svelte — переход из ИИ (?from=ai)', () => {
	it('при ?from=ai кнопка «Назад к тестам» ведёт на /tests?from=ai', async () => {
		navMocks.pageUrl.searchParams.set('from', 'ai');
		const { container } = await mountPage();

		const btn = [...container.querySelectorAll('button')].find((b) =>
			b.textContent?.includes('Назад к тестам')
		);
		expect(btn).toBeTruthy();
		btn?.click();
		await new Promise((r) => setTimeout(r, 25));

		// Button с goto-prop вызывает goto(resolve(path), { invalidateAll: false })
		expect(navMocks.goto).toHaveBeenCalledTimes(1);
		expect(navMocks.goto.mock.calls[0]?.[0]).toBe('/tests?from=ai');
	});

	it('без ?from=ai кнопка «Назад к тестам» ведёт на /tests', async () => {
		const { container } = await mountPage();

		const btn = [...container.querySelectorAll('button')].find((b) =>
			b.textContent?.includes('Назад к тестам')
		);
		expect(btn).toBeTruthy();
		btn?.click();
		await new Promise((r) => setTimeout(r, 25));

		expect(navMocks.goto).toHaveBeenCalledTimes(1);
		expect(navMocks.goto.mock.calls[0]?.[0]).toBe('/tests');
	});

	it('рендерит сообщение о ненайденном тесте', async () => {
		const { container } = await mountPage();

		expect(container.textContent).toContain('Тест не найден');
	});
});

import { render, cleanup } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AppLayout from './+layout.svelte';
import type { LayoutData } from './$types';
import { page } from 'vitest/browser';

// app.css подключает Tailwind — без него утилиты layout'а
// не сгенерируются в тестовом окружении
import '../../app.css';

// ─── Моки SvelteKit-окружения ─────────────────────────────────────────

// vi.hoisted: vi.mock поднимается в начало файла, обычные top-level
// переменные внутри фабрики будут undefined
const mocks = vi.hoisted(() => ({ url: { pathname: '/' } }));

vi.mock('$app/state', () => ({
	page: { url: mocks.url }
}));

// push-подписка в тесте не нужна — избегаем реального pushService
vi.mock('$lib/utils/push', () => ({
	isSubscribed: async () => true
}));

vi.mock('$lib/pushService', () => ({
	pushService: null
}));

// ─── Хелперы ──────────────────────────────────────────────────────────

const children = createRawSnippet(() => ({
	render: () => '<p data-testid="page-content">Контент страницы</p>'
}));

// минимальные данные LayoutData: layout использует только undiagnosed
// и allowedPaths (для NavBar); user/profileSurvey кладутся в сторы
const layoutData = {
	user: undefined,
	profileSurvey: undefined,
	undiagnosed: false,
	allowedPaths: []
} as unknown as LayoutData;

async function mountLayout(pathname: string) {
	mocks.url.pathname = pathname;
	return await render(AppLayout, {
		props: { data: layoutData, children }
	});
}

function getNavSlot(container: HTMLElement): HTMLElement {
	const slot = container.querySelector('.nav-slot') as HTMLElement | null;
	if (!slot) throw new Error('.nav-slot not rendered');
	return slot;
}

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

// ─── Тесты ────────────────────────────────────────────────────────────

describe('(app) layout — скрытие нижней навигации на <sm', () => {
	it('на внутренней странице раздела (<sm) навбар скрыт, а сам nav остаётся в DOM', async () => {
		await page.viewport(320, 433);
		const { container } = await mountLayout('/materials/sleep');
		const slot = getNavSlot(container);

		expect(slot.querySelector('nav.nav')).not.toBeNull();
		expect(getComputedStyle(slot).display).toBe('none');
	});

	it('граница брейкпоинта sm: 639px скрыт, 640px виден', async () => {
		const { container } = await mountLayout('/tests/munsterberg/playground');
		const slot = getNavSlot(container);

		await page.viewport(639, 900);
		expect(getComputedStyle(slot).display).toBe('none');

		await page.viewport(640, 900);
		expect(getComputedStyle(slot).display).toBe('contents');
	});

	it('на корне раздела навбар остаётся даже на 320px (иначе тупик без «Назад»)', async () => {
		await page.viewport(320, 433);
		const { container } = await mountLayout('/materials');
		const slot = getNavSlot(container);

		expect(getComputedStyle(slot).display).not.toBe('none');
	});

	it('на страницах вне разделов навбар не скрывается', async () => {
		await page.viewport(320, 433);
		const { container } = await mountLayout('/home');
		const slot = getNavSlot(container);

		expect(getComputedStyle(slot).display).not.toBe('none');
	});
});

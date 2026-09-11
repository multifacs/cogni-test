import { render, cleanup } from 'vitest-browser-svelte';
import { createRawSnippet, getContext, tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AppLayout from './+layout.svelte';
import type { LayoutData } from './$types';
import type { DevAction } from '$lib/types/header-action';
import { page, userEvent } from 'vitest/browser';

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

function getDevActionButton(container: HTMLElement): HTMLButtonElement {
	const btn = container.querySelector('header .banner .dev-action') as HTMLButtonElement | null;
	if (!btn) throw new Error('.dev-action button not rendered');
	return btn;
}

// ─── Контекст headerText (devAction) ───────────────────────────────────

type HeaderContext = {
	value: string;
	devAction: DevAction;
};

// Probe-сниппет: createRawSnippet вызывает fn в момент @render внутри
// шаблона AppLayout — эффект восстанавливает component_context, поэтому
// getContext здесь видит контекст layout'а (как реальный child-компонент).
let headerCtx: HeaderContext | undefined;

const probingChildren = createRawSnippet(() => {
	headerCtx = getContext<HeaderContext>('headerText');
	return { render: () => '<p data-testid="page-content">Контент страницы</p>' };
});

async function mountLayoutWithProbe(pathname: string) {
	headerCtx = undefined;
	mocks.url.pathname = pathname;
	return await render(AppLayout, {
		props: { data: layoutData, children: probingChildren }
	});
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

describe('(app) layout — devAction в баннере', () => {
	it('по умолчанию devAction равен null и кнопка в Header не рендерится', async () => {
		await page.viewport(320, 433);
		const { container } = await mountLayoutWithProbe('/home');

		expect(headerCtx).toBeDefined();
		expect(headerCtx!.devAction).toBeNull();
		expect(container.querySelector('header .banner button')).toBeNull();
	});

	it('установка devAction из потомка (через контекст) рендерит кнопку с label', async () => {
		await page.viewport(1024, 768);
		const { container } = await mountLayoutWithProbe('/tests/munsterberg/playground');

		const onclick = vi.fn(() => Promise.resolve());
		headerCtx!.devAction = { label: 'Автопрохождение', onclick };
		await tick();

		const btn = getDevActionButton(container);
		expect(btn.getAttribute('aria-label')).toBe('Автопрохождение');
		expect(btn.textContent).toContain('Автопрохождение');
		expect(btn.disabled).toBe(false);

		headerCtx!.devAction = null;
		await tick();
		expect(container.querySelector('header .banner button')).toBeNull();
	});

	it('клик вызывает callback, кнопка блокируется на время pending и не даёт двойной клик', async () => {
		await page.viewport(1024, 768);
		const { container } = await mountLayoutWithProbe('/tests/munsterberg/playground');

		let resolveAction: () => void = () => {};
		const onclick = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					resolveAction = resolve;
				})
		);
		headerCtx!.devAction = { label: 'Автопрохождение', onclick };
		await tick();

		const btn = getDevActionButton(container);
		await userEvent.click(btn);

		// pending: кнопка disabled, показан спиннер, повторный вызов не проходит
		expect(onclick).toHaveBeenCalledTimes(1);
		expect(btn.disabled).toBe(true);
		expect(container.querySelector('.dev-action-spinner')).not.toBeNull();

		resolveAction();
		await tick();

		expect(onclick).toHaveBeenCalledTimes(1);
		expect(btn.disabled).toBe(false);
		expect(container.querySelector('.dev-action-spinner')).toBeNull();
	});

	it('rejection в onclick сбрасывает pending: кнопка не остаётся disabled, спиннер исчезает', async () => {
		await page.viewport(1024, 768);
		const { container } = await mountLayoutWithProbe('/tests/munsterberg/playground');

		// Глотаем unhandled rejection от onclick: reject распространяется
		// наружу из handleActionClick (Svelte игнорирует returned promise),
		// а нас интересует UI-состояние после rejection, не падение рана.
		const onUnhandled = (e: PromiseRejectionEvent) => e.preventDefault();
		window.addEventListener('unhandledrejection', onUnhandled);

		try {
			const onclick = vi.fn(() => Promise.reject(new Error('boom')));
			headerCtx!.devAction = { label: 'Автопрохождение', onclick };
			await tick();

			const btn = getDevActionButton(container);
			await userEvent.click(btn);

			// Даём rejection settle: finally в handleActionClick обязан
			// сбросить pending независимо от исхода промиса.
			await tick();
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(onclick).toHaveBeenCalledTimes(1);
			expect(btn.disabled).toBe(false);
			expect(container.querySelector('.dev-action-spinner')).toBeNull();
		} finally {
			window.removeEventListener('unhandledrejection', onUnhandled);
		}
	});
});

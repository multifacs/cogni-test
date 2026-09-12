import { render, cleanup } from 'vitest-browser-svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Page from './+page.svelte';
import type { PageProps } from './$types';

// app.css подключает Tailwind — без него утилиты не сгенерируются
// в тестовом окружении, и trusted-клик может промахиваться по мишеням
// (см. AGENTS.md: campimetry click-through)
import '../../../../../../app.css';

// ─── Хоистированные моки ──────────────────────────────────────────────

const navMocks = vi.hoisted(() => ({
	goto: vi.fn<(target?: string | URL) => Promise<void>>(() => Promise.resolve())
}));

// ─── Моки ─────────────────────────────────────────────────────────────

vi.mock('$app/navigation', () => ({
	goto: (target?: string | URL) => navMocks.goto(target)
}));

vi.mock('$app/paths', () => ({
	resolve: (path: string) => path
}));

// ─── Фикстуры ─────────────────────────────────────────────────────────

function makeData(lastResultAt: string | null): PageProps['data'] {
	return {
		sessionId: 'gto-1',
		sessionName: 'Тестовая сессия',
		wordCount: 5,
		hasWordSet: false,
		lastResultAt,
		// Данные родительского layout ((app)/+layout.server.ts)
		user: {
			id: 'user-1',
			firstname: 'NM',
			lastname: 'USR',
			birthday: new Date('2000-01-01'),
			sex: 'male'
		},
		profileSurvey: { userId: 'user-1', gtoId: 'GTO-123' },
		undiagnosed: false,
		allowedPaths: ['/home', '/tests', '/profile', '/admin', '/gto', '/questionary'],
		isDevMode: false
	};
}

// ─── Хелперы ──────────────────────────────────────────────────────────

function findButtonByText(container: HTMLElement, text: string): HTMLButtonElement | undefined {
	return [...container.querySelectorAll('button')].find((b) => b.textContent?.includes(text)) as
		HTMLButtonElement | undefined;
}

function clickButton(button: HTMLButtonElement): void {
	button.dispatchEvent(new MouseEvent('click', { cancelable: true, bubbles: true }));
}

async function flushUpdate(): Promise<void> {
	await new Promise((r) => requestAnimationFrame(() => r(undefined)));
}

/**
 * Страница читает headerText через getContext — vitest-browser-svelte
 * проксирует MountOptions (включая context: Map) в mount().
 */
function renderPage(lastResultAt: string | null) {
	const headerContext = { value: '' };
	const promise = render(Page, {
		props: { data: makeData(lastResultAt), params: { id: 'gto-1' } },
		context: new Map([['headerText', headerContext]])
	});
	return { promise, headerContext };
}

// ─── Хуки ─────────────────────────────────────────────────────────────

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

// ─── Тесты ────────────────────────────────────────────────────────────

describe('/gto/session/[id]/words — кнопка анкеты на экране таймера', () => {
	it('рендерится в ветке таймера (lastResultAt в будущем)', async () => {
		const { promise } = renderPage(new Date(Date.now() + 4 * 60 * 1000).toISOString());
		const { container } = await promise;

		// Экран ожидания: обратный отсчёт, а не поля ввода слов
		expect(container.querySelector('input')).toBeNull();
		const btn = findButtonByText(container, 'заполните анкету');
		expect(btn).toBeTruthy();

		// Красная кнопка «Выйти» в low-content секции не затронута
		expect(findButtonByText(container, 'Выйти')).toBeTruthy();
	});

	it('клик по кнопке ведёт на /questionary?gto=false', async () => {
		const { promise } = renderPage(new Date(Date.now() + 4 * 60 * 1000).toISOString());
		const { container } = await promise;

		const btn = findButtonByText(container, 'заполните анкету');
		expect(btn).toBeTruthy();
		clickButton(btn!);
		await flushUpdate();

		expect(navMocks.goto).toHaveBeenCalledWith('/questionary?gto=false');
	});

	it('НЕ рендерится в ветке ввода слов (lastResultAt: null)', async () => {
		const { promise } = renderPage(null);
		const { container } = await promise;

		// Ветка ввода: 5 полей и кнопка «Отправить»
		expect(container.querySelectorAll('input').length).toBe(5);
		expect(findButtonByText(container, 'Отправить')).toBeTruthy();
		expect(findButtonByText(container, 'заполните анкету')).toBeUndefined();
	});
});

import { render, cleanup } from 'vitest-browser-svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Page from './+page.svelte';
import type { PageProps } from './$types';

// app.css подключает Tailwind — без него утилиты не сгенерируются
// в тестовом окружении, и trusted-клик может промахиваться по мишеням
// (см. AGENTS.md: campimetry click-through)
import '../../../app.css';

// ─── Хоистированные моки ──────────────────────────────────────────────

const navMocks = vi.hoisted(() => ({
	goto: vi.fn<(target?: string | URL) => Promise<void>>(() => Promise.resolve()),
	invalidateAll: vi.fn(() => Promise.resolve())
}));

// ─── Моки ─────────────────────────────────────────────────────────────

vi.mock('$app/navigation', () => ({
	goto: (target?: string | URL) => navMocks.goto(target),
	invalidateAll: () => navMocks.invalidateAll()
}));

vi.mock('$app/paths', () => ({
	resolve: (path: string) => path
}));

vi.mock('$app/forms', () => ({
	enhance: () => () => {}
}));

// Реестры тестов/упражнений заменены стабами: спек проверяет wiring кнопки
// анкеты, а не рендер конкретных тестов (см. playground-спек)
vi.mock('$lib/tests', () => ({
	GTO_TEST_ORDER: [
		{ type: 'stroop', route: '/tests/stroop' },
		{ type: 'math', route: '/tests/math' }
	],
	testRegistry: {
		stroop: { title: 'Струп' },
		math: { title: 'Математика' }
	}
}));

vi.mock('$lib/exercises', () => ({
	exerciseRegistry: {}
}));

// ─── Фикстуры ─────────────────────────────────────────────────────────

function makeData(
	overrides: Partial<
		Pick<PageProps['data'], 'profileSurvey' | 'activeSessions' | 'completedSessions'>
	> = {}
): PageProps['data'] {
	return {
		activeSessions: [],
		completedSessions: [],
		userId: 'user-1',
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
		isDevMode: false,
		...overrides
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

// ─── Хуки ─────────────────────────────────────────────────────────────

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

// ─── Тесты ────────────────────────────────────────────────────────────

describe('/gto — кнопка «Заполнить анкету»', () => {
	it('рендерится при установленном gtoId и пустом списке сессий (empty state)', async () => {
		const { container } = await render(Page, {
			props: { data: makeData(), form: null }
		});

		expect(container.textContent).toContain('У вас нет сессий ГТО-М');
		const btn = findButtonByText(container, 'Заполнить анкету');
		expect(btn).toBeTruthy();
	});

	it('рендерится при наличии завершённых сессий', async () => {
		const { container } = await render(Page, {
			props: {
				data: makeData({
					completedSessions: [
						{
							gtoSessionId: 'sess-1',
							name: 'Завершённая сессия',
							status: 'completed',
							createdAt: '2026-09-01 10:00:00',
							hasCompletedTests: true,
							hasSubmittedWords: true,
							currentTestIndex: 7,
							wordScore: 4
						}
					]
				}),
				form: null
			}
		});

		expect(container.textContent).toContain('Завершённая сессия');
		expect(findButtonByText(container, 'Заполнить анкету')).toBeTruthy();
	});

	it('рендерится при наличии активных сессий', async () => {
		const { container } = await render(Page, {
			props: {
				data: makeData({
					activeSessions: [
						{
							gtoSessionId: 'sess-2',
							name: 'Активная сессия',
							status: 'active',
							hasCompletedTests: false,
							hasSubmittedWords: false,
							currentTestIndex: 0
						}
					]
				}),
				form: null
			}
		});

		expect(container.textContent).toContain('Активная сессия');
		expect(findButtonByText(container, 'Заполнить анкету')).toBeTruthy();
	});

	it('НЕ рендерится, когда gtoId не задан (ветка ввода ID)', async () => {
		const { container } = await render(Page, {
			props: {
				data: makeData({ profileSurvey: { userId: 'user-1', gtoId: null } }),
				form: null
			}
		});

		expect(container.textContent).toContain('Введите ваш ГТО-М ID');
		expect(findButtonByText(container, 'Заполнить анкету')).toBeUndefined();
	});

	it('клик по кнопке ведёт на /questionary?gto=false', async () => {
		const { container } = await render(Page, {
			props: { data: makeData(), form: null }
		});

		const btn = findButtonByText(container, 'Заполнить анкету');
		expect(btn).toBeTruthy();
		clickButton(btn!);
		await flushUpdate();

		expect(navMocks.goto).toHaveBeenCalledWith('/questionary?gto=false');
	});
});

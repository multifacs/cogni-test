import { render, cleanup } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Page from './+page.svelte';
import { fullFlow } from './flows';
import { profileSurveyStore, userStore } from '$lib/stores/user';
import type { User } from '$lib/server/db/types';
import type { InsertProfileSurvey } from '$lib/server/db/models/survey';

// app.css подключает Tailwind — без него утилиты не сгенерируются
// в тестовом окружении (обязательный импорт browser-спеков проекта)
import '../../../app.css';

// ─── Хоистированные моки ──────────────────────────────────────────────

const navMocks = vi.hoisted(() => ({
	goto: vi.fn((_url: string, _opts?: unknown) => Promise.resolve()),
	replaceState: vi.fn((_url: string | URL, _state?: unknown) => {}),
	pageUrl: new URL('http://localhost/questionary')
}));

vi.mock('$app/state', () => ({
	// Обычный объект вместо реактивного page: компонент читает
	// page.url.searchParams один раз при рендере — этого достаточно.
	page: { url: navMocks.pageUrl }
}));

vi.mock('$app/navigation', () => ({
	goto: navMocks.goto,
	replaceState: navMocks.replaceState
}));

// Button импортирует resolve из '$app/paths'
vi.mock('$app/paths', () => ({
	resolve: (path: string) => path
}));

// FlowRunner сохраняет ответы через autosave — в спеке проверяется wiring
// replaceState, а не сохранение; мок избавляет от fetch на каждый «Далее».
vi.mock('./autosave', () => ({
	saveFieldNow: vi.fn(async () => {}),
	saveFieldDebounced: vi.fn(),
	flushAutosave: vi.fn()
}));

// ─── Хелперы ──────────────────────────────────────────────────────────

const testUser = { id: 'user-1' } as unknown as User;

async function mountHub() {
	profileSurveyStore.set({} as InsertProfileSurvey);
	userStore.set(testUser);
	return render(Page);
}

/** Полное прохождение потока кликами по «Далее» → «Завершить». */
async function completeFlowFromHub(startButtonName: string) {
	await userEvent.click(page.getByRole('button', { name: startButtonName, exact: true }));
	// последний вопрос меняет «Далее» на «Завершить»
	for (let i = 1; i < fullFlow.questions.length; i++) {
		await userEvent.click(page.getByRole('button', { name: 'Далее', exact: true }));
	}
	await userEvent.click(page.getByRole('button', { name: 'Завершить', exact: true }));
	// даём асинхронному next() (await saveFieldNow → onFinish) доработать
	await new Promise((r) => setTimeout(r, 25));
}

// ─── Хуки ─────────────────────────────────────────────────────────────

beforeEach(() => {
	navMocks.pageUrl.searchParams.delete('gto');
	navMocks.pageUrl.searchParams.delete('keep');
});

afterEach(() => {
	cleanup();
	navMocks.goto.mockClear();
	navMocks.replaceState.mockClear();
	profileSurveyStore.set(null);
	userStore.set(null);
});

// ─── Тесты ────────────────────────────────────────────────────────────

describe('questionary hub — GTO-флаг', () => {
	it('завершение полного потока при ?gto=false вызывает replaceState с gto=true, сохраняя другие параметры', async () => {
		navMocks.pageUrl.searchParams.set('gto', 'false');
		navMocks.pageUrl.searchParams.set('keep', '1');
		await mountHub();

		await completeFlowFromHub('Начать прохождение');

		expect(navMocks.goto).toHaveBeenCalledTimes(1);
		const [url] = navMocks.goto.mock.calls[0] as unknown as [string];
		expect(url).toContain('/questionary');
		expect(url).toContain('gto=true');
		expect(url).toContain('keep=1');
		expect(url).not.toContain('gto=false');
	});

	it('завершение section-flow при ?gto=false НЕ вызывает replaceState', async () => {
		navMocks.pageUrl.searchParams.set('gto', 'false');
		await mountHub();

		// первый «Начать» — карточка раздела (не «Начать прохождение»)
		await userEvent.click(page.getByRole('button', { name: 'Начать', exact: true }).first());
		await userEvent.click(page.getByRole('button', { name: 'Далее', exact: true }));
		await userEvent.click(page.getByRole('button', { name: 'Завершить', exact: true }));
		await new Promise((r) => setTimeout(r, 25));

		expect(navMocks.replaceState).not.toHaveBeenCalled();
	});

	it('кнопка «Продолжить с ГТО» рендерится и ведёт на /gto только при ?gto=true', async () => {
		navMocks.pageUrl.searchParams.set('gto', 'true');
		await mountHub();

		const gtoButton = page.getByRole('button', { name: 'Продолжить с ГТО' });
		expect(await gtoButton.query()).toBeTruthy();

		await userEvent.click(gtoButton);
		// Button с goto-prop вызывает goto(resolve(path), { invalidateAll })
		expect(navMocks.goto.mock.calls[0]?.[0]).toBe('/gto');
	});

	it('кнопка «Продолжить с ГТО» отсутствует при ?gto=false', async () => {
		navMocks.pageUrl.searchParams.set('gto', 'false');
		await mountHub();

		expect(await page.getByRole('button', { name: 'Продолжить с ГТО' }).query()).toBeFalsy();
	});

	it('кнопка «Продолжить с ГТО» отсутствует без параметра gto', async () => {
		await mountHub();

		expect(await page.getByRole('button', { name: 'Продолжить с ГТО' }).query()).toBeFalsy();
	});
});

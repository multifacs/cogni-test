import { render, cleanup } from 'vitest-browser-svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Page from './+page.svelte';
import type { PageProps } from './$types';
import type { FileNumberStatus } from '$lib/client/gto-button-data';

// app.css подключает Tailwind — без него утилиты не сгенерируются
// в тестовом окружении, и trusted-клик может промахиваться по мишеням
// (см. AGENTS.md: campimetry click-through)
import '../../../../../app.css';

// ─── Хоистированные моки ──────────────────────────────────────────────

const navMocks = vi.hoisted(() => ({
	goto: vi.fn<(target?: string | URL) => Promise<void>>(() => Promise.resolve()),
	invalidateAll: vi.fn(() => Promise.resolve())
}));

// Button.svelte импортирует goto из '$app/navigation' — мок обязан его отдавать
const pathsMocks = vi.hoisted(() => ({
	resolve: vi.fn((path: string) => path)
}));

const buttonDataMocks = vi.hoisted(() => ({
	getFileNumbersWithStatus: vi.fn(() => Promise.resolve([] as FileNumberStatus[])),
	loadAllButtonData: vi.fn(() => Promise.resolve([] as [string, unknown][])),
	hasOldFormatData: vi.fn(() => Promise.resolve(false)),
	uploadButtonFiles: vi.fn<(files: FileList) => Promise<unknown>>(() => Promise.resolve([])),
	clearAllButtonData: vi.fn(() => Promise.resolve()),
	getParticipantIdsForFile: vi.fn<(fn: string) => Promise<number[]>>(() => Promise.resolve([])),
	getResultForParticipant: vi.fn<
		(fn: string, n: number) => Promise<{ left?: unknown; right?: unknown }>
	>(() => Promise.resolve({}))
}));

const certMocks = vi.hoisted(() => ({
	downloadCertificatePdf: vi.fn(() => Promise.resolve())
}));

// ─── Моки ─────────────────────────────────────────────────────────────

vi.mock('$app/navigation', () => ({
	goto: (target?: string | URL) => navMocks.goto(target),
	invalidateAll: () => navMocks.invalidateAll()
}));

vi.mock('$app/paths', () => ({
	resolve: (path: string) => pathsMocks.resolve(path)
}));

vi.mock('$lib/client/gto-button-data', () => ({
	uploadButtonFiles: (files: FileList) => buttonDataMocks.uploadButtonFiles(files),
	getParticipantIdsForFile: (fn: string) => buttonDataMocks.getParticipantIdsForFile(fn),
	getResultForParticipant: (fn: string, n: number) =>
		buttonDataMocks.getResultForParticipant(fn, n),
	clearAllButtonData: () => buttonDataMocks.clearAllButtonData(),
	loadAllButtonData: () => buttonDataMocks.loadAllButtonData(),
	getFileNumbersWithStatus: () => buttonDataMocks.getFileNumbersWithStatus(),
	hasOldFormatData: () => buttonDataMocks.hasOldFormatData()
}));

vi.mock('$lib/certificate/generate', () => ({
	downloadCertificatePdf: () => certMocks.downloadCertificatePdf()
}));

// xlsx — тяжёлая CJS-зависимость; в тестах экспорт не кликается,
// модуль мокается, чтобы не тащить весь бандл в браузер.
vi.mock('xlsx', () => ({
	utils: {
		json_to_sheet: vi.fn(),
		book_new: vi.fn(),
		sheet_add_aoa: vi.fn(),
		book_append_sheet: vi.fn()
	},
	writeFile: vi.fn()
}));

// ─── Фикстуры ─────────────────────────────────────────────────────────

function makeData(): PageProps['data'] {
	return {
		session: {
			id: 'gto-1',
			name: 'Тестовая сессия',
			type: 'standard',
			status: 'active',
			createdAt: '2026-09-01 10:00:00',
			participants: []
		},
		metrics: [],
		authorizedUsers: [],
		wordSets: [],
		gtoIdMap: new Map(),
		wordSetIdMap: new Map(),
		// Данные родительского layout ((app)/+layout.server.ts)
		user: {
			id: 'user-1',
			firstname: 'NM',
			lastname: 'USR',
			birthday: new Date('2000-01-01'),
			sex: 'male'
		},
		profileSurvey: { userId: 'user-1' },
		undiagnosed: false,
		loggedInAdmin: false,
		allowedPaths: ['/home', '/tests', '/profile', '/admin', '/gto'],
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
 * Объект контекста заголовка: страница читает его через
 * getContext<{ value: string }>('headerText') и пишет в .value из $effect.
 * vitest-browser-svelte не имеет опции `context`, но Svelte 5 mount — имеет:
 * render проксирует MountOptions (включая context: Map) напрямую в mount().
 */
function makeHeaderContext(): { value: string } {
	return { value: '' };
}

function renderPage(overrides?: { data?: Partial<PageProps['data']> }) {
	const headerContext = makeHeaderContext();
	const data = { ...makeData(), ...overrides?.data };
	const promise = render(Page, {
		props: { data, params: { id: 'gto-1' }, form: null },
		context: new Map([['headerText', headerContext]])
	});
	return { promise, headerContext };
}

/** Открывает меню действий с сессией и возвращает кнопку пункта по тексту. */
async function openSessionMenu(container: HTMLElement, itemText: string) {
	const menuToggle = container.querySelector<HTMLButtonElement>(
		'button[aria-label="Действия с сессией"]'
	);
	expect(menuToggle).toBeTruthy();
	clickButton(menuToggle!);
	await flushUpdate();
	return [...container.querySelectorAll('button')].find((b) =>
		b.textContent?.includes(itemText)
	) as HTMLButtonElement | undefined;
}

// ─── Хуки ─────────────────────────────────────────────────────────────

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	vi.unstubAllGlobals();
});

// ─── Тесты ────────────────────────────────────────────────────────────

describe('/admin/gto/[id] — реструктурированная страница сессии', () => {
	it('карточки управления скрыты по умолчанию', async () => {
		const { promise } = renderPage();
		const { container } = await promise;

		// По умолчанию обе карточки скрыты: содержимого файлов нет в документе
		expect(container.textContent).not.toContain('Загрузить файлы');
		expect(container.textContent).not.toContain('Добавить участника');

		// Тоггл присутствует и свёрнут
		const toggle = container.querySelector<HTMLButtonElement>(
			'button[aria-label="Карточки управления сессией"]'
		);
		expect(toggle).toBeTruthy();
		expect(toggle?.textContent).toContain('Управление: участники и файлы кнопочных тестов');
		expect(toggle?.getAttribute('aria-expanded')).toBe('false');
	});

	it('общий тоггл раскрывает обе карточки', async () => {
		const { promise } = renderPage();
		const { container } = await promise;

		const toggle = container.querySelector<HTMLButtonElement>(
			'button[aria-label="Карточки управления сессией"]'
		);
		expect(toggle).toBeTruthy();
		expect(toggle?.getAttribute('aria-expanded')).toBe('false');

		clickButton(toggle!);
		await flushUpdate();

		// Обе карточки раскрыты одним кликом
		expect(container.textContent).toContain('Добавить участника');
		expect(container.textContent).toContain('Файлы кнопочных тестов');
		expect(container.textContent).toContain('Загрузить файлы');
		expect(toggle?.getAttribute('aria-expanded')).toBe('true');

		// Повторный клик скрывает обе карточки
		clickButton(toggle!);
		await flushUpdate();

		expect(container.textContent).not.toContain('Добавить участника');
		expect(container.textContent).not.toContain('Загрузить файлы');
	});

	it('показывает кнопку «Экспорт результатов» в тулбаре', async () => {
		const { promise } = renderPage();
		const { container } = await promise;

		const exportBtn = findButtonByText(container, 'Экспорт результатов');
		expect(exportBtn).toBeTruthy();
		// Статус-бейдж активной сессии
		expect(container.textContent).toContain('Активна');
	});

	it('записывает имя сессии в headerText-контекст через $effect', async () => {
		const { promise, headerContext } = renderPage();
		await promise;

		expect(headerContext.value).toBe('Тестовая сессия');
	});

	it('rename: PATCH с action=rename и обновление заголовка после rerender', async () => {
		const fetchMock = vi.fn(() => Promise.resolve({ ok: true } as Response));
		vi.stubGlobal('fetch', fetchMock);

		const { promise, headerContext } = renderPage();
		const { container } = await promise;

		// Карандаш → инпут переименования
		const pencil = container.querySelector<HTMLButtonElement>(
			'button[aria-label="Переименовать"]'
		);
		expect(pencil).toBeTruthy();
		clickButton(pencil!);
		await flushUpdate();

		const input = container.querySelector('input[type="text"]') as HTMLInputElement;
		expect(input).toBeTruthy();
		input.value = 'Новое имя';
		input.dispatchEvent(new Event('input', { bubbles: true }));

		const save = findButtonByText(container, 'Сохранить');
		expect(save).toBeTruthy();
		clickButton(save!);

		await vi.waitFor(() => {
			expect(fetchMock).toHaveBeenCalledTimes(1);
		});

		const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('');
		expect(init.method).toBe('PATCH');
		const fd = init.body as FormData;
		expect(fd.get('action')).toBe('rename');
		expect(fd.get('name')).toBe('Новое имя');

		// invalidateAll вызван после успешного PATCH…
		await vi.waitFor(() => {
			expect(navMocks.invalidateAll).toHaveBeenCalledTimes(1);
		});

		// …после обновления data (rerender) $effect переписывает заголовок
		await promise.then((r) =>
			r.rerender({
				data: { ...makeData(), session: { ...makeData().session, name: 'Новое имя' } }
			})
		);
		expect(headerContext.value).toBe('Новое имя');
	});

	it('сетка файлов: рендер карточек и поиск', async () => {
		buttonDataMocks.getFileNumbersWithStatus.mockImplementation(() =>
			Promise.resolve([
				{ fileNumber: '101', hasLeft: true, hasRight: true },
				{ fileNumber: '202', hasLeft: true, hasRight: false }
			])
		);

		const { promise } = renderPage();
		const { container } = await promise;

		// Раскрываем карточки
		const toggle = container.querySelector<HTMLButtonElement>(
			'button[aria-label="Карточки управления сессией"]'
		);
		expect(toggle).toBeTruthy();
		clickButton(toggle!);
		await flushUpdate();

		// Обе карточки файлов отрендерены в сетке
		expect(container.textContent).toContain('101');
		expect(container.textContent).toContain('202');
		expect(container.textContent).toContain('2 файлов');

		// Ищем «101» — карточка 202 исчезает
		const search = container.querySelector<HTMLInputElement>(
			'input[placeholder="Поиск по названию файла..."]'
		);
		expect(search).toBeTruthy();
		search!.value = '101';
		search!.dispatchEvent(new Event('input', { bubbles: true }));
		await flushUpdate();

		expect(container.textContent).toContain('101');
		expect(container.textContent).not.toContain('202');

		// Поиск без результатов — «Ничего не найдено»
		search!.value = '999';
		search!.dispatchEvent(new Event('input', { bubbles: true }));
		await flushUpdate();

		expect(container.textContent).toContain('Ничего не найдено');
		expect(container.textContent).not.toContain('101');
	});
});

describe('/admin/gto/[id] — удаление завершённой сессии', () => {
	it('кнопка «Удалить сессию» доступна в меню завершённой сессии', async () => {
		const { promise } = renderPage({
			data: { session: { ...makeData().session, status: 'completed' } }
		});
		const { container } = await promise;

		const deleteBtn = await openSessionMenu(container, 'Удалить сессию');
		expect(deleteBtn).toBeTruthy();
	});

	it('кнопки «Удалить сессию» нет в меню активной сессии', async () => {
		const { promise } = renderPage(); // default fixture: status 'active'
		const { container } = await promise;

		const deleteBtn = await openSessionMenu(container, 'Удалить сессию');
		expect(deleteBtn).toBeUndefined();
	});

	it('подтверждение принято → DELETE-запрос и переход на /admin/gto', async () => {
		const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
		const fetchMock = vi.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ success: true })
			} as Response)
		);
		vi.stubGlobal('fetch', fetchMock);

		const { promise } = renderPage({
			data: { session: { ...makeData().session, status: 'completed' } }
		});
		const { container } = await promise;

		const deleteBtn = await openSessionMenu(container, 'Удалить сессию');
		expect(deleteBtn).toBeTruthy();
		clickButton(deleteBtn!);

		expect(confirmSpy).toHaveBeenCalledWith('Удалить завершённую сессию? Действие необратимо.');
		await vi.waitFor(() => {
			expect(fetchMock).toHaveBeenCalledTimes(1);
		});
		const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('');
		expect(init.method).toBe('DELETE');

		await vi.waitFor(() => {
			expect(navMocks.goto).toHaveBeenCalledWith('/admin/gto');
		});
	});

	it('подтверждение отклонено → нет ни запроса, ни перехода', async () => {
		const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
		const fetchMock = vi.fn(() => Promise.resolve({ ok: true } as Response));
		vi.stubGlobal('fetch', fetchMock);

		const { promise } = renderPage({
			data: { session: { ...makeData().session, status: 'completed' } }
		});
		const { container } = await promise;

		const deleteBtn = await openSessionMenu(container, 'Удалить сессию');
		expect(deleteBtn).toBeTruthy();
		clickButton(deleteBtn!);

		expect(confirmSpy).toHaveBeenCalled();
		await flushUpdate();
		expect(fetchMock).not.toHaveBeenCalled();
		expect(navMocks.goto).not.toHaveBeenCalled();
	});

	it('DELETE отвечает ошибкой → тост с сообщением сервера, без перехода', async () => {
		vi.spyOn(window, 'confirm').mockReturnValue(true);
		const fetchMock = vi.fn(() =>
			Promise.resolve({
				ok: false,
				json: () => Promise.resolve({ error: 'Сессия не найдена' })
			} as Response)
		);
		vi.stubGlobal('fetch', fetchMock);

		const { promise } = renderPage({
			data: { session: { ...makeData().session, status: 'completed' } }
		});
		const { container } = await promise;

		const deleteBtn = await openSessionMenu(container, 'Удалить сессию');
		expect(deleteBtn).toBeTruthy();
		clickButton(deleteBtn!);

		await vi.waitFor(() => {
			expect(container.textContent).toContain('Сессия не найдена');
		});
		expect(navMocks.goto).not.toHaveBeenCalled();
	});
});

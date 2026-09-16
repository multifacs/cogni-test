import { render, cleanup } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Page from './+page.svelte';
import { startStreaming } from '$lib/stores/streaming.svelte';
import type { TestData } from '$lib/tests';
import type { OfflinePayload, QueueElement, QueueKind } from '$lib/client/offline-queue';

// app.css подключает Tailwind — без него утилиты не сгенерируются
// в тестовом окружении (обязательный импорт browser-спеков проекта)
import '../../../../../app.css';

// ─── Хоистированные моки ──────────────────────────────────────────────

const navMocks = vi.hoisted(() => ({
	goto: vi.fn<(path: string, opts?: { invalidateAll?: boolean }) => Promise<void>>(() =>
		Promise.resolve()
	),
	invalidateAll: vi.fn<() => Promise<void>>(() => Promise.resolve())
}));

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => navMocks.goto(...(args as [string])),
	invalidateAll: (...args: unknown[]) => navMocks.invalidateAll(...(args as []))
}));

// resolve → identity: goto-кнопка Button получает путь «как есть»
vi.mock('$app/paths', () => ({
	resolve: (path: string) => path
}));

// store startStreaming работает напрямую (browser=true)
vi.mock('$app/environment', () => ({
	browser: true
}));

// Реестр тестов заменён стабом: resultsChart указывает на game-stub,
// поэтому динамическая загрузка реальных графиков не выполняется.
vi.mock('$lib/tests', async () => {
	const { default: GameStub } = await import('$lib/testing/game-stub.svelte');
	return {
		testRegistry: {
			stroop: {
				title: 'Струп',
				resultsChart: async () => ({ default: GameStub })
			}
		}
	};
});

// Оффлайн-очередь: getPendingAttempts — управляемый фикстурой,
// flushQueue — резолвится дефолтной сводкой (перекрывается в тестах).
const queueMocks = vi.hoisted(() => ({
	getPendingAttempts: vi.fn<(slug?: string, kind?: QueueKind) => Promise<QueueElement[]>>(
		async () => []
	),
	flushQueue: vi.fn(async () => ({ flushed: 0, remaining: 1, skipped: 0 }))
}));

vi.mock('$lib/client/offline-queue', () => ({
	getPendingAttempts: (...args: unknown[]) =>
		queueMocks.getPendingAttempts(...(args as [string, QueueKind])),
	flushQueue: () => queueMocks.flushQueue()
}));

// ─── Хелперы ──────────────────────────────────────────────────────────

type ServerSession = {
	sessionId: string;
	createdAt: string;
	attempts: unknown[];
	meta?: unknown;
};

const SERVER_SESSIONS: ServerSession[] = [
	{ sessionId: 'srv-1', createdAt: '2026-09-10T10:00:00.000Z', attempts: [{ a: 1 }] },
	{ sessionId: 'srv-2', createdAt: '2026-09-11T10:00:00.000Z', attempts: [{ a: 2 }] }
];

// Живая streaming-очередь: один непройденный видимый тест
const QUEUE_ITEM: TestData = {
	name: 'math',
	title: 'Быстрый счет',
	path: '/tests/math/about',
	img: '/tests/math1.svg'
};

function pendingElement(id: string, sessionId: string, enqueuedAt = Date.now()): QueueElement {
	return {
		id,
		slug: 'stroop',
		enqueuedAt,
		kind: 'test',
		// Минимальная фикстура: значения не моделируют полный тип результата,
		// поэтому осознанный каст через unknown (контракт очереди соблюдён)
		payload: { sessionId, results: [{ answer: 1, correct: true }] } as unknown as OfflinePayload
	};
}

/** Даёт onMount, $effect и динамическому import графика отработать. */
async function settle(ms = 50) {
	await new Promise((r) => setTimeout(r, ms));
}

async function mountPage(pending: QueueElement[] = []) {
	queueMocks.getPendingAttempts.mockImplementation(async () => pending);
	const result = await render(Page, {
		props: { data: { slug: 'stroop', results: SERVER_SESSIONS } } as never
	});
	await settle();
	return result;
}

// ─── Хуки ─────────────────────────────────────────────────────────────

beforeEach(() => {
	navMocks.goto.mockClear();
	navMocks.invalidateAll.mockClear();
	queueMocks.getPendingAttempts.mockReset();
	queueMocks.flushQueue.mockReset();
	queueMocks.flushQueue.mockImplementation(async () => ({
		flushed: 0,
		remaining: 1,
		skipped: 0
	}));
	// Сброс streaming-store между тестами
	startStreaming([], {});
});

afterEach(() => {
	cleanup();
});

// ─── Тесты ────────────────────────────────────────────────────────────

describe('tests results — merge pending offline attempts', () => {
	it('pending-попытка отдельным рядом: красный бейдж у неё, зелёные у серверных', async () => {
		const { container } = await mountPage([pendingElement('q1', 'pend-1')]);

		// 2 серверных + 1 pending = 3 ряда
		expect(container.querySelectorAll('[title="Загружено"]')).toHaveLength(2);
		expect(container.querySelectorAll('[title="Ожидает загрузки"]')).toHaveLength(1);
		expect(
			container.querySelectorAll('[title="Загружено"], [title="Ожидает загрузки"]')
		).toHaveLength(3);
	});

	it('дедуп: pending с sessionId серверной сессии не добавляет ряд', async () => {
		const { container } = await mountPage([pendingElement('q1', 'srv-1')]);

		// только серверные ряды, дубль не отрисован
		expect(container.querySelectorAll('[title="Загружено"]')).toHaveLength(2);
		expect(container.querySelectorAll('[title="Ожидает загрузки"]')).toHaveLength(0);
	});

	it('flushQueue с flushed > 0 вызывает invalidateAll', async () => {
		queueMocks.flushQueue.mockImplementation(async () => ({
			flushed: 1,
			remaining: 0,
			skipped: 0
		}));
		await mountPage([pendingElement('q1', 'pend-1')]);

		await settle();
		expect(queueMocks.flushQueue).toHaveBeenCalledTimes(1);
		expect(navMocks.invalidateAll).toHaveBeenCalledTimes(1);
	});

	it('flushQueue с flushed = 0 НЕ вызывает invalidateAll', async () => {
		// дефолтная реализация: flushed 0
		await mountPage([pendingElement('q1', 'pend-1')]);

		await settle();
		expect(queueMocks.flushQueue).toHaveBeenCalledTimes(1);
		expect(navMocks.invalidateAll).not.toHaveBeenCalled();
	});

	it('без pending: только серверные ряды, flushQueue не вызывается', async () => {
		const { container } = await mountPage([]);

		expect(container.querySelectorAll('[title="Загружено"]')).toHaveLength(2);
		expect(queueMocks.flushQueue).not.toHaveBeenCalled();
		expect(navMocks.invalidateAll).not.toHaveBeenCalled();
	});
});

describe('tests results — лейбл кнопки из streaming-store', () => {
	it('живая очередь в store → кнопка «К следующему»', async () => {
		startStreaming([QUEUE_ITEM], {});
		const { container } = await mountPage([]);

		expect(container.textContent).toContain('К следующему');
		expect(container.textContent).not.toContain('К тестам');
	});

	it('пустая очередь в store → кнопка «К тестам»', async () => {
		const { container } = await mountPage([]);

		expect(container.textContent).toContain('К тестам');
		expect(container.textContent).not.toContain('К следующему');
	});

	it('живая очередь: клик по кнопке ведёт на /tests', async () => {
		startStreaming([QUEUE_ITEM], {});
		await mountPage([]);

		await page.getByRole('button', { name: 'К следующему' }).click();

		expect(navMocks.goto).toHaveBeenCalledTimes(1);
		expect(navMocks.goto).toHaveBeenCalledWith('/tests', { invalidateAll: false });
	});

	it('пустая очередь: клик по кнопке ведёт на /tests', async () => {
		await mountPage([]);

		await page.getByRole('button', { name: 'К тестам' }).click();

		expect(navMocks.goto).toHaveBeenCalledTimes(1);
		expect(navMocks.goto).toHaveBeenCalledWith('/tests', { invalidateAll: false });
	});
});

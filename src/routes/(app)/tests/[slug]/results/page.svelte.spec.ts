import { render, cleanup } from 'vitest-browser-svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Page from './+page.svelte';

// app.css подключает Tailwind — без него утилиты не сгенерируются
// в тестовом окружении (обязательный импорт browser-спеков проекта)
import '../../../../../app.css';

// ─── Хоистированные моки ──────────────────────────────────────────────

const navMocks = vi.hoisted(() => ({
	goto: vi.fn((_url: string) => Promise.resolve()),
	invalidateAll: vi.fn(() => Promise.resolve())
}));

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => navMocks.goto(...(args as [string])),
	invalidateAll: (...args: unknown[]) => navMocks.invalidateAll(...(args as []))
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
	getPendingAttempts: vi.fn(async (_slug?: string, _kind?: string) => [] as never[]),
	flushQueue: vi.fn(async () => ({ flushed: 0, remaining: 1, skipped: 0 }))
}));

vi.mock('$lib/client/offline-queue', () => ({
	getPendingAttempts: (...args: unknown[]) =>
		queueMocks.getPendingAttempts(...(args as [string, string])),
	flushQueue: () => queueMocks.flushQueue()
}));

// runAllMode: getItem → false (режим одиночного теста).
// Экспорты продублированы на верхнем уровне — CJS-интероп localforage
// в browser-режиме иначе теряет default.
vi.mock('localforage', () => {
	const impl = {
		getItem: vi.fn(async () => false),
		setItem: vi.fn(async () => {}),
		removeItem: vi.fn(async () => {})
	};
	return { default: impl, ...impl };
});

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

function pendingElement(id: string, sessionId: string, enqueuedAt = Date.now()) {
	return {
		id,
		slug: 'stroop',
		enqueuedAt,
		kind: 'test' as const,
		payload: { sessionId, results: [{ answer: 1, correct: true }] }
	};
}

/** Даёт onMount, $effect и динамическому import графика отработать. */
async function settle(ms = 50) {
	await new Promise((r) => setTimeout(r, ms));
}

async function mountPage(pending: unknown[] = []) {
	queueMocks.getPendingAttempts.mockImplementation(async () => pending as never);
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

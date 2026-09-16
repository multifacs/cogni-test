import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { TestData } from '$lib/tests';

let mockBrowser = true;

vi.mock('$app/environment', () => ({
	get browser() {
		return mockBrowser;
	}
}));

import {
	streaming,
	startStreaming,
	requestStreamingStart,
	completeTest,
	isStreamingActive
} from './streaming.svelte';

// ─── Helpers ──────────────────────────────────────────────────────────

function makeTest(partial: Partial<TestData> & { name: string; path: string }): TestData {
	return {
		title: partial.name,
		img: `/img/${partial.name}.svg`,
		...partial
	} as TestData;
}

const fixture: TestData[] = [
	makeTest({ name: 'alpha', path: '/tests/alpha/about' }),
	makeTest({ name: 'beta', path: '/tests/beta/about' }),
	makeTest({ name: 'gamma', path: '/tests/gamma/about' })
];

/** Сброс состояния через публичный API: пустой старт + снятие очереди. */
function resetStore(): void {
	startStreaming([], {});
}

beforeEach(() => {
	mockBrowser = true;
	resetStore();
});

// ─── startStreaming: построение очереди ───────────────────────────────

describe('startStreaming', () => {
	test('строит очередь из тестов с <1 результатом, порядок реестра сохранён', () => {
		startStreaming(fixture, { alpha: 1, beta: 0, gamma: 2 });
		expect(streaming.queue).toEqual([{ name: 'beta', path: '/tests/beta/about' }]);
	});

	test('count undefined тоже попадает в очередь', () => {
		startStreaming(fixture, { alpha: 3 });
		expect(streaming.queue.map((t) => t.name)).toEqual(['beta', 'gamma']);
	});

	test('все тесты ≥1 результата → в очереди все тесты (режим повтора серии)', () => {
		startStreaming(fixture, { alpha: 1, beta: 2, gamma: 3 });
		expect(streaming.queue.map((t) => t.name)).toEqual(['alpha', 'beta', 'gamma']);
	});

	test('фильтрует hidden-тесты (правило getStreamingQueue №1)', () => {
		const withHidden = [
			...fixture,
			makeTest({ name: 'secret', path: '/tests/secret/about', hidden: true })
		];
		startStreaming(withHidden, {});
		expect(streaming.queue.map((t) => t.name)).toEqual(['alpha', 'beta', 'gamma']);
	});

	test('пустой список тестов → пустая очередь', () => {
		startStreaming([], {});
		expect(streaming.queue).toEqual([]);
	});

	test('очередь хранит минимальный снапшот (name, path), не весь TestData', () => {
		startStreaming(fixture, {});
		for (const item of streaming.queue) {
			expect(Object.keys(item).sort()).toEqual(['name', 'path']);
		}
	});

	test('повторный старт перезаписывает очередь, старое содержимое стирается', () => {
		startStreaming(fixture, {});
		expect(streaming.queue).toHaveLength(3);
		startStreaming([fixture[0]], {});
		expect(streaming.queue).toEqual([{ name: 'alpha', path: '/tests/alpha/about' }]);
	});

	test('сбрасывает pendingStart в false', () => {
		requestStreamingStart();
		expect(streaming.pendingStart).toBe(true);
		startStreaming([], {});
		expect(streaming.pendingStart).toBe(false);
	});
});

// ─── requestStreamingStart ────────────────────────────────────────────

describe('requestStreamingStart', () => {
	test('ставит pendingStart = true', () => {
		expect(streaming.pendingStart).toBe(false);
		requestStreamingStart();
		expect(streaming.pendingStart).toBe(true);
	});
});

// ─── completeTest ─────────────────────────────────────────────────────

describe('completeTest', () => {
	test('снимает только указанный тест, порядок остальных сохранён', () => {
		startStreaming(fixture, {});
		completeTest('beta');
		expect(streaming.queue.map((t) => t.name)).toEqual(['alpha', 'gamma']);
	});

	test('несуществующий name — no-op, очередь неизменна', () => {
		startStreaming(fixture, {});
		const before = [...streaming.queue];
		completeTest('nonexistent');
		expect(streaming.queue).toEqual(before);
	});

	test('повторное снятие того же name — no-op (idempotent)', () => {
		startStreaming(fixture, {});
		completeTest('alpha');
		completeTest('alpha');
		expect(streaming.queue.map((t) => t.name)).toEqual(['beta', 'gamma']);
	});
});

// ─── isStreamingActive ────────────────────────────────────────────────

describe('isStreamingActive', () => {
	test('false на пустой очереди', () => {
		expect(isStreamingActive()).toBe(false);
	});

	test('true на непустой очереди', () => {
		startStreaming(fixture, {});
		expect(isStreamingActive()).toBe(true);
	});

	test('true после requestStreamingStart даже с пустой очередью не даёт — зависит только от очереди', () => {
		requestStreamingStart();
		expect(streaming.queue).toEqual([]);
		expect(isStreamingActive()).toBe(false);
	});
});

// ─── SSR-guard ────────────────────────────────────────────────────────

describe('SSR-guard (browser = false)', () => {
	test('все три мутации — no-op, состояние неизменно', () => {
		startStreaming(fixture, {});
		const queueBefore = [...streaming.queue];

		mockBrowser = false;

		startStreaming([], {});
		expect(streaming.queue).toEqual(queueBefore);
		expect(streaming.pendingStart).toBe(false);

		requestStreamingStart();
		expect(streaming.pendingStart).toBe(false);

		completeTest('alpha');
		expect(streaming.queue).toEqual(queueBefore);
	});

	test('isStreamingActive без guard: false на пустой очереди, true на непустой', () => {
		mockBrowser = false;
		startStreaming(fixture, {});
		// browser=false → мутация не прошла, очередь пуста
		expect(streaming.queue).toEqual([]);
		expect(isStreamingActive()).toBe(false);

		mockBrowser = true;
		startStreaming(fixture, {});
		mockBrowser = false;
		// read-функция работает независимо от guard
		expect(isStreamingActive()).toBe(true);
	});
});

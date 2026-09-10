import { describe, test, expect, beforeEach, vi } from 'vitest';
import localforage from 'localforage';
import { enqueueAttempt, getPendingAttempts, flushQueue } from './offline-queue';
import type { QueueElement } from './offline-queue';

const mockStore = new Map<string, unknown>();

vi.mock('localforage', () => ({
	default: {
		getItem: (key: string) => Promise.resolve(mockStore.get(key) ?? null),
		setItem: (key: string, value: unknown) => {
			mockStore.set(key, value);
			return Promise.resolve(value);
		}
	}
}));

// Mock short-uuid to have predictable IDs in tests
let idCounter = 0;
vi.mock('short-uuid', () => ({
	generate: () => `mock-id-${idCounter++}`
}));

beforeEach(() => {
	mockStore.clear();
	idCounter = 0;
	// Simulate browser environment for all tests except the explicit SSR case
	(globalThis as any).window = {};
});

function makeQueueElement(overrides: Partial<QueueElement> = {}): QueueElement {
	return {
		id: 'q1',
		slug: 'rhythm',
		enqueuedAt: 1,
		payload: {
			sessionId: 'sid-1',
			results: { results: [], meta: { difficulty: 'easy', overpress: '0' } }
		},
		...overrides
	};
}

describe('enqueueAttempt', () => {
	test('returns generated id and appends element', async () => {
		expect.assertions(2);
		const id = enqueueAttempt('rhythm', {
			sessionId: 's1',
			results: { results: [], meta: { difficulty: 'medium' } }
		});
		expect(id).toBe('mock-id-0');
		// Allow async write to settle
		await new Promise((resolve) => setTimeout(resolve, 10));
		const pending = await getPendingAttempts('rhythm');
		expect(pending).toHaveLength(1);
	});
	test('throws when called in non-browser', () => {
		// This test runs in node where window is undefined
		delete (globalThis as any).window;
		expect(() =>
			enqueueAttempt('rhythm', {
				sessionId: 's1',
				results: { results: [], meta: {} }
			})
		).toThrow('enqueueAttempt must be called in the browser');
	});
});

describe('getPendingAttempts', () => {
	test('returns all elements when no slug filter', async () => {
		mockStore.set('offline-attempt-queue', [
			makeQueueElement({ id: 'a', slug: 'rhythm' }),
			makeQueueElement({ id: 'b', slug: 'campimetry' })
		]);
		const pending = await getPendingAttempts();
		expect(pending).toHaveLength(2);
	});

	test('filters by slug', async () => {
		mockStore.set('offline-attempt-queue', [
			makeQueueElement({ id: 'a', slug: 'rhythm' }),
			makeQueueElement({ id: 'b', slug: 'campimetry' }),
			makeQueueElement({ id: 'c', slug: 'rhythm' })
		]);
		const pending = await getPendingAttempts('rhythm');
		expect(pending.map((el) => el.id)).toEqual(['a', 'c']);
	});

	test('returns empty array when store is empty', async () => {
		const pending = await getPendingAttempts('rhythm');
		expect(pending).toEqual([]);
	});

	test('returns empty array in SSR (window undefined)', async () => {
		delete (globalThis as any).window;
		mockStore.set('offline-attempt-queue', [
			makeQueueElement({ id: 'a', slug: 'rhythm' })
		]);
		const pending = await getPendingAttempts('rhythm');
		expect(pending).toEqual([]);
	});
});

describe('flushQueue', () => {
	const fetchMock = vi.fn();
	beforeEach(() => {
		fetchMock.mockReset();
		global.fetch = fetchMock;
	});

	test('happy path: POSTs each element in order and deletes on confirmed sessionId', async () => {
		mockStore.set('offline-attempt-queue', [
			makeQueueElement({ id: 'a', slug: 'rhythm', payload: { sessionId: 'sid-a', results: { results: [], meta: {} } } }),
			makeQueueElement({ id: 'b', slug: 'rhythm', payload: { sessionId: 'sid-b', results: { results: [], meta: {} } } })
		]);

		fetchMock
			.mockResolvedValueOnce({ ok: true, json: async () => ({ sessionId: 'sid-a' }) })
			.mockResolvedValueOnce({ ok: true, json: async () => ({ sessionId: 'sid-b' }) });

		const summary = await flushQueue();
		expect(summary.flushed).toBe(2);
		expect(summary.remaining).toBe(0);

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(fetchMock.mock.calls[0][0]).toBe('/exercises/rhythm/playground');
		expect(fetchMock.mock.calls[1][0]).toBe('/exercises/rhythm/playground');

		const remaining = (mockStore.get('offline-attempt-queue') as QueueElement[]) ?? [];
		expect(remaining).toHaveLength(0);
	});

	test('stops flushing on first error (fetch rejects) and leaves remaining', async () => {
		mockStore.set('offline-attempt-queue', [
			makeQueueElement({ id: 'a', slug: 'rhythm', payload: { sessionId: 'sid-a', results: { results: [], meta: {} } } }),
			makeQueueElement({ id: 'b', slug: 'rhythm', payload: { sessionId: 'sid-b', results: { results: [], meta: {} } } })
		]);

		fetchMock
			.mockResolvedValueOnce({ ok: true, json: async () => ({ sessionId: 'sid-a' }) })
			.mockRejectedValueOnce(new Error('Network failure'));

		const summary = await flushQueue();
		expect(summary.flushed).toBe(1);
		expect(summary.remaining).toBe(1);

		const remaining = (mockStore.get('offline-attempt-queue') as QueueElement[]) ?? [];
		expect(remaining.map((el) => el.id)).toEqual(['b']);
	});

	test('non-ok response leaves element in queue', async () => {
		mockStore.set('offline-attempt-queue', [
			makeQueueElement({ id: 'a', slug: 'rhythm', payload: { sessionId: 'sid-a', results: { results: [], meta: {} } } })
		]);

		fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });

		const summary = await flushQueue();
		expect(summary.flushed).toBe(0);
		expect(summary.remaining).toBe(1);

		const remaining = (mockStore.get('offline-attempt-queue') as QueueElement[]) ?? [];
		expect(remaining).toHaveLength(1);
	});

	test('foreign sessionId in response leaves element in queue (M1 guard)', async () => {
		mockStore.set('offline-attempt-queue', [
			makeQueueElement({ id: 'a', slug: 'rhythm', payload: { sessionId: 'sid-a', results: { results: [], meta: {} } } })
		]);

		fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ sessionId: 'different-id' }) });

		const summary = await flushQueue();
		expect(summary.flushed).toBe(0);
		expect(summary.remaining).toBe(1);

		const remaining = (mockStore.get('offline-attempt-queue') as QueueElement[]) ?? [];
		expect(remaining).toHaveLength(1);
	});

	test('401 response leaves element in queue to retry later', async () => {
		mockStore.set('offline-attempt-queue', [
			makeQueueElement({ id: 'a', slug: 'rhythm', payload: { sessionId: 'sid-a', results: { results: [], meta: {} } } })
		]);

		fetchMock.mockResolvedValueOnce({ ok: false, status: 401 });

		const summary = await flushQueue();
		expect(summary.flushed).toBe(0);
		expect(summary.remaining).toBe(1);

		const remaining = (mockStore.get('offline-attempt-queue') as QueueElement[]) ?? [];
		expect(remaining).toHaveLength(1);
	});
});


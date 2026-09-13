import { describe, test, expect, beforeEach, vi } from 'vitest';
import localforage from 'localforage';
import { enqueueAttempt, getPendingAttempts, flushQueue } from './offline-queue';
import type { QueueElement } from './offline-queue';

const mockStore = new Map<string, unknown>();

const setItemMock = vi.fn((key: string, value: unknown) => {
	mockStore.set(key, value);
	return Promise.resolve(value);
});

vi.mock('localforage', () => ({
	default: {
		getItem: (key: string) => Promise.resolve(mockStore.get(key) ?? null),
		setItem: (key: string, value: unknown) => setItemMock(key, value)
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
	setItemMock.mockClear();
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
		const id = await enqueueAttempt('rhythm', {
			sessionId: 's1',
			results: { results: [], meta: { difficulty: 'medium' } }
		});
		expect(id).toBe('mock-id-0');
		const pending = await getPendingAttempts('rhythm');
		expect(pending).toHaveLength(1);
	});
	test('rejects when called in non-browser', async () => {
		// This test runs in node where window is undefined
		delete (globalThis as any).window;
		await expect(
			enqueueAttempt('rhythm', {
				sessionId: 's1',
				results: { results: [], meta: {} }
			})
		).rejects.toThrow('enqueueAttempt must be called in the browser');
	});
	test('rejects when localforage.setItem fails and does not persist the element', async () => {
		setItemMock.mockRejectedValueOnce(new Error('quota exceeded'));

		await expect(
			enqueueAttempt('rhythm', {
				sessionId: 's1',
				results: { results: [], meta: {} }
			})
		).rejects.toThrow();

		expect(await getPendingAttempts('rhythm')).toEqual([]);
		expect(await getPendingAttempts()).toEqual([]);
	});
	test('records kind into the element (defaults to exercise)', async () => {
		await enqueueAttempt(
			'campimetry',
			{ sessionId: 's1', results: { results: [], meta: [] } },
			'test'
		);
		await enqueueAttempt('rhythm', { sessionId: 's2', results: { results: [], meta: {} } });

		const pending = await getPendingAttempts();
		expect(pending).toHaveLength(2);
		expect(pending[0].kind).toBe('test');
		expect(pending[1].kind).toBe('exercise');
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

	test('filters by slug and kind together', async () => {
		mockStore.set('offline-attempt-queue', [
			makeQueueElement({ id: 'a', slug: 'campimetry', kind: 'test' }),
			makeQueueElement({ id: 'b', slug: 'campimetry', kind: 'exercise' }),
			makeQueueElement({ id: 'c', slug: 'rhythm', kind: 'test' })
		]);

		const testsOnly = await getPendingAttempts('campimetry', 'test');
		expect(testsOnly.map((el) => el.id)).toEqual(['a']);

		const exercisesOnly = await getPendingAttempts('campimetry', 'exercise');
		expect(exercisesOnly.map((el) => el.id)).toEqual(['b']);

		// Old elements without kind fall back to 'exercise' semantics
		mockStore.set('offline-attempt-queue', [
			makeQueueElement({ id: 'legacy', slug: 'rhythm' })
		]);
		expect(await getPendingAttempts('rhythm', 'exercise')).toHaveLength(1);
		expect(await getPendingAttempts('rhythm', 'test')).toEqual([]);
	});

	test('returns empty array when store is empty', async () => {
		const pending = await getPendingAttempts('rhythm');
		expect(pending).toEqual([]);
	});

	test('returns empty array in SSR (window undefined)', async () => {
		delete (globalThis as any).window;
		mockStore.set('offline-attempt-queue', [makeQueueElement({ id: 'a', slug: 'rhythm' })]);
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
			makeQueueElement({
				id: 'a',
				slug: 'rhythm',
				payload: { sessionId: 'sid-a', results: { results: [], meta: {} } }
			}),
			makeQueueElement({
				id: 'b',
				slug: 'rhythm',
				payload: { sessionId: 'sid-b', results: { results: [], meta: {} } }
			})
		]);

		fetchMock
			.mockResolvedValueOnce({ ok: true, json: async () => ({ sessionId: 'sid-a' }) })
			.mockResolvedValueOnce({ ok: true, json: async () => ({ sessionId: 'sid-b' }) });

		const summary = await flushQueue();
		expect(summary.flushed).toBe(2);
		expect(summary.remaining).toBe(0);
		expect(summary.skipped).toBe(0);

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(fetchMock.mock.calls[0][0]).toBe('/exercises/rhythm/playground');
		expect(fetchMock.mock.calls[1][0]).toBe('/exercises/rhythm/playground');

		const remaining = (mockStore.get('offline-attempt-queue') as QueueElement[]) ?? [];
		expect(remaining).toHaveLength(0);
	});

	test('routes test-kind elements to /tests and exercise-kind to /exercises', async () => {
		mockStore.set('offline-attempt-queue', [
			makeQueueElement({
				id: 'a',
				slug: 'campimetry',
				kind: 'test',
				payload: { sessionId: 'sid-a', results: { results: [], meta: [] } }
			}),
			makeQueueElement({
				id: 'b',
				slug: 'rhythm',
				kind: 'exercise',
				payload: { sessionId: 'sid-b', results: { results: [], meta: {} } }
			}),
			// Old element without kind → exercise endpoint (backward compat)
			makeQueueElement({
				id: 'c',
				slug: 'flanker',
				payload: { sessionId: 'sid-c', results: { results: [], meta: {} } }
			})
		]);

		fetchMock
			.mockResolvedValueOnce({ ok: true, json: async () => ({ sessionId: 'sid-a' }) })
			.mockResolvedValueOnce({ ok: true, json: async () => ({ sessionId: 'sid-b' }) })
			.mockResolvedValueOnce({ ok: true, json: async () => ({ sessionId: 'sid-c' }) });

		const summary = await flushQueue();
		expect(summary.flushed).toBe(3);
		expect(summary.remaining).toBe(0);

		expect(fetchMock).toHaveBeenCalledTimes(3);
		expect(fetchMock.mock.calls[0][0]).toBe('/tests/campimetry/playground');
		expect(fetchMock.mock.calls[1][0]).toBe('/exercises/rhythm/playground');
		expect(fetchMock.mock.calls[2][0]).toBe('/exercises/flanker/playground');
	});

	test('409 response skips the element and keeps flushing the rest', async () => {
		mockStore.set('offline-attempt-queue', [
			makeQueueElement({
				id: 'a',
				slug: 'rhythm',
				payload: { sessionId: 'sid-a', results: { results: [], meta: {} } }
			}),
			makeQueueElement({
				id: 'b',
				slug: 'rhythm',
				payload: { sessionId: 'sid-b', results: { results: [], meta: {} } }
			})
		]);

		fetchMock
			.mockResolvedValueOnce({ ok: false, status: 409 })
			.mockResolvedValueOnce({ ok: true, json: async () => ({ sessionId: 'sid-b' }) });

		const summary = await flushQueue();
		expect(summary.flushed).toBe(1);
		expect(summary.skipped).toBe(1);
		expect(summary.remaining).toBe(0);

		expect(fetchMock).toHaveBeenCalledTimes(2);

		const remaining = (mockStore.get('offline-attempt-queue') as QueueElement[]) ?? [];
		expect(remaining).toHaveLength(0);
	});

	test('stops flushing on first error (fetch rejects) and leaves remaining', async () => {
		mockStore.set('offline-attempt-queue', [
			makeQueueElement({
				id: 'a',
				slug: 'rhythm',
				payload: { sessionId: 'sid-a', results: { results: [], meta: {} } }
			}),
			makeQueueElement({
				id: 'b',
				slug: 'rhythm',
				payload: { sessionId: 'sid-b', results: { results: [], meta: {} } }
			})
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

	test('non-ok response (500) breaks the flush and leaves element in queue', async () => {
		mockStore.set('offline-attempt-queue', [
			makeQueueElement({
				id: 'a',
				slug: 'rhythm',
				payload: { sessionId: 'sid-a', results: { results: [], meta: {} } }
			}),
			makeQueueElement({
				id: 'b',
				slug: 'rhythm',
				payload: { sessionId: 'sid-b', results: { results: [], meta: {} } }
			})
		]);

		fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });

		const summary = await flushQueue();
		expect(summary.flushed).toBe(0);
		expect(summary.remaining).toBe(2);

		expect(fetchMock).toHaveBeenCalledTimes(1);

		const remaining = (mockStore.get('offline-attempt-queue') as QueueElement[]) ?? [];
		expect(remaining.map((el) => el.id)).toEqual(['a', 'b']);
	});

	test('foreign sessionId in response leaves element in queue (M1 guard)', async () => {
		mockStore.set('offline-attempt-queue', [
			makeQueueElement({
				id: 'a',
				slug: 'rhythm',
				payload: { sessionId: 'sid-a', results: { results: [], meta: {} } }
			})
		]);

		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ sessionId: 'different-id' })
		});

		const summary = await flushQueue();
		expect(summary.flushed).toBe(0);
		expect(summary.remaining).toBe(1);

		const remaining = (mockStore.get('offline-attempt-queue') as QueueElement[]) ?? [];
		expect(remaining).toHaveLength(1);
	});

	test('401 response leaves element in queue to retry later', async () => {
		mockStore.set('offline-attempt-queue', [
			makeQueueElement({
				id: 'a',
				slug: 'rhythm',
				payload: { sessionId: 'sid-a', results: { results: [], meta: {} } }
			})
		]);

		fetchMock.mockResolvedValueOnce({ ok: false, status: 401 });

		const summary = await flushQueue();
		expect(summary.flushed).toBe(0);
		expect(summary.remaining).toBe(1);

		const remaining = (mockStore.get('offline-attempt-queue') as QueueElement[]) ?? [];
		expect(remaining).toHaveLength(1);
	});

	test('element enqueued concurrently during a flush survives the write-back (loss-race guard)', async () => {
		mockStore.set('offline-attempt-queue', [
			makeQueueElement({
				id: 'a',
				slug: 'rhythm',
				payload: { sessionId: 'sid-a', results: { results: [], meta: {} } }
			})
		]);

		// Controllable fetch: keeps the flush in flight while we enqueue.
		let resolveFetch!: (value: unknown) => void;
		const fetchStarted = new Promise<void>((resolveStarted) => {
			fetchMock.mockImplementationOnce(() => {
				resolveStarted();
				return new Promise((resolve) => {
					resolveFetch = resolve;
				});
			});
		});

		const flushPromise = flushQueue();
		await fetchStarted; // flush is now parked inside its pending fetch

		// While the flush's fetch is in flight, a concurrent enqueueAttempt
		// appends a new element to the persisted queue.
		await enqueueAttempt('campimetry', {
			sessionId: 'sid-new',
			results: { results: [], meta: [] }
		});

		resolveFetch({ ok: true, json: async () => ({ sessionId: 'sid-a' }) });

		const summary = await flushPromise;
		expect(summary.flushed).toBe(1);
		expect(summary.remaining).toBe(1);
		expect(summary.skipped).toBe(0);

		const remaining = (mockStore.get('offline-attempt-queue') as QueueElement[]) ?? [];
		expect(remaining.map((el) => el.payload.sessionId)).toEqual(['sid-new']);
	});
});

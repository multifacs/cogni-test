import { describe, it, expect } from 'vitest';
import { mergeSessions } from '$lib/exercises';
import type { QueueElement } from '$lib/client/offline-queue';

describe('mergeSessions', () => {
	it('returns server sessions sorted by createdAt desc', () => {
		const server = [
			{ sessionId: 's1', createdAt: '2024-01-01T10:00:00Z', attempts: [] },
			{ sessionId: 's2', createdAt: '2024-01-02T10:00:00Z', attempts: [] }
		];
		const result = mergeSessions(server, []);
		expect(result.map((r) => r.sessionId)).toEqual(['s2', 's1']);
	});

	it('appends pending sessions and sorts combined list', () => {
		const server = [
			{ sessionId: 's1', createdAt: '2024-01-01T10:00:00Z', attempts: [] }
		];
		const pending: QueueElement[] = [
			{
				id: 'q1',
				slug: 'rhythm',
				payload: {
					sessionId: 'p1',
					results: { results: [{ attempt: 1, note: 2 }], meta: { difficulty: 'easy' } }
				},
				enqueuedAt: 1_704_834_000_000 // newer than s1
			}
		];
		const result = mergeSessions(server, pending);
		expect(result.map((r) => r.sessionId)).toEqual(['p1', 's1']);
		expect(result[0].pending).toBe(true);
		expect(result[0].meta).toEqual({ difficulty: 'easy' });
	});

	it('deduplicates: server session wins over pending with same sessionId', () => {
		const server = [{ sessionId: 's1', createdAt: '2024-01-01T10:00:00Z', attempts: [] }];
		const pending: QueueElement[] = [
			{
				id: 'q2',
				slug: 'rhythm',
				payload: {
					sessionId: 's1',
					results: { results: [], meta: { difficulty: 'hard' } }
				},
				enqueuedAt: 1_704_000_000_000
			}
		];
		const result = mergeSessions(server, pending);
		expect(result).toHaveLength(1);
		expect(result[0].pending).toBeUndefined();
	});

	it('handles empty inputs', () => {
		expect(mergeSessions([], [])).toEqual([]);
	});

	it('correctly maps pending attempts array and meta', () => {
		const pending: QueueElement[] = [
			{
				id: 'q3',
				slug: 'rhythm',
				payload: {
					sessionId: 'p1',
					results: {
						results: [{ attempt: 100, note: 90 }],
						meta: { difficulty: 'medium', overpress: '2' }
					}
				},
				enqueuedAt: 1_704_000_000_000
			}
		];
		const result = mergeSessions([], pending);
		expect(result[0].attempts).toEqual([{ attempt: 100, note: 90 }]);
		expect(result[0].meta).toEqual({ difficulty: 'medium', overpress: '2' });
	});
});

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getSessionList } from '$lib/server/db/controllers/result';
import type { PageServerLoad } from './$types';

const makeCookies = (userId?: string) => ({
	get: (name: string) => (name === 'user_id' ? userId : undefined)
});

// First test pays a heavy one-time transitive import of the DB
// stack (~2.2s isolated, >5s under full-suite parallel contention).
vi.setConfig({ testTimeout: 20_000 });

type LoadEvent = Parameters<PageServerLoad>[0];

const makeEvent = (slug: string, userId?: string): LoadEvent =>
	({
		params: { slug },
		cookies: makeCookies(userId)
	}) as LoadEvent;

// ─── Mock setup ────────────────────────────────────────────────────────

vi.mock('$lib/server/db/controllers/result', () => ({
	getSessionList: vi.fn()
}));

vi.mock('@sveltejs/kit', async () => {
	const actual = await vi.importActual('@sveltejs/kit');
	return {
		...actual,
		error: vi.fn((status: number, message: string) => {
			throw { status, message };
		})
	};
});

// ─── Tests ─────────────────────────────────────────────────────────────

describe('exercise playground load', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns difficultyCounts for rhythm', async () => {
		vi.mocked(getSessionList).mockResolvedValue([
			{ id: 's1', meta: JSON.stringify({ difficulty: 'easy', overpress: '0' }), createdAt: '2024-01-01' },
			{ id: 's2', meta: JSON.stringify({ difficulty: 'easy', overpress: '1' }), createdAt: '2024-01-02' },
			{ id: 's3', meta: JSON.stringify({ difficulty: 'medium', overpress: '-1' }), createdAt: '2024-01-03' }
		]);

		const { load } = await import('./+page.server');
		const result = await load(makeEvent('rhythm', 'user-1'));

		expect(result).toHaveProperty('difficultyCounts');
		expect((result as Record<string, unknown>).difficultyCounts).toEqual({ easy: 2, medium: 1, hard: 0 });
	});

	it('returns zero counts for rhythm when user is not logged in', async () => {
		vi.mocked(getSessionList).mockResolvedValue([]);

		const { load } = await import('./+page.server');
		const result = await load(makeEvent('rhythm'));

		expect(result).toHaveProperty('difficultyCounts');
		expect((result as Record<string, unknown>).difficultyCounts).toEqual({ easy: 0, medium: 0, hard: 0 });
		expect(getSessionList).not.toHaveBeenCalled();
	});

	it('does NOT return difficultyCounts for non-rhythm exercises', async () => {
		const { load } = await import('./+page.server');
		const result = await load(makeEvent('flanker', 'user-1'));

		expect(result?.difficultyCounts).toBeUndefined();
	});

	it('ignores sessions with missing or malformed meta', async () => {
		vi.mocked(getSessionList).mockResolvedValue([
			{ id: 's1', meta: JSON.stringify({ difficulty: 'hard' }), createdAt: '2024-01-01' },
			{ id: 's2', meta: null, createdAt: '2024-01-02' },
			{ id: 's3', meta: 'not-json', createdAt: '2024-01-03' },
			{ id: 's4', meta: JSON.stringify({ overpress: '2' }), createdAt: '2024-01-04' }
		]);

		const { load } = await import('./+page.server');
		const result = await load(makeEvent('rhythm', 'user-1'));

		expect((result as Record<string, unknown>).difficultyCounts).toEqual({ easy: 0, medium: 0, hard: 1 });
	});
});

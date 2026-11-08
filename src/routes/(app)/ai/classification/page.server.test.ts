import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getClassificationState } from '$lib/server/db/controllers/classification';
import type { PageServerLoad } from './$types';

// ─── Mock setup ────────────────────────────────────────────────────────

vi.mock('$lib/server/db/controllers/classification', () => ({
	getClassificationState: vi.fn()
}));

vi.mock('@sveltejs/kit', async () => {
	const actual = await vi.importActual('@sveltejs/kit');
	return {
		...actual,
		redirect: vi.fn((status: number, location: string) => {
			throw { status, location };
		})
	};
});

// ─── Helpers ───────────────────────────────────────────────────────────

type LoadEvent = Parameters<PageServerLoad>[0];

const makeEvent = (userId?: string): LoadEvent =>
	({
		cookies: {
			get: (name: string) => (name === 'user_id' ? userId : undefined)
		}
	}) as LoadEvent;

type RedirectLike = { status: number; location: string };

async function loadPage(event: LoadEvent) {
	const { load } = await import('./+page.server');
	return load(event);
}

// ─── Tests ─────────────────────────────────────────────────────────────

describe('/ai/classification page server load', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('нет cookie user_id → redirect 307 /', async () => {
		await expect(loadPage(makeEvent(undefined))).rejects.toMatchObject({
			status: 307,
			location: '/'
		});
	});

	it('getClassificationState → retelling → {stage: "retelling", sessionId}', async () => {
		vi.mocked(getClassificationState).mockResolvedValue({
			stage: 'retelling',
			sessionId: '42'
		});

		const result = (await loadPage(makeEvent('user-1'))) as {
			stage: string;
			sessionId: string | null;
		};

		expect(getClassificationState).toHaveBeenCalledWith('user-1');
		expect(result).toEqual({ stage: 'retelling', sessionId: '42' });
	});

	it('getClassificationState → words → {stage: "words", sessionId: null}', async () => {
		vi.mocked(getClassificationState).mockResolvedValue({ stage: 'words' });

		const result = (await loadPage(makeEvent('user-1'))) as {
			stage: string;
			sessionId: string | null;
		};

		expect(result).toEqual({ stage: 'words', sessionId: null });
	});
});

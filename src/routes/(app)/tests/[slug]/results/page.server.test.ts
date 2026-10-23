import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getResults } from '$lib/server/db/controllers/result.js';
import { getTestSessionCounts } from '$lib/server/db/controllers/test.js';
import type { PageServerLoad } from './$types';

const makeCookies = (opts: { userId?: string; aiFlow?: string; aiFlowDone?: string } = {}) => {
	const store: Record<string, string> = {};
	if (opts.userId) store['user_id'] = opts.userId;
	if (opts.aiFlow) store['ai_flow'] = opts.aiFlow;
	if (opts.aiFlowDone) store['ai_flow_done'] = opts.aiFlowDone;
	return {
		get: (name: string) => store[name],
		set: vi.fn()
	};
};

type LoadEvent = Parameters<PageServerLoad>[0];

const makeEvent = (opts: { userId?: string; aiFlow?: string; aiFlowDone?: string } = {}): LoadEvent =>
	({
		params: { slug: 'stroop' },
		cookies: makeCookies(opts)
	}) as unknown as LoadEvent;

type RedirectLike = { status: number; location: string };

function asRedirect(e: unknown): RedirectLike {
	return e as RedirectLike;
}

const allSessionsDone = () =>
	vi.mocked(getTestSessionCounts).mockResolvedValue({
		stroop: 1,
		math: 1,
		munsterberg: 1,
		campimetry: 1,
		memory: 1,
		swallow: 1
	});

// ─── Mock setup ────────────────────────────────────────────────────────

vi.mock('$lib/server/db/controllers/result', () => ({
	getResults: vi.fn()
}));

vi.mock('$lib/server/db/controllers/test', () => ({
	getTestSessionCounts: vi.fn()
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

// ─── Tests ─────────────────────────────────────────────────────────────

describe('(app) tests/[slug]/results load — ai_flow redirect', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getResults).mockResolvedValue([] as never);
	});

	it('redirects to /ai when ai_flow cookie set and all 6 tests done', async () => {
		const { load } = await import('./+page.server');
		allSessionsDone();

		try {
			await load(makeEvent({ userId: 'user-1', aiFlow: '1' }));
			expect.fail('Expected redirect');
		} catch (e) {
			const redirect = asRedirect(e);
			expect(redirect.status).toBe(307);
			expect(redirect.location).toBe('/ai');
		}
	});

	it('does NOT redirect when one-time ai_flow_done flag is already set', async () => {
		const { load } = await import('./+page.server');
		allSessionsDone();

		const event = makeEvent({ userId: 'user-1', aiFlow: '1', aiFlowDone: '1' });
		const result = await load(event);
		expect(result).toBeDefined();
		expect(getResults).toHaveBeenCalledWith('stroop', 'user-1');
	});

	it('does NOT redirect when ai_flow cookie is absent', async () => {
		const { load } = await import('./+page.server');
		allSessionsDone();

		const result = await load(makeEvent({ userId: 'user-1' }));
		expect(result).toBeDefined();
		expect(getResults).toHaveBeenCalledWith('stroop', 'user-1');
	});
});

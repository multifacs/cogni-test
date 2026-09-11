import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getUserById } from '$lib/server/db';
import { getProfileSurvey } from '$lib/server/db/controllers/survey';
import { getTestSessionCounts } from '$lib/server/db/controllers/test';
import { env } from '$env/dynamic/private';
import type { LayoutServerData, LayoutServerLoad } from './$types';

const makeCookies = (opts: { userId?: string; loggedInAdmin?: string } = {}) => ({
	get: (name: string) => {
		if (name === 'user_id') return opts.userId;
		if (name === 'logged_in_admin') return opts.loggedInAdmin;
		return undefined;
	}
});

type LoadEvent = Parameters<LayoutServerLoad>[0];

const makeEvent = (
	pathname: string,
	opts: { userId?: string; loggedInAdmin?: string } = {}
): LoadEvent =>
	({
		cookies: makeCookies(opts),
		url: { pathname } as URL
	}) as LoadEvent;

type RedirectLike = { status: number; location: string };

function asRedirect(e: unknown): RedirectLike {
	return e as RedirectLike;
}

// ─── Mock setup ────────────────────────────────────────────────────────

vi.mock('$lib/server/db', () => ({
	getUserById: vi.fn()
}));

vi.mock('$lib/server/db/controllers/survey', () => ({
	getProfileSurvey: vi.fn()
}));

vi.mock('$lib/server/db/controllers/test', () => ({
	getTestSessionCounts: vi.fn()
}));

vi.mock('$env/dynamic/private', () => ({
	env: { MODE: 'PROD' }
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

describe('(app) layout server load', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getUserById).mockResolvedValue({
			id: 'user-1',
			firstname: 'Test',
			lastname: 'User',
			birthday: new Date(1990, 0, 1),
			sex: 'male'
		});
		vi.mocked(getProfileSurvey).mockResolvedValue(null);
	});

	it('does NOT redirect undiagnosed user to / when accessing /gto', async () => {
		const { load } = await import('./+layout.server');

		// no test sessions = unfinished tests
		vi.mocked(getTestSessionCounts).mockResolvedValue({});

		const result = (await load(makeEvent('/gto', { userId: 'user-1' }))) as LayoutServerData;
		expect(result).toBeDefined();
		expect(result.undiagnosed).toBe(true);
		expect(result.allowedPaths).toContain('/gto');
	});

	it('redirects undiagnosed user to / when accessing a non-allowed path like /metrics', async () => {
		const { load } = await import('./+layout.server');

		vi.mocked(getTestSessionCounts).mockResolvedValue({});

		try {
			await load(makeEvent('/metrics', { userId: 'user-1' }));
			expect.fail('Expected redirect');
		} catch (e) {
			const redirect = asRedirect(e);
			expect(redirect.status).toBe(307);
			expect(redirect.location).toBe('/');
		}
	});

	it('does NOT redirect when logged_in_admin cookie is present even with unfinished tests', async () => {
		const { load } = await import('./+layout.server');

		vi.mocked(getTestSessionCounts).mockResolvedValue({});

		const result = (await load(
			makeEvent('/metrics', { userId: 'user-1', loggedInAdmin: 'true' })
		)) as LayoutServerData;
		expect(result).toBeDefined();
		expect(result.undiagnosed).toBe(false);
	});

	it('does NOT redirect diagnosed user even on a non-allowed path', async () => {
		const { load } = await import('./+layout.server');

		// All 6 visible tests have sessions
		vi.mocked(getTestSessionCounts).mockResolvedValue({
			stroop: 1,
			math: 1,
			munsterberg: 1,
			campimetry: 1,
			memory: 1,
			swallow: 1
		});

		const result = (await load(
			makeEvent('/metrics', { userId: 'user-1' })
		)) as LayoutServerData;
		expect(result).toBeDefined();
		expect(result.undiagnosed).toBe(false);
	});

	describe('isDevMode', () => {
		const allSessionsDone = () =>
			vi.mocked(getTestSessionCounts).mockResolvedValue({
				stroop: 1,
				math: 1,
				munsterberg: 1,
				campimetry: 1,
				memory: 1,
				swallow: 1
			});

		it('is true when MODE is DEV', async () => {
			const { load } = await import('./+layout.server');
			allSessionsDone();

			const prev = env.MODE;
			env.MODE = 'DEV';
			try {
				const result = (await load(
					makeEvent('/metrics', { userId: 'user-1' })
				)) as LayoutServerData;
				expect(result.isDevMode).toBe(true);
			} finally {
				env.MODE = prev;
			}
		});

		it('is false when MODE is PROD', async () => {
			const { load } = await import('./+layout.server');
			allSessionsDone();

			const prev = env.MODE;
			env.MODE = 'PROD';
			try {
				const result = (await load(
					makeEvent('/metrics', { userId: 'user-1' })
				)) as LayoutServerData;
				expect(result.isDevMode).toBe(false);
			} finally {
				env.MODE = prev;
			}
		});

		it('is false when MODE is undefined (stale/absent env)', async () => {
			const { load } = await import('./+layout.server');
			allSessionsDone();

			const prev = env.MODE;
			(env as { MODE?: string }).MODE = undefined;
			try {
				const result = (await load(
					makeEvent('/metrics', { userId: 'user-1' })
				)) as LayoutServerData;
				expect(result.isDevMode).toBe(false);
			} finally {
				env.MODE = prev;
			}
		});
	});
});

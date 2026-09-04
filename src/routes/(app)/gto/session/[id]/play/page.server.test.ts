import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GTO_TEST_ORDER } from '$lib/tests';

import type { Cookies } from '@sveltejs/kit';

// один раз, рядом с моками:
const makeCookies = (userId?: string): Pick<Cookies, 'get'> => ({
	get: (name: string) => (name === 'user_id' && userId ? userId : undefined)
});

type RedirectLike = { status: number; location: string };

function asRedirect(e: unknown): RedirectLike {
	return e as RedirectLike;
}

// ─── Mock setup ────────────────────────────────────────────────────────

const mockSessionDetail = {
	id: 'sess-1',
	name: 'Test Session',
	status: 'active',
	participants: [
		{
			userId: 'user-1',
			firstname: 'Test',
			lastname: 'User',
			currentTestIndex: 0,
			hasCompletedTests: false,
			hasSubmittedWords: false
		}
	]
};

vi.mock('$lib/server/db/controllers/gto', () => ({
	getGtoSessionById: vi.fn().mockResolvedValue(mockSessionDetail)
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

describe('GTO play page server', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset participant state
		mockSessionDetail.participants[0].currentTestIndex = 0;
		mockSessionDetail.participants[0].hasCompletedTests = false;
		mockSessionDetail.participants[0].hasSubmittedWords = false;
	});

	it('redirects to the first test about page with gtoSessionId', async () => {
		const { load } = await import('./+page.server');

		mockSessionDetail.participants[0].currentTestIndex = 0;

		try {
			await load({
				params: { id: 'sess-1' },
				cookies: makeCookies('user-1')
			});
		} catch (e) {
			const redirect = asRedirect(e);
			expect(redirect.status).toBe(307);
			expect(redirect.location).toBe(`${GTO_TEST_ORDER[0].route}/about?gtoSessionId=sess-1`);
		}
	});

	it('redirects to the correct test based on currentTestIndex', async () => {
		const { load } = await import('./+page.server');

		const mathIndex = GTO_TEST_ORDER.findIndex((e) => e.type === 'math');
		mockSessionDetail.participants[0].currentTestIndex = mathIndex;

		try {
			await load({
				params: { id: 'sess-1' },
				cookies: { get: (name: string) => (name === 'user_id' ? 'user-1' : undefined) }
			});
		} catch (e) {
			const redirect = asRedirect(e);
			expect(redirect.status).toBe(307);
			expect(redirect.location).toBe(`${GTO_TEST_ORDER[0].route}/about?gtoSessionId=sess-1`);
		}
	});

	it('redirects to raven-matrices exercise about page for ravenMatrices test type', async () => {
		const { load } = await import('./+page.server');

		const ravenIndex = GTO_TEST_ORDER.findIndex((e) => e.type === 'ravenMatrices');
		mockSessionDetail.participants[0].currentTestIndex = ravenIndex;

		try {
			await load({
				params: { id: 'sess-1' },
				cookies: { get: (name: string) => (name === 'user_id' ? 'user-1' : undefined) }
			});
		} catch (e) {
			const redirect = asRedirect(e);
			expect(redirect.status).toBe(307);
			expect(redirect.location).toBe(`${GTO_TEST_ORDER[0].route}/about?gtoSessionId=sess-1`);
		}
	});

	it('redirects to words page when tests are completed', async () => {
		const { load } = await import('./+page.server');

		mockSessionDetail.participants[0].hasCompletedTests = true;
		mockSessionDetail.participants[0].hasSubmittedWords = false;

		try {
			await load({
				params: { id: 'sess-1' },
				cookies: { get: (name: string) => (name === 'user_id' ? 'user-1' : undefined) }
			});
		} catch (e) {
			expect(e.status).toBe(307);
			expect(e.location).toBe('/gto/session/sess-1/words');
		}
	});
});

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GTO_TEST_ORDER } from '$lib/tests';

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

	it('redirects to the first test playground with gtoSessionId', async () => {
		const { load } = await import('./+page.server');

		mockSessionDetail.participants[0].currentTestIndex = 0;

		try {
			await load({
				params: { id: 'sess-1' },
				cookies: { get: (name: string) => (name === 'user_id' ? 'user-1' : undefined) }
			} as any);
		} catch (e: any) {
			expect(e.status).toBe(307);
			expect(e.location).toBe(`${GTO_TEST_ORDER[0].route}/playground?gtoSessionId=sess-1`);
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
			} as any);
		} catch (e: any) {
			expect(e.status).toBe(307);
			expect(e.location).toBe(
				`${GTO_TEST_ORDER[mathIndex].route}/playground?gtoSessionId=sess-1`
			);
		}
	});

	it('redirects to raven-matrices exercise route for ravenMatrices test type', async () => {
		const { load } = await import('./+page.server');

		const ravenIndex = GTO_TEST_ORDER.findIndex((e) => e.type === 'ravenMatrices');
		mockSessionDetail.participants[0].currentTestIndex = ravenIndex;

		try {
			await load({
				params: { id: 'sess-1' },
				cookies: { get: (name: string) => (name === 'user_id' ? 'user-1' : undefined) }
			} as any);
		} catch (e: any) {
			expect(e.status).toBe(307);
			expect(e.location).toBe(`/exercises/raven-matrices/playground?gtoSessionId=sess-1`);
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
			} as any);
		} catch (e: any) {
			expect(e.status).toBe(307);
			expect(e.location).toBe('/gto/session/sess-1/words');
		}
	});
});

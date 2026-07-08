import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TEST_ORDER } from '$lib/tests';

// ─── Mock setup ────────────────────────────────────────────────────────

const mockSessionDetail = {
	id: 'sess-1',
	name: 'Test Session',
	type: 'standard',
	status: 'active',
	createdAt: new Date().toISOString(),
	participants: [
		{
			id: 'part-1',
			userId: 'user-1',
			firstname: 'Test',
			lastname: 'User',
			birthday: new Date('2000-01-01'),
			sex: 'male' as const,
			hasCompletedTests: false,
			hasSubmittedWords: false,
			currentTestIndex: 0,
			wordScore: null,
			submittedWords: null,
			wordSetId: null,
			editableMetrics: {
				id: 'metric-1',
				balanceTest: null,
				mazeQ1: null,
				mazeQ2: null,
				mazeQ3: null,
				mazeVRNumber: null,
				mazeVRFileName: null,
				buttonTestNumber: null,
				buttonTestFileName: null,
				logic: null,
				wordSetNumber: null
			}
		}
	]
};

vi.mock('$lib/server/db/controllers/gto', () => ({
	getGtoSessionById: vi.fn(() => Promise.resolve(mockSessionDetail))
}));

// Mock fetch that returns Russian word data
const mockWordsText = 'яблоко\nмолоко\nдеревня\nложка\nистина\nTRUE\ntrue\n';

// We import the load function directly from the module
// SvelteKit page.server.ts exports `load` as a named export
const { load } = await import('./+page.server.ts');

function makeEvent(params: { id: string }, cookies: Record<string, string | undefined>) {
	const mockFetch = vi.fn(async (url: string) => {
		if (url === '/words') {
			return new Response(mockWordsText, { status: 200 });
		}
		return new Response('not found', { status: 404 });
	});

	return {
		params,
		cookies: {
			get: (name: string) => cookies[name]
		},
		fetch: mockFetch,
		url: new URL(`http://localhost/gto/session/${params.id}/play`)
	} as any;
}

describe('GTO play page server load', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSessionDetail.participants[0].currentTestIndex = 0;
		mockSessionDetail.participants[0].hasCompletedTests = false;
		mockSessionDetail.participants[0].hasSubmittedWords = false;
		mockSessionDetail.status = 'active';
	});

	it('loads words when currentTestIndex points to munsterberg', async () => {
		const munsterbergIndex = TEST_ORDER.indexOf('munsterberg');
		expect(munsterbergIndex).toBeGreaterThanOrEqual(0);

		mockSessionDetail.participants[0].currentTestIndex = munsterbergIndex;

		const result = await load(makeEvent({ id: 'sess-1' }, { user_id: 'user-1' }));

		expect(result.currentTestType).toBe('munsterberg');
		expect(result.words).toBeDefined();
		expect(result.words!.length).toBeGreaterThan(0);
		// Should filter out 'TRUE' and words > 9 chars
		expect(result.words!.every((w: string) => w.length <= 9)).toBe(true);
		expect(result.words!.includes('TRUE')).toBe(false);
		expect(result.words!.includes('true')).toBe(false);
	});

	it('loads words when currentTestIndex points to memory', async () => {
		const memoryIndex = TEST_ORDER.indexOf('memory');
		expect(memoryIndex).toBeGreaterThanOrEqual(0);

		mockSessionDetail.participants[0].currentTestIndex = memoryIndex;

		const result = await load(makeEvent({ id: 'sess-1' }, { user_id: 'user-1' }));

		expect(result.currentTestType).toBe('memory');
		expect(result.words).toBeDefined();
		expect(result.words!.length).toBeGreaterThan(0);
	});

	it('loads silhouettes when currentTestIndex points to campimetry', async () => {
		const campimetryIndex = TEST_ORDER.indexOf('campimetry');
		expect(campimetryIndex).toBeGreaterThanOrEqual(0);

		mockSessionDetail.participants[0].currentTestIndex = campimetryIndex;

		const result = await load(makeEvent({ id: 'sess-1' }, { user_id: 'user-1' }));

		expect(result.currentTestType).toBe('campimetry');
		expect(result.silhouettes).toBeDefined();
		expect(Object.keys(result.silhouettes!)).toContain('bird');
		expect(Object.keys(result.silhouettes!)).toContain('cat');
	});

	it('does not load words or silhouettes for stroop test', async () => {
		const stroopIndex = TEST_ORDER.indexOf('stroop');
		expect(stroopIndex).toBeGreaterThanOrEqual(0);

		mockSessionDetail.participants[0].currentTestIndex = stroopIndex;

		const result = await load(makeEvent({ id: 'sess-1' }, { user_id: 'user-1' }));

		expect(result.currentTestType).toBe('stroop');
		expect(result.words).toBeUndefined();
		expect(result.silhouettes).toBeUndefined();
	});

	it('provides different server data when currentTestIndex changes between tests', async () => {
		// This test verifies the server load function returns correct data
		// for each test type when called with different currentTestIndex values.
		// The real bug is that the client never re-invokes this load function
		// after advancing to the next test — but the server side is correct.

		const stroopIndex = TEST_ORDER.indexOf('stroop');
		const munsterbergIndex = TEST_ORDER.indexOf('munsterberg');

		// First: stroop — no words
		mockSessionDetail.participants[0].currentTestIndex = stroopIndex;
		const result1 = await load(makeEvent({ id: 'sess-1' }, { user_id: 'user-1' }));
		expect(result1.words).toBeUndefined();

		// Advance to munsterberg (simulate what should happen after invalidation)
		mockSessionDetail.participants[0].currentTestIndex = munsterbergIndex;
		const result2 = await load(makeEvent({ id: 'sess-1' }, { user_id: 'user-1' }));
		expect(result2.words).toBeDefined();
		expect(result2.words!.length).toBeGreaterThan(0);
		expect(result2.currentTestType).toBe('munsterberg');
	});
});

/**
 * Route-level unit test for the results +page.server load function.
 *
 * Pattern: direct load import + dependency mocking (same approach as
 * playground/server.test.ts): we invoke the exported load directly
 * with a minimal mocked PageServerLoad event.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PageServerLoad } from './$types';

vi.mock('$lib/server/db/controllers/result', () => ({
	getResults: vi.fn()
}));

import { getResults } from '$lib/server/db/controllers/result';

const makeEvent = (slug: string, userId?: string): Parameters<PageServerLoad>[0] =>
	({
		params: { slug },
		cookies: {
			get: (name: string) => (name === 'user_id' ? userId : undefined)
		}
	}) as Parameters<PageServerLoad>[0];

describe('results +page.server load', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('origami slug maps to origamiExercise and fetches its results', async () => {
		vi.mocked(getResults).mockResolvedValue([]);

		const { load } = await import('./+page.server');
		await load(makeEvent('origami', 'user-1'));

		expect(getResults).toHaveBeenCalledWith('origamiExercise', 'user-1');
	});
});

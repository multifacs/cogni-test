/**
 * Route-level unit test for the tests playground POST handler.
 *
 * Pattern: direct handler import + dependency mocking (same approach as the
 * exercises playground server.test.ts — no request-fetch infra exists for
 * +server.ts routes, so we invoke the exported POST directly with a
 * minimal mocked RequestEvent).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

vi.mock('$env/dynamic/private', () => ({
	env: { MODE: 'DEV' }
}));

vi.mock('$lib/server/db/controllers/result', () => ({
	postResult: vi.fn()
}));

import { postResult } from '$lib/server/db/controllers/result';

const makeCookies = (userId?: string) => ({
	get: (name: string) => (name === 'user_id' ? userId : undefined)
});

type ReqEvent = Parameters<RequestHandler>[0];

const makeEvent = (opts: { slug: string; body: unknown; userId?: string }): ReqEvent =>
	({
		params: { slug: opts.slug },
		request: new Request('http://localhost/tests/stroop/playground', {
			method: 'POST',
			body: JSON.stringify(opts.body),
			headers: { 'content-type': 'application/json' }
		}),
		cookies: makeCookies(opts.userId)
	}) as ReqEvent;

describe('tests playground POST route', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('action: generate-random', () => {
		it('without user_id cookie → 401', async () => {
			const { POST } = await import('./+server');
			const res = await POST(
				makeEvent({ slug: 'stroop', body: { action: 'generate-random' } })
			);

			expect(res.status).toBe(401);
			const body = await res.json();
			expect(body).toEqual({ error: 'Unauthorized' });
			expect(postResult).not.toHaveBeenCalled();
		});

		it('unknown slug → 404', async () => {
			const { POST } = await import('./+server');
			const res = await POST(
				makeEvent({ slug: 'bogus', body: { action: 'generate-random' }, userId: 'user-1' })
			);

			expect(res.status).toBe(404);
			const body = await res.json();
			expect(body).toEqual({ error: 'test not found' });
			expect(postResult).not.toHaveBeenCalled();
		});

		it('MODE is not DEV → 403', async () => {
			const previous = env.MODE;
			env.MODE = 'PROD';
			try {
				const { POST } = await import('./+server');
				const res = await POST(
					makeEvent({
						slug: 'stroop',
						body: { action: 'generate-random' },
						userId: 'user-1'
					})
				);

				expect(res.status).toBe(403);
				const body = await res.json();
				expect(body).toEqual({ error: 'Forbidden' });
				expect(postResult).not.toHaveBeenCalled();
			} finally {
				env.MODE = previous;
			}
		});

		it('UnknownDevSlugError from generator (registry slug without generator) → 404', async () => {
			const generators = await import('$lib/server/db/seed/generators');
			const spy = vi.spyOn(generators, 'generateDevRandomResults').mockImplementation(() => {
				throw new generators.UnknownDevSlugError('stroop');
			});

			try {
				const { POST } = await import('./+server');
				const res = await POST(
					makeEvent({
						slug: 'stroop',
						body: { action: 'generate-random' },
						userId: 'user-1'
					})
				);

				expect(res.status).toBe(404);
				const body = await res.json();
				expect(body).toEqual({ error: 'test not found' });
				expect(postResult).not.toHaveBeenCalled();
			} finally {
				spy.mockRestore();
			}
		});

		it("valid slug 'stroop' in DEV → 200 with array of 25 results", async () => {
			const { POST } = await import('./+server');
			const res = await POST(
				makeEvent({ slug: 'stroop', body: { action: 'generate-random' }, userId: 'user-1' })
			);

			expect(res.status).toBe(200);
			const body = await res.json();
			expect(Array.isArray(body.results)).toBe(true);
			expect(body.results).toHaveLength(25);
			expect(postResult).not.toHaveBeenCalled();
		});

		it("valid slug 'memory' in DEV → 200 with { results, meta }", async () => {
			const { POST } = await import('./+server');
			const res = await POST(
				makeEvent({ slug: 'memory', body: { action: 'generate-random' }, userId: 'user-1' })
			);

			expect(res.status).toBe(200);
			const body = await res.json();
			expect(Array.isArray(body.results.results)).toBe(true);
			expect(body.results.results).toHaveLength(10);
			expect(Array.isArray(body.results.meta)).toBe(true);
			expect(postResult).not.toHaveBeenCalled();
		});
	});

	describe('normal POST (no action)', () => {
		it('still submits results via postResult → 201', async () => {
			vi.mocked(postResult).mockResolvedValue(undefined as never);

			const { POST } = await import('./+server');
			const results = [{ attempt: 0 }];
			const res = await POST(
				makeEvent({ slug: 'stroop', body: { results }, userId: 'user-1' })
			);

			expect(res.status).toBe(201);
			const body = await res.json();
			expect(body).toEqual('success');
			expect(postResult).toHaveBeenCalledWith(results, 'stroop', 'user-1');
		});
	});
});

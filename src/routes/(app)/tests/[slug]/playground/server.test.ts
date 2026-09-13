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
import type { TestResultMap } from '$lib/tests/types.js';
import { env } from '$env/dynamic/private';

vi.mock('$env/dynamic/private', () => ({
	env: { MODE: 'DEV' }
}));

vi.mock('$lib/server/db/controllers/result', () => {
	// Тот же класс, что импортирует хендлер из (замоканного) модуля:
	// instanceof в +server и в тесте обязан ссылаться на одно определение
	class SessionOwnershipError extends Error {
		constructor(public readonly sessionId: string) {
			super(`Session ${sessionId} belongs to a different user`);
			this.name = 'SessionOwnershipError';
		}
	}
	return {
		postResult: vi.fn(),
		SessionOwnershipError
	};
});

import { postResult, SessionOwnershipError } from '$lib/server/db/controllers/result';

const makeCookies = (userId?: string) => ({
	get: (name: string) => (name === 'user_id' ? userId : undefined)
});

// Совпадает с типом POST в +server.ts: RequestHandler<{ slug: keyof TestResultMap }>
type ReqEvent = Parameters<RequestHandler<{ slug: keyof TestResultMap }>>[0];

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
		it('missing results in body → 400, postResult NOT called', async () => {
			const { POST } = await import('./+server');
			const res = await POST(makeEvent({ slug: 'stroop', body: {}, userId: 'user-1' }));

			expect(res.status).toBe(400);
			const body = await res.json();
			expect(body).toEqual({ error: 'results are required' });
			expect(postResult).not.toHaveBeenCalled();
		});

		it('submits results via postResult → 201 with { sessionId } from controller', async () => {
			vi.mocked(postResult).mockResolvedValue('sess-1' as never);

			const { POST } = await import('./+server');
			const results = [{ attempt: 0 }];
			const res = await POST(
				makeEvent({ slug: 'stroop', body: { results }, userId: 'user-1' })
			);

			expect(res.status).toBe(201);
			const body = await res.json();
			expect(body).toEqual({ sessionId: 'sess-1' });
			expect(postResult).toHaveBeenCalledWith(results, 'stroop', 'user-1', undefined);
		});

		it('POST without sessionId → 201 with server-generated sessionId', async () => {
			vi.mocked(postResult).mockResolvedValue('server-generated' as never);

			const { POST } = await import('./+server');
			const results = [{ attempt: 2 }];
			const res = await POST(
				makeEvent({ slug: 'stroop', body: { results }, userId: 'user-1' })
			);

			expect(res.status).toBe(201);
			const body = await res.json();
			expect(body).toEqual({ sessionId: 'server-generated' });
			// sessionId не передан — контроллер сгенерирует свой
			expect(postResult).toHaveBeenCalledWith(results, 'stroop', 'user-1', undefined);
		});

		it('idempotency: two POSTs with the same sessionId → both 201 with identical { sessionId } bodies', async () => {
			vi.mocked(postResult).mockImplementation(
				async (_r, _t, _u, provided) => (provided ?? 'server-generated') as never
			);

			const { POST } = await import('./+server');
			const results = [{ attempt: 1 }];
			const event = (body: unknown) => makeEvent({ slug: 'stroop', body, userId: 'user-1' });

			const first = await POST(event({ results, sessionId: 'client-42' }));
			const second = await POST(event({ results, sessionId: 'client-42' }));

			expect(first.status).toBe(201);
			expect(second.status).toBe(201);

			const firstBody = await first.json();
			const secondBody = await second.json();
			expect(firstBody).toEqual({ sessionId: 'client-42' });
			expect(secondBody).toEqual({ sessionId: 'client-42' });
			// одинаковые тела, а не только одинаковый статус
			expect(secondBody).toEqual(firstBody);

			expect(postResult).toHaveBeenCalledTimes(2);
			expect(postResult).toHaveBeenNthCalledWith(1, results, 'stroop', 'user-1', 'client-42');
			expect(postResult).toHaveBeenNthCalledWith(2, results, 'stroop', 'user-1', 'client-42');
		});

		// ─── session ownership conflict (409) ──────────────────────────

		it('postResult rejects with SessionOwnershipError → 409 with error body', async () => {
			vi.mocked(postResult).mockRejectedValue(new SessionOwnershipError('sess-123'));

			const { POST } = await import('./+server');
			const res = await POST(
				makeEvent({
					slug: 'stroop',
					body: { results: [{ attempt: 0 }], sessionId: 'sess-123' },
					userId: 'user-1'
				})
			);

			expect(res.status).toBe(409);
			const body = await res.json();
			expect(body).toEqual({ error: 'session belongs to another user' });
		});

		it('postResult rejects with an unrelated error → the handler rethrows it', async () => {
			vi.mocked(postResult).mockRejectedValue(new Error('db connection lost'));

			const { POST } = await import('./+server');
			await expect(
				POST(
					makeEvent({
						slug: 'stroop',
						body: { results: [{ attempt: 0 }] },
						userId: 'user-1'
					})
				)
			).rejects.toThrow('db connection lost');
		});
	});
});

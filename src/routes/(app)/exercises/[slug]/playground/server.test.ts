/**
 * Route-level unit test for the playground POST handler.
 *
 * Pattern: direct handler import + dependency mocking (same approach used
 * throughout the repo for +page.server tests; no request-fetch infra exists
 * for +server.ts routes, so we invoke the exported POST directly with a
 * minimal mocked RequestEvent).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestHandler } from '@sveltejs/kit';

const makeCookies = (userId?: string) => ({
	get: (name: string) => (name === 'user_id' ? userId : undefined)
});

type ReqEvent = Parameters<RequestHandler>[0];

const makeEvent = (opts: { slug: string; body: unknown; userId?: string }): ReqEvent =>
	({
		params: { slug: opts.slug },
		request: new Request('http://localhost/exercises/rhythm/playground', {
			method: 'POST',
			body: JSON.stringify(opts.body),
			headers: { 'content-type': 'application/json' }
		}),
		cookies: makeCookies(opts.userId)
	}) as ReqEvent;

// ─── Mock setup ────────────────────────────────────────────────────────

vi.mock('$lib/server/db/controllers/result', () => ({
	postResult: vi.fn()
}));

vi.mock('$env/dynamic/private', () => ({
	env: { MODE: 'DEV' }
}));

import { postResult } from '$lib/server/db/controllers/result';
import { env } from '$env/dynamic/private';

describe('playground POST route', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('POST without sessionId → 201 with generated sessionId in body', async () => {
		vi.mocked(postResult).mockResolvedValue('gen-id-123');

		const { POST } = await import('./+server');
		const res = await POST(
			makeEvent({ slug: 'rhythm', body: { results: [] }, userId: 'user-1' })
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toEqual({ sessionId: 'gen-id-123' });

		expect(postResult).toHaveBeenCalledWith([], 'rhythm', 'user-1');
	});

	it('POST with sessionId → 201 with the SAME sessionId echoed', async () => {
		vi.mocked(postResult).mockResolvedValue('client-id-456');

		const { POST } = await import('./+server');
		const res = await POST(
			makeEvent({
				slug: 'rhythm',
				body: { results: [], sessionId: 'client-id-456' },
				userId: 'user-1'
			})
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toEqual({ sessionId: 'client-id-456' });

		expect(postResult).toHaveBeenCalledWith([], 'rhythm', 'user-1', 'client-id-456');
	});

	it('POST without user_id cookie → 401', async () => {
		const { POST } = await import('./+server');
		const res = await POST(
			makeEvent({ slug: 'rhythm', body: { results: [] } }) // no userId
		);

		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body).toEqual({ error: 'Unauthorized' });
		expect(postResult).not.toHaveBeenCalled();
	});

	it('POST with unknown slug → 400', async () => {
		const { POST } = await import('./+server');
		const res = await POST(
			makeEvent({ slug: 'bogus', body: { results: [] }, userId: 'user-1' })
		);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toEqual({ error: 'unknown exercise' });
		expect(postResult).not.toHaveBeenCalled();
	});

	it('POST with MetaResult body → 201, meta preserved through to postResult', async () => {
		vi.mocked(postResult).mockResolvedValue('meta-session-id-789');

		const metaResult = {
			results: [],
			meta: { difficulty: 'easy', overpress: '0' }
		};

		const { POST } = await import('./+server');
		const res = await POST(
			makeEvent({
				slug: 'rhythm',
				body: { results: metaResult },
				userId: 'user-1'
			})
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toEqual({ sessionId: 'meta-session-id-789' });

		expect(postResult).toHaveBeenCalledWith(metaResult, 'rhythm', 'user-1');
	});

	// ─── generate-random (DEV-only автопрохождение) ─────────────────────

	it('generate-random without user_id cookie → 401', async () => {
		const { POST } = await import('./+server');
		const res = await POST(
			makeEvent({ slug: 'raven-matrices', body: { action: 'generate-random' } }) // no userId
		);

		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body).toEqual({ error: 'Unauthorized' });
		expect(postResult).not.toHaveBeenCalled();
	});

	it('generate-random for a non-raven slug → 400', async () => {
		const { POST } = await import('./+server');
		const res = await POST(
			makeEvent({
				slug: 'rhythm',
				body: { action: 'generate-random' },
				userId: 'user-1'
			})
		);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toEqual({ error: 'generate-random is only available for raven-matrices' });
		expect(postResult).not.toHaveBeenCalled();
	});

	it('generate-random when MODE is not DEV → 403', async () => {
		const { POST } = await import('./+server');
		const originalMode = env.MODE;
		env.MODE = 'PROD';
		try {
			const res = await POST(
				makeEvent({
					slug: 'raven-matrices',
					body: { action: 'generate-random' },
					userId: 'user-1'
				})
			);

			expect(res.status).toBe(403);
			const body = await res.json();
			expect(body).toEqual({ error: 'Forbidden' });
			expect(postResult).not.toHaveBeenCalled();
		} finally {
			env.MODE = originalMode;
		}
	});

	it('generate-random for raven-matrices in DEV → 200 with 10 raven attempt rows', async () => {
		const { POST } = await import('./+server');
		const res = await POST(
			makeEvent({
				slug: 'raven-matrices',
				body: { action: 'generate-random' },
				userId: 'user-1'
			})
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(Array.isArray(body.results)).toBe(true);
		expect(body.results).toHaveLength(10);
		for (const [i, row] of (body.results as unknown[]).entries()) {
			expect(row).toMatchObject({
				taskIndex: i,
				difficultyLevel: expect.any(Number),
				selectedIndex: expect.any(Number),
				correctIndex: expect.any(Number),
				isCorrect: expect.any(Boolean),
				responseTimeMs: expect.any(Number)
			});
		}
		expect(postResult).not.toHaveBeenCalled();
	});
});

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { setGtoIdAndAutoAdd } from '$lib/server/db/controllers/gto';
import type { Actions } from './$types';

const makeCookies = (userId?: string) => ({
	get: (name: string) => (name === 'user_id' ? userId : undefined)
});

type ActionValue = Actions[keyof Actions];
type ActionEvent = Parameters<ActionValue>[0];

const makeActionEvent = (formData: Record<string, string>, userId = 'user-1'): ActionEvent =>
	({
		cookies: makeCookies(userId),
		request: new Request('http://localhost', {
			method: 'POST',
			body: new URLSearchParams(formData)
		})
	}) as ActionEvent;

// ─── Mock setup ────────────────────────────────────────────────────────

vi.mock('$lib/server/db/controllers/gto', () => ({
	setGtoIdAndAutoAdd: vi.fn(),
	getActiveGtoSessionsForUser: vi.fn(),
	getCompletedGtoSessionsForUser: vi.fn()
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

type RedirectLike = { status: number; location: string };

function asRedirect(e: unknown): RedirectLike {
	return e as RedirectLike;
}

// ─── Tests ─────────────────────────────────────────────────────────────

describe('(app) gto +page.server saveGtoId action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('redirects to /questionary when gtoId is saved successfully', async () => {
		vi.mocked(setGtoIdAndAutoAdd).mockResolvedValue('saved');

		const { actions } = await import('./+page.server');
		try {
			await (actions as Actions).saveGtoId(makeActionEvent({ gtoId: 'ABC123' }));
			expect.fail('Expected redirect');
		} catch (e) {
			const redirect = asRedirect(e);
			expect(redirect.status).toBe(303);
			expect(redirect.location).toBe('/questionary');
		}

		expect(setGtoIdAndAutoAdd).toHaveBeenCalledWith('user-1', 'ABC123');
	});

	it('redirects to /questionary when gtoId is already set (idempotency)', async () => {
		vi.mocked(setGtoIdAndAutoAdd).mockResolvedValue('already-set');

		const { actions } = await import('./+page.server');
		try {
			await (actions as Actions).saveGtoId(makeActionEvent({ gtoId: 'ABC123' }));
			expect.fail('Expected redirect');
		} catch (e) {
			const redirect = asRedirect(e);
			expect(redirect.status).toBe(303);
			expect(redirect.location).toBe('/questionary');
		}

		expect(setGtoIdAndAutoAdd).toHaveBeenCalledWith('user-1', 'ABC123');
	});

	it('returns fail(400) when gtoId is empty and does NOT call setGtoIdAndAutoAdd', async () => {
		const { actions } = await import('./+page.server');
		const result = await (actions as Actions).saveGtoId(makeActionEvent({ gtoId: '' }));

		expect(setGtoIdAndAutoAdd).not.toHaveBeenCalled();
		expect(result).toEqual(
			expect.objectContaining({
				status: 400,
				data: expect.objectContaining({ error: 'Введите ваш ГТО-М ID' })
			})
		);
	});

	it('returns fail(400) when gtoId is whitespace only and does NOT call setGtoIdAndAutoAdd', async () => {
		const { actions } = await import('./+page.server');
		const result = await (actions as Actions).saveGtoId(makeActionEvent({ gtoId: '   ' }));

		expect(setGtoIdAndAutoAdd).not.toHaveBeenCalled();
		expect(result).toEqual(
			expect.objectContaining({
				status: 400,
				data: expect.objectContaining({ error: 'Введите ваш ГТО-М ID' })
			})
		);
	});
});

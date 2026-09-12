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

// ─── Tests ─────────────────────────────────────────────────────────────

describe('(app) gto +page.server saveGtoId action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('saves gtoId successfully without redirecting', async () => {
		vi.mocked(setGtoIdAndAutoAdd).mockResolvedValue('saved');

		const { actions } = await import('./+page.server');
		await expect(
			(actions as Actions).saveGtoId(makeActionEvent({ gtoId: 'ABC123' }))
		).resolves.toBeUndefined();

		expect(setGtoIdAndAutoAdd).toHaveBeenCalledWith('user-1', 'ABC123');
	});

	it('does not redirect when gtoId is already set (idempotency)', async () => {
		vi.mocked(setGtoIdAndAutoAdd).mockResolvedValue('already-set');

		const { actions } = await import('./+page.server');
		await expect(
			(actions as Actions).saveGtoId(makeActionEvent({ gtoId: 'ABC123' }))
		).resolves.toBeUndefined();

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

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { updateProfileSurvey, getProfileSurvey } from '$lib/server/db/controllers/survey';
import { autoAddToLatestActiveSession } from '$lib/server/db/controllers/gto';
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

vi.mock('$lib/server/db/controllers/survey', () => ({
	getProfileSurvey: vi.fn(),
	updateProfileSurvey: vi.fn()
}));

vi.mock('$lib/server/db/controllers/gto', () => ({
	autoAddToLatestActiveSession: vi.fn()
}));

vi.mock('$lib/server/db', () => ({
	createUser: vi.fn(),
	getUserById: vi.fn(),
	getUsersAnalytics: vi.fn()
}));

// ─── Tests ─────────────────────────────────────────────────────────────

describe('root +page.server save action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('calls autoAddToLatestActiveSession when survey had no gtoId and form provides one', async () => {
		vi.mocked(getProfileSurvey).mockResolvedValue(null);
		vi.mocked(updateProfileSurvey).mockResolvedValue({
			id: 1,
			userId: 'user-1',
			gtoId: 'ABC123'
		} as unknown as Awaited<ReturnType<typeof updateProfileSurvey>>);
		vi.mocked(autoAddToLatestActiveSession).mockResolvedValue(undefined);

		const { actions } = await import('./+page.server');
		await (actions as Actions).save(makeActionEvent({ gtoId: 'ABC123' }));

		expect(updateProfileSurvey).toHaveBeenCalledWith(
			'user-1',
			expect.objectContaining({ gtoId: 'ABC123' })
		);
		expect(autoAddToLatestActiveSession).toHaveBeenCalledWith('user-1');
		expect(autoAddToLatestActiveSession).toHaveBeenCalledTimes(1);
	});

	it('does NOT call autoAddToLatestActiveSession when gtoId was already set', async () => {
		vi.mocked(getProfileSurvey).mockResolvedValue({
			id: 1,
			userId: 'user-1',
			gtoId: 'OLD123'
		} as unknown as Awaited<ReturnType<typeof getProfileSurvey>>);
		vi.mocked(updateProfileSurvey).mockResolvedValue({
			id: 1,
			userId: 'user-1',
			gtoId: 'NEW123'
		} as unknown as Awaited<ReturnType<typeof updateProfileSurvey>>);

		const { actions } = await import('./+page.server');
		await (actions as Actions).save(makeActionEvent({ gtoId: 'NEW123' }));

		expect(autoAddToLatestActiveSession).not.toHaveBeenCalled();
	});

	it('does NOT call autoAddToLatestActiveSession when form gtoId is empty', async () => {
		vi.mocked(getProfileSurvey).mockResolvedValue(null);
		vi.mocked(updateProfileSurvey).mockResolvedValue({
			id: 1,
			userId: 'user-1'
		} as unknown as Awaited<ReturnType<typeof updateProfileSurvey>>);

		const { actions } = await import('./+page.server');
		await (actions as Actions).save(makeActionEvent({ gtoId: '' }));

		expect(autoAddToLatestActiveSession).not.toHaveBeenCalled();
	});
});

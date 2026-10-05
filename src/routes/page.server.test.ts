import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { updateProfileSurvey, getProfileSurvey } from '$lib/server/db/controllers/survey';
import { autoAddToLatestActiveSession } from '$lib/server/db/controllers/gto';
import { getUserById } from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';

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

type LoadEvent = Parameters<PageServerLoad>[0];

const makeLoadEvent = (): LoadEvent => ({ cookies: makeCookies() }) as LoadEvent;

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

const { envMock } = vi.hoisted(() => ({ envMock: { MODE: undefined as string | undefined } }));

vi.mock('$env/dynamic/private', () => ({ env: envMock }));

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

describe('root +page.server load devUser prefill', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getUserById).mockResolvedValue(null);
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		envMock.MODE = undefined;
	});

	it('returns devUser with seed data when MODE=DEV and NODE_ENV is not test', async () => {
		envMock.MODE = 'DEV';
		vi.stubEnv('NODE_ENV', 'development');

		const { load } = await import('./+page.server');
		const result = await load(makeLoadEvent());

		expect(result?.devUser).toEqual({
			firstname: 'USR',
			lastname: 'NM',
			birthday: '01.01.2000',
			sex: 'male'
		});
	});

	it('does NOT return devUser when MODE is PROD', async () => {
		envMock.MODE = 'PROD';
		vi.stubEnv('NODE_ENV', 'development');

		const { load } = await import('./+page.server');
		const result = await load(makeLoadEvent());

		expect(result?.devUser).toBeUndefined();
	});

	it('does NOT return devUser when NODE_ENV is test', async () => {
		envMock.MODE = 'DEV';
		vi.stubEnv('NODE_ENV', 'test');

		const { load } = await import('./+page.server');
		const result = await load(makeLoadEvent());

		expect(result?.devUser).toBeUndefined();
	});

	it('returns devUser even when cookie points to a deleted user (stale cookie)', async () => {
		envMock.MODE = 'DEV';
		vi.stubEnv('NODE_ENV', 'development');

		const { load } = await import('./+page.server');
		const cookies = { ...makeCookies('stale-id'), delete: vi.fn() };
		const result = await load({ cookies } as unknown as LoadEvent);

		expect(result?.devUser).toEqual({
			firstname: 'USR',
			lastname: 'NM',
			birthday: '01.01.2000',
			sex: 'male'
		});
		expect(cookies.delete).toHaveBeenCalledWith('user_id', { path: '/' });
	});
});

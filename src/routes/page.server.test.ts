import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { updateProfileSurvey, getProfileSurvey } from '$lib/server/db/controllers/survey';
import { autoAddToLatestActiveSession } from '$lib/server/db/controllers/gto';
import { createUser, getUserById } from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';

const makeCookies = (userId?: string) => ({
	get: (name: string) => (name === 'user_id' ? userId : undefined)
});

type RedirectShape = { status: number; location: string };

const catchRedirect = async (fn: () => Promise<unknown>): Promise<RedirectShape> => {
	try {
		await fn();
	} catch (e) {
		return e as RedirectShape;
	}
	throw new Error('expected redirect to be thrown');
};

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

const makeLoadEvent = (search = '', userId?: string): LoadEvent =>
	({ cookies: makeCookies(userId), url: new URL(`http://localhost/${search}`) }) as LoadEvent;

const VALID_LOGIN_FORM = {
	firstname: 'Иван',
	lastname: 'Ив',
	birthday: '01.01.2000',
	sex: 'male'
};

const makeLoginCookies = () => ({
	get: (name: string) => (name === 'user_id' ? undefined : undefined),
	set: vi.fn()
});

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

describe('root +page.server load ai redirect', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('redirects logged-in user to /home when no ai query param', async () => {
		vi.mocked(getUserById).mockResolvedValue({ id: 'user-1' } as never);

		const { load } = await import('./+page.server');
		const redirect = await catchRedirect(async () => load(makeLoadEvent('', 'user-1')));

		expect(redirect.status).toBe(307);
		expect(redirect.location).toBe('/home');
	});

	it('redirects logged-in user to /ai when ai query param present', async () => {
		vi.mocked(getUserById).mockResolvedValue({ id: 'user-1' } as never);

		const { load } = await import('./+page.server');
		const redirect = await catchRedirect(async () => load(makeLoadEvent('?ai', 'user-1')));

		expect(redirect.status).toBe(307);
		expect(redirect.location).toBe('/ai');
	});
});

describe('root +page.server login action ai flow', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(createUser).mockResolvedValue({ id: 'new-user-1' } as never);
	});

	const makeLoginEvent = (search = ''): ActionEvent =>
		({
			cookies: makeLoginCookies(),
			request: new Request(`http://localhost/${search}`, {
				method: 'POST',
				body: new URLSearchParams(VALID_LOGIN_FORM)
			})
		}) as unknown as ActionEvent;

	it('redirects to /ai and sets ai_flow cookie when ai query param present (no prior cookie)', async () => {
		const { actions } = await import('./+page.server');
		const event = makeLoginEvent('?ai');
		const redirect = await catchRedirect(async () => (actions as Actions).login(event));

		expect(redirect.status).toBe(307);
		expect(redirect.location).toBe('/ai');
		const cookies = event.cookies as unknown as { set: ReturnType<typeof vi.fn> };
		expect(cookies.set).toHaveBeenCalledWith('user_id', 'new-user-1', {
			path: '/',
			secure: true,
			maxAge: 60 * 60 * 24 * 30
		});
		expect(cookies.set).toHaveBeenCalledWith('ai_flow', '1', {
			path: '/',
			secure: true,
			httpOnly: true,
			maxAge: 60 * 60 * 24 * 30
		});
	});

	it('redirects to /home and does NOT set ai_flow cookie when no ai query param', async () => {
		const { actions } = await import('./+page.server');
		const event = makeLoginEvent();
		const redirect = await catchRedirect(async () => (actions as Actions).login(event));

		expect(redirect.status).toBe(307);
		expect(redirect.location).toBe('/home');
		const cookies = event.cookies as unknown as { set: ReturnType<typeof vi.fn> };
		expect(cookies.set).toHaveBeenCalledTimes(1);
		expect(cookies.set).toHaveBeenCalledWith('user_id', 'new-user-1', expect.anything());
	});
});

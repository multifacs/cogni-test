import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getAiSurveyProgress } from '$lib/server/db/controllers/ai-survey';
import { getTestSessionCounts } from '$lib/server/db/controllers/test';
import type { PageServerData, PageServerLoad } from './$types';

// ─── Mock setup ────────────────────────────────────────────────────────

vi.mock('$lib/server/db/controllers/ai-survey', () => ({
	getAiSurveyProgress: vi.fn()
}));

vi.mock('$lib/server/db/controllers/test', () => ({
	getTestSessionCounts: vi.fn()
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

// ─── Helpers ───────────────────────────────────────────────────────────

type LoadEvent = Parameters<PageServerLoad>[0];

const makeCookies = (userId?: string) => ({
	get: (name: string) => (name === 'user_id' ? userId : undefined)
});

const makeEvent = (opts: {
	userId?: string;
	profileSurvey?: Record<string, unknown> | null;
}): LoadEvent =>
	({
		cookies: makeCookies(opts.userId),
		parent: async () => ({ profileSurvey: opts.profileSurvey ?? null })
	}) as LoadEvent;

type RedirectLike = { status: number; location: string };

function asRedirect(e: unknown): RedirectLike {
	return e as RedirectLike;
}

// 6 видимых диагностических тестов (см. layout.server.test.ts)
const ALL_TEST_SESSIONS = {
	stroop: 1,
	math: 1,
	munsterberg: 1,
	campimetry: 1,
	memory: 1,
	swallow: 1
};

// fullFlow содержит 32 вопроса: 4 заполненных = floor(12.5%) = 12% ≥ 10 → done;
// 3 заполненных = floor(9.375%) = 9% < 10 → не done. Ровно 10% при 32 вопросах
// недостижимо (10% = 3.2 вопроса), поэтому граница проверяется как 9% vs 12%.
const FILLED_4 = {
	birthCity: 'Город',
	currentCityType: 'big',
	education: 'higher',
	yearsNotQualified: 1
};
const FILLED_3 = { birthCity: 'Город', currentCityType: 'big', education: 'higher' };

const AI_PROGRESS_0 = { answered: 0, visibleTotal: 10, percent: 0 };
const AI_PROGRESS_10 = { answered: 1, visibleTotal: 10, percent: 10 };

async function loadStages(event: LoadEvent): Promise<PageServerData> {
	const { load } = await import('./+page.server');
	return (await load(event)) as PageServerData;
}

// ─── Tests ─────────────────────────────────────────────────────────────

describe('/ai page server load: этап «Анкета» (profileSurveyPercent)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getAiSurveyProgress).mockResolvedValue(AI_PROGRESS_0);
		vi.mocked(getTestSessionCounts).mockResolvedValue({});
	});

	it('null profileSurvey → первый этап next, остальные locked', async () => {
		const result = await loadStages(makeEvent({ userId: 'user-1', profileSurvey: null }));

		expect(result.stages.map((s) => s.status)).toEqual(['next', 'locked', 'locked', 'locked']);
		expect(result.allDone).toBe(false);
	});

	it('пустые/null-поля profileSurvey → 0%, этап не done', async () => {
		const result = await loadStages(
			makeEvent({ userId: 'user-1', profileSurvey: { birthCity: null, education: '' } })
		);

		expect(result.stages[0].status).toBe('next');
		expect(result.allDone).toBe(false);
	});

	it('ровно 4 из 32 полей (12% ≥ 10%) → этап survey done', async () => {
		const result = await loadStages(
			makeEvent({ userId: 'user-1', profileSurvey: { ...FILLED_4 } })
		);

		expect(result.stages[0].status).toBe('done');
	});

	it('3 из 32 полей (9% < 10%) → этап survey НЕ done, он next', async () => {
		const result = await loadStages(
			makeEvent({ userId: 'user-1', profileSurvey: { ...FILLED_3 } })
		);

		expect(result.stages[0].status).toBe('next');
	});
});

describe('/ai page server load: статусы этапов', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('свежий юзер (ничего не пройдено) → только первый этап next, остальные locked', async () => {
		vi.mocked(getAiSurveyProgress).mockResolvedValue(AI_PROGRESS_0);
		vi.mocked(getTestSessionCounts).mockResolvedValue({});

		const result = await loadStages(makeEvent({ userId: 'user-1', profileSurvey: null }));

		expect(result.stages.map((s) => s.status)).toEqual(['next', 'locked', 'locked', 'locked']);
		expect(result.allDone).toBe(false);
	});

	it('все 4 этапа пройдены → все done и allDone=true', async () => {
		vi.mocked(getAiSurveyProgress).mockResolvedValue(AI_PROGRESS_10);
		vi.mocked(getTestSessionCounts).mockResolvedValue({
			...ALL_TEST_SESSIONS,
			classification: 1
		});

		const result = await loadStages(
			makeEvent({ userId: 'user-1', profileSurvey: { ...FILLED_4 } })
		);

		expect(result.stages.every((s) => s.status === 'done')).toBe(true);
		expect(result.allDone).toBe(true);
	});

	it('частично: анкета done → следующий этап (ai-life) next, будущие locked', async () => {
		vi.mocked(getAiSurveyProgress).mockResolvedValue(AI_PROGRESS_0);
		vi.mocked(getTestSessionCounts).mockResolvedValue({});

		const result = await loadStages(
			makeEvent({ userId: 'user-1', profileSurvey: { ...FILLED_4 } })
		);

		expect(result.stages.map((s) => s.status)).toEqual(['done', 'next', 'locked', 'locked']);
	});

	it('частично: анкета и ИИ done → tests next, classification locked', async () => {
		vi.mocked(getAiSurveyProgress).mockResolvedValue(AI_PROGRESS_10);
		vi.mocked(getTestSessionCounts).mockResolvedValue({});

		const result = await loadStages(
			makeEvent({ userId: 'user-1', profileSurvey: { ...FILLED_4 } })
		);

		expect(result.stages.map((s) => s.status)).toEqual(['done', 'done', 'next', 'locked']);
	});

	it('5 из 6 тестов → этап tests НЕ done (нужны все видимые тесты)', async () => {
		vi.mocked(getAiSurveyProgress).mockResolvedValue(AI_PROGRESS_10);
		const { swallow, ...fiveTests } = ALL_TEST_SESSIONS;
		vi.mocked(getTestSessionCounts).mockResolvedValue({ ...fiveTests, classification: 1 });

		const result = await loadStages(
			makeEvent({ userId: 'user-1', profileSurvey: { ...FILLED_4 } })
		);

		expect(result.stages.map((s) => s.status)).toEqual(['done', 'done', 'next', 'done']);
		expect(result.allDone).toBe(false);
	});
});

describe('/ai page server load: redirect', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('нет cookie user_id → redirect 307 /', async () => {
		try {
			await loadStages(makeEvent({ userId: undefined }));
			expect.fail('Expected redirect');
		} catch (e) {
			const redirect = asRedirect(e);
			expect(redirect.status).toBe(307);
			expect(redirect.location).toBe('/');
		}
	});
});

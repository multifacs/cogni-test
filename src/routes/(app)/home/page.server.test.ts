import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getTestSessionCounts } from '$lib/server/db/controllers/test';
import { getFeaturesFromDB } from '$lib/server/age/getFeaturesFromDB';
import { runAgeModel } from '$lib/server/age/runAgeModel';
import { getMetricScores, getUserMetricScores } from '$lib/shared/metrics';
import type { SkillMetric } from '$lib/types';
import { SKILL_METRICS } from '$lib/shared/metricShares';
import type { PageServerData, PageServerLoad } from './$types';

// ─── Хелперы ──────────────────────────────────────────────────────────

const USER_METRIC_KEYS = [
	'executive_function',
	'attention',
	'color_perception',
	'reaction_speed',
	'spacial_perception',
	'memory'
] as const;

const makeCookies = (opts: { userId?: string } = {}) => ({
	get: (name: string) => {
		if (name === 'user_id') return opts.userId;
		return undefined;
	}
});

type LoadEvent = Parameters<PageServerLoad>[0];

const makeEvent = (opts: { userId?: string } = {}): LoadEvent =>
	({ cookies: makeCookies(opts) }) as LoadEvent;

function adminScores(values: number[]): Record<SkillMetric, number> {
	return Object.fromEntries(SKILL_METRICS.map((m, i) => [m, values[i] ?? 0])) as Record<
		SkillMetric,
		number
	>;
}

function userScores(values: number[]): Record<(typeof USER_METRIC_KEYS)[number], number> {
	return Object.fromEntries(USER_METRIC_KEYS.map((m, i) => [m, values[i] ?? 0])) as Record<
		(typeof USER_METRIC_KEYS)[number],
		number
	>;
}

// ─── Моки ─────────────────────────────────────────────────────────────

vi.mock('$lib/server/db/controllers/test', () => ({
	getTestSessionCounts: vi.fn()
}));

vi.mock('$lib/server/age/getFeaturesFromDB', () => ({
	getFeaturesFromDB: vi.fn()
}));

vi.mock('$lib/server/age/runAgeModel', () => ({
	runAgeModel: vi.fn()
}));

// getRecommendations остаётся реальной: ассерт «рекомендации по админским
// скорам» проверяет настоящую логику отбора, а не мок.
vi.mock('$lib/shared/metrics', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/shared/metrics')>();
	return {
		...actual,
		getMetricScores: vi.fn(),
		getUserMetricScores: vi.fn()
	};
});

// ─── Тесты ────────────────────────────────────────────────────────────

describe('/home page server load', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getTestSessionCounts).mockResolvedValue({});
		vi.mocked(getFeaturesFromDB).mockResolvedValue(
			null as unknown as Record<string, number | null>
		);
		vi.mocked(runAgeModel).mockResolvedValue(null);
	});

	it('serves exactly the 6 user metric keys in the canonical order', async () => {
		vi.mocked(getUserMetricScores).mockResolvedValue(userScores([10, 20, 30, 40, 50, 60]));
		vi.mocked(getMetricScores).mockResolvedValue(adminScores(new Array(11).fill(0)));

		const { load } = await import('./+page.server');
		const result = (await load(makeEvent({ userId: 'user-1' }))) as PageServerData;

		expect(Object.keys(result.metricScores)).toEqual([...USER_METRIC_KEYS]);
	});

	it('hasData follows user scores, not admin ones', async () => {
		vi.mocked(getUserMetricScores).mockResolvedValue(userScores([0, 0, 0, 0, 0, 0]));
		// админские скоры ненулевые — не должны влиять на hasData
		vi.mocked(getMetricScores).mockResolvedValue(adminScores(new Array(11).fill(80)));

		const { load } = await import('./+page.server');
		const empty = (await load(makeEvent({ userId: 'user-1' }))) as PageServerData;
		expect(empty.hasData).toBe(false);

		vi.mocked(getUserMetricScores).mockResolvedValue(userScores([0, 0, 0, 0, 0, 5]));
		const partial = (await load(makeEvent({ userId: 'user-1' }))) as PageServerData;
		expect(partial.hasData).toBe(true);
	});

	it('builds recommendations from admin scores, not user scores', async () => {
		// Админски самая слабая — reaction_speed (→ тест math);
		// пользовательски самая слабая — attention (→ тест munsterberg).
		vi.mocked(getMetricScores).mockResolvedValue(
			adminScores([50, 50, 50, 50, 10, 50, 50, 50, 50, 50, 50]) // reaction_speed = 10
		);
		vi.mocked(getUserMetricScores).mockResolvedValue(
			userScores([60, 5, 60, 60, 60, 60]) // attention = 5
		);

		const { load } = await import('./+page.server');
		const result = (await load(makeEvent({ userId: 'user-1' }))) as PageServerData;

		expect(result.recommendations.length).toBeGreaterThan(0);
		expect(result.recommendations[0].name).toBe('math');
	});
});

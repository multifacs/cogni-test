import type { SkillMetric } from '$lib/types';
import { tests } from '$lib/tests';
import { exercises, EXERCISE_SLUG_TO_TEST_TYPE } from '$lib/exercises';
import { getResults } from '$lib/server/db/controllers/result';
import type { TestType } from '$lib/tests/types';
import { SKILL_METRICS } from './metricShares.js';

type AttemptLike = {
	isCorrect?: boolean;
	guessed?: boolean;
	stage?: number;
	efficiency?: number;
	time?: number; // читает getFeaturesFromDB (munsterberg/stroop/swallow)
	background?: string; // читает getFeaturesFromDB (swallow)
};

export type SessionResult = {
	sessionId: string;
	createdAt: string;
	attempts: AttemptLike[];
	meta?: unknown;
};

export function computeSessionScore(sessionType: string, attempts: AttemptLike[]): number {
	if (!attempts?.length) return 0;

	switch (sessionType) {
		// Accuracy-based tests
		case 'math':
		case 'stroop':
		case 'memory':
		case 'swallow':
		case 'attention':
		case 'emoji':
		case 'flanker':
		case 'letters':
		case 'numbers':
		case 'pictures':
		case 'ravenMatrices':
		case 'wordMorphingExercise':
		case 'nbackExercise': {
			const correct = attempts.filter((a) => a.isCorrect).length;
			return Math.round((correct / attempts.length) * 100);
		}

		case 'munsterberg': {
			const guessed = attempts.filter((a) => a.guessed).length;
			return Math.round((guessed / attempts.length) * 100);
		}

		case 'campimetry':
		case 'campimetryExercise': {
			const maxStage = Math.max(...attempts.map((a) => a.stage ?? 0));
			return Math.min(100, Math.round((maxStage / 2) * 100));
		}

		case 'memoryMatchExercise': {
			return Math.round(attempts[attempts.length - 1]?.efficiency ?? 0);
		}

		default:
			return 0;
	}
}

type MetricScores = Record<SkillMetric, number>;

/**
 * Пользовательские метрики доната на /home.
 * Порядок фиксирован и совпадает с USER_METRICS в тестах и фикстурах.
 * memory — составная: round(mean(админских working/short/long_memory)).
 */
export const USER_METRICS = [
	'executive_function',
	'attention',
	'color_perception',
	'reaction_speed',
	'spacial_perception',
	'memory'
] as const;

export type UserMetric = (typeof USER_METRICS)[number];
export type UserMetricScores = Record<UserMetric, number>;

type MetricSource = {
	name: string;
	admin_metrics?: SkillMetric[];
	user_metrics?: SkillMetric[];
};

/**
 * Собирает скоры сессий по выбранному набору метрик (admin или user).
 * Общая механика для getMetricScores и getUserMetricScores — без дублирования.
 */
async function gatherSessionScores(
	userId: string,
	pick: (source: MetricSource) => SkillMetric[] | undefined,
	allowed: readonly string[]
): Promise<Record<string, number[]>> {
	const buckets: Record<string, number[]> = Object.fromEntries(allowed.map((m) => [m, []]));
	const allowSet = new Set(allowed);

	const testPromises = tests
		.filter((test) => pick(test)?.length)
		.map(async (test) => {
			const sessions = await getResults(test.name as TestType, userId);
			for (const session of sessions) {
				const score = computeSessionScore(test.name, session.attempts);
				for (const metric of pick(test)!) {
					if (allowSet.has(metric)) buckets[metric].push(score);
				}
			}
		});

	const exercisePromises = exercises
		.filter((ex) => pick(ex)?.length)
		.map(async (ex) => {
			const sessionType = EXERCISE_SLUG_TO_TEST_TYPE[ex.name];
			if (!sessionType) return;
			const sessions = await getResults(sessionType, userId);
			for (const session of sessions) {
				const score = computeSessionScore(sessionType, session.attempts);
				for (const metric of pick(ex)!) {
					if (allowSet.has(metric)) buckets[metric].push(score);
				}
			}
		});

	await Promise.all([...testPromises, ...exercisePromises]);
	return buckets;
}

export async function getMetricScores(userId: string): Promise<MetricScores> {
	const scores = await gatherSessionScores(userId, (s) => s.admin_metrics, SKILL_METRICS);

	const result = {} as MetricScores;
	for (const metric of SKILL_METRICS) {
		const arr = scores[metric];
		result[metric] = arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
	}
	return result;
}

/**
 * Пользовательские скоры для доната на /home.
 *
 * - 5 прямых метрик — среднее скоров сессий тестов/упражнений с этой user-метрикой;
 * - memory — композит от АДМИНСКИХ значений: round((working + short + long) / 3);
 * - без данных — 0; ключи — ровно 6 в порядке USER_METRICS.
 */
export async function getUserMetricScores(userId: string): Promise<UserMetricScores> {
	const directMetrics = USER_METRICS.filter((m) => m !== 'memory');
	const scores = await gatherSessionScores(userId, (s) => s.user_metrics, directMetrics);
	const adminScores = await getMetricScores(userId);

	const result = {} as UserMetricScores;
	for (const metric of USER_METRICS) {
		if (metric === 'memory') {
			result.memory = Math.round(
				(adminScores.working_memory + adminScores.short_memory + adminScores.long_memory) /
					3
			);
			continue;
		}
		const arr = scores[metric];
		result[metric] = arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
	}
	return result;
}

export function getRecommendations(
	metricScores: MetricScores
): Array<{ name: string; title: string; path: string; img: string }> {
	const entries = Object.entries(metricScores) as [SkillMetric, number][];
	entries.sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));

	const recommendations: Array<{ name: string; title: string; path: string; img: string }> = [];
	const seenNames = new Set<string>();

	for (const [weakMetric] of entries) {
		if (recommendations.length >= 3) break;

		const testMatch = tests.find(
			(t) => t.user_metrics?.includes(weakMetric) && !seenNames.has(t.name)
		);
		if (testMatch) {
			recommendations.push({
				name: testMatch.name,
				title: testMatch.title,
				path: testMatch.path,
				img: testMatch.img
			});
			seenNames.add(testMatch.name);
			continue;
		}

		const exMatch = exercises.find(
			(e) => e.user_metrics?.includes(weakMetric) && !seenNames.has(e.name)
		);
		if (exMatch) {
			recommendations.push({
				name: exMatch.name,
				title: exMatch.title,
				path: exMatch.path,
				img: exMatch.img
			});
			seenNames.add(exMatch.name);
			continue;
		}
	}

	return recommendations;
}

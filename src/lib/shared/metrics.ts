import type { SkillMetric } from '$lib/types';
import { tests } from '$lib/tests';
import { exercises, EXERCISE_SLUG_TO_TEST_TYPE } from '$lib/exercises';
import { getResults } from '$lib/server/db/controllers/result';

export function computeSessionScore(sessionType: string, attempts: any[]): number {
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
			const maxStage = Math.max(...attempts.map((a) => a.stage));
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

export async function getMetricScores(userId: string): Promise<MetricScores> {
	const allMetrics: SkillMetric[] = [
		'executive_function',
		'memory',
		'attention',
		'thinking',
		'perception',
		'reaction_speed',
		'verbal_function',
		'spacial_perception',
		'spacial_orientation',
		'short_memory',
		'working_memory',
		'long_memory',
		'color_perception'
	];
	const scores: Record<string, number[]> = Object.fromEntries(allMetrics.map((m) => [m, []]));

	const testPromises = tests
		.filter((test) => test.admin_metrics?.length)
		.map(async (test) => {
			const sessions = await getResults(test.name as any, userId);
			for (const session of sessions) {
				const score = computeSessionScore(test.name, session.attempts);
				for (const metric of test.admin_metrics!) {
					scores[metric].push(score);
				}
			}
		});

	const exercisePromises = exercises
		.filter((ex) => ex.admin_metrics?.length)
		.map(async (ex) => {
			const sessionType = EXERCISE_SLUG_TO_TEST_TYPE[ex.name];
			if (!sessionType) return;
			const sessions = await getResults(sessionType as any, userId);
			for (const session of sessions) {
				const score = computeSessionScore(sessionType, session.attempts);
				for (const metric of ex.admin_metrics!) {
					scores[metric].push(score);
				}
			}
		});

	await Promise.all([...testPromises, ...exercisePromises]);

	const result = {} as MetricScores;
	for (const metric of allMetrics) {
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

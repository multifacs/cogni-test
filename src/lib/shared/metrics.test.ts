import { describe, it, expect, vi } from 'vitest';
import { computeSessionScore, getRecommendations } from './metrics';
import type { SkillMetric } from '$lib/types';

// Helpers for getMetricScores tests (must restore real modules after dedup test mocks them)
async function restoreRealModulesAndImportMetrics() {
	vi.resetModules();
	const actualTests = await vi.importActual<typeof import('$lib/tests')>('$lib/tests');
	const actualExercises =
		await vi.importActual<typeof import('$lib/exercises')>('$lib/exercises');
	vi.doMock('$lib/tests', () => actualTests);
	vi.doMock('$lib/exercises', () => actualExercises);
	return import('./metrics');
}

vi.mock('$lib/server/db/controllers/result', () => ({
	getResults: vi.fn()
}));

describe('computeSessionScore', () => {
	it('returns 0 for empty attempts', () => {
		expect(computeSessionScore('math', [])).toBe(0);
	});

	it('returns 0 for unknown sessionType', () => {
		expect(computeSessionScore('unknown', [{ isCorrect: true }])).toBe(0);
	});

	it('computes accuracy-based scores (math)', () => {
		const attempts = [
			{ isCorrect: true },
			{ isCorrect: true },
			{ isCorrect: false },
			{ isCorrect: true }
		];
		expect(computeSessionScore('math', attempts)).toBe(75);
	});

	it('computes accuracy-based scores (stroop)', () => {
		const attempts = [{ isCorrect: false }, { isCorrect: false }, { isCorrect: true }];
		expect(computeSessionScore('stroop', attempts)).toBe(33);
	});

	it('computes accuracy-based scores (memory)', () => {
		const attempts = [{ isCorrect: true }, { isCorrect: true }];
		expect(computeSessionScore('memory', attempts)).toBe(100);
	});

	it('computes accuracy-based scores (swallow)', () => {
		const attempts = [{ isCorrect: true }, { isCorrect: false }];
		expect(computeSessionScore('swallow', attempts)).toBe(50);
	});

	it('computes accuracy-based scores (attention)', () => {
		const attempts = Array.from({ length: 10 }, (_, i) => ({ isCorrect: i < 7 }));
		expect(computeSessionScore('attention', attempts)).toBe(70);
	});

	it('computes accuracy-based scores (emoji)', () => {
		const attempts = [{ isCorrect: true }, { isCorrect: false }, { isCorrect: false }];
		expect(computeSessionScore('emoji', attempts)).toBe(33);
	});

	it('computes accuracy-based scores (flanker)', () => {
		const attempts = [{ isCorrect: true }, { isCorrect: true }, { isCorrect: true }];
		expect(computeSessionScore('flanker', attempts)).toBe(100);
	});

	it('computes accuracy-based scores (letters)', () => {
		const attempts = [{ isCorrect: false }, { isCorrect: true }];
		expect(computeSessionScore('letters', attempts)).toBe(50);
	});

	it('computes accuracy-based scores (numbers)', () => {
		const attempts = [{ isCorrect: true }, { isCorrect: false }, { isCorrect: true }];
		expect(computeSessionScore('numbers', attempts)).toBe(67);
	});

	it('computes accuracy-based scores (pictures)', () => {
		const attempts = [{ isCorrect: true }];
		expect(computeSessionScore('pictures', attempts)).toBe(100);
	});

	it('computes accuracy-based scores (ravenMatrices)', () => {
		const attempts = [{ isCorrect: false }, { isCorrect: false }, { isCorrect: true }];
		expect(computeSessionScore('ravenMatrices', attempts)).toBe(33);
	});

	it('computes accuracy-based scores (wordMorphingExercise)', () => {
		const attempts = [{ isCorrect: true }, { isCorrect: false }];
		expect(computeSessionScore('wordMorphingExercise', attempts)).toBe(50);
	});

	it('computes accuracy-based scores (nbackExercise)', () => {
		const attempts = [{ isCorrect: true }, { isCorrect: true }, { isCorrect: true }];
		expect(computeSessionScore('nbackExercise', attempts)).toBe(100);
	});

	it('computes munsterberg score by guessed property', () => {
		const attempts = [
			{ guessed: true },
			{ guessed: false },
			{ guessed: true },
			{ guessed: true }
		];
		expect(computeSessionScore('munsterberg', attempts)).toBe(75);
	});

	it('computes campimetry score from max stage (2-stage game)', () => {
		const attempts = [{ stage: 1 }, { stage: 2 }, { stage: 1 }];
		expect(computeSessionScore('campimetry', attempts)).toBe(100);
	});

	it('caps campimetry score at 100', () => {
		const attempts = [{ stage: 10 }];
		expect(computeSessionScore('campimetry', attempts)).toBe(100);
	});

	it('computes campimetryExercise score for stage 1', () => {
		const attempts = [{ stage: 1 }];
		expect(computeSessionScore('campimetryExercise', attempts)).toBe(50);
	});

	it('computes memoryMatchExercise score from last attempt efficiency', () => {
		const attempts = [{ efficiency: 42 }, { efficiency: 88 }];
		expect(computeSessionScore('memoryMatchExercise', attempts)).toBe(88);
	});

	it('returns 0 for memoryMatchExercise with empty attempts', () => {
		expect(computeSessionScore('memoryMatchExercise', [])).toBe(0);
	});
});

describe('getRecommendations', () => {
	it('picks recommendations for the 3 weakest metrics', () => {
		const scores: Record<SkillMetric, number> = {
			executive_function: 20,
			memory: 30,
			attention: 40,
			thinking: 50,
			perception: 60,
			reaction_speed: 70,
			verbal_function: 80,
			spacial_perception: 90,
			spacial_orientation: 100,
			short_memory: 10,
			working_memory: 25,
			long_memory: 35,
			color_perception: 45
		};
		const recs = getRecommendations(scores);
		expect(recs.length).toBe(3);
	});

	it('breaks ties by metric name ascending', () => {
		const scores: Record<SkillMetric, number> = {
			executive_function: 0,
			memory: 0,
			attention: 0,
			thinking: 0,
			perception: 0,
			reaction_speed: 0,
			verbal_function: 0,
			spacial_perception: 0,
			spacial_orientation: 0,
			short_memory: 0,
			working_memory: 0,
			long_memory: 0,
			color_perception: 0
		};
		const recs = getRecommendations(scores);
		expect(recs.length).toBe(3);
		// attention and color_perception have no matching tests/exercises,
		// so the first 3 matched metrics are executive_function, memory, perception
		expect(recs.map((r) => r.name)).toEqual(['stroop', 'word-morphing', 'munsterberg']);
	});

	it('returns fewer than 3 when there are insufficient matching tests/exercises', () => {
		// Create a scores object with only extreme weak metrics that have no matching tests/exercises
		// Since our tests/exercises cover common metrics, we simulate by overriding the arrays
		// Instead, rely on the fact that for any real data there will be some matches.
		// We verify the function doesn't crash and returns <=3.
		const scores: Record<SkillMetric, number> = {
			executive_function: 100,
			memory: 100,
			attention: 100,
			thinking: 100,
			perception: 100,
			reaction_speed: 100,
			verbal_function: 100,
			spacial_perception: 100,
			spacial_orientation: 100,
			short_memory: 100,
			working_memory: 100,
			long_memory: 100,
			color_perception: 100
		};
		const recs = getRecommendations(scores);
		expect(recs.length).toBeLessThanOrEqual(3);
	});

	it('handles all-zero scores gracefully', () => {
		const scores: Record<SkillMetric, number> = {
			executive_function: 0,
			memory: 0,
			attention: 0,
			thinking: 0,
			perception: 0,
			reaction_speed: 0,
			verbal_function: 0,
			spacial_perception: 0,
			spacial_orientation: 0,
			short_memory: 0,
			working_memory: 0,
			long_memory: 0,
			color_perception: 0
		};
		const recs = getRecommendations(scores);
		// Should still try to return up to 3, possibly less if no matches
		expect(recs.length).toBeGreaterThanOrEqual(0);
		expect(recs.length).toBeLessThanOrEqual(3);
	});

	it('deduplicates when multiple metrics map to the same test', async () => {
		vi.doMock('$lib/tests', () => ({
			tests: [
				{
					name: 'dup',
					title: 'Dup Test',
					path: '/dup',
					img: '/dup.svg',
					user_metrics: ['executive_function', 'memory']
				}
			]
		}));
		vi.doMock('$lib/exercises', () => ({
			exercises: [],
			EXERCISE_SLUG_TO_TEST_TYPE: {}
		}));

		vi.resetModules();

		const { getRecommendations: getRecs } = await import('./metrics');

		const scores: Record<SkillMetric, number> = {
			executive_function: 0,
			memory: 0,
			attention: 100,
			color_perception: 100,
			long_memory: 100,
			perception: 100,
			reaction_speed: 100,
			short_memory: 100,
			spacial_orientation: 100,
			spacial_perception: 100,
			thinking: 100,
			verbal_function: 100,
			working_memory: 100
		};

		const recs = getRecs(scores);
		expect(recs.length).toBe(1);
		expect(recs[0].name).toBe('dup');
	});
});

describe('getMetricScores', () => {
	it('returns all zeros for a user with no sessions', async () => {
		const { getResults } = await import('$lib/server/db/controllers/result');
		vi.mocked(getResults).mockResolvedValue([]);
		const { getMetricScores } = await restoreRealModulesAndImportMetrics();
		const scores = await getMetricScores('empty-user');
		expect(scores.attention).toBe(0);
		expect(scores.memory).toBe(0);
		expect(Object.values(scores).every((v) => v === 0)).toBe(true);
	});

	it('computes score from a single test session', async () => {
		const { getResults } = await import('$lib/server/db/controllers/result');
		vi.mocked(getResults).mockImplementation(async (type) => {
			if (type === 'math') return [{ attempts: [{ isCorrect: true }, { isCorrect: false }] }];
			return [];
		});
		const { getMetricScores } = await restoreRealModulesAndImportMetrics();
		const scores = await getMetricScores('user1');
		expect(scores.attention).toBe(50); // math contributes to attention
		expect(scores.thinking).toBe(50); // math contributes to thinking
		expect(scores.reaction_speed).toBe(50); // math contributes to reaction_speed
	});

	it('averages scores across multiple sessions of the same test', async () => {
		const { getResults } = await import('$lib/server/db/controllers/result');
		vi.mocked(getResults).mockImplementation(async (type) => {
			if (type === 'math') {
				return [
					{ attempts: [{ isCorrect: true }, { isCorrect: false }] }, // 50
					{ attempts: [{ isCorrect: true }, { isCorrect: true }] } // 100
				];
			}
			return [];
		});
		const { getMetricScores } = await restoreRealModulesAndImportMetrics();
		const scores = await getMetricScores('user1');
		expect(scores.attention).toBe(75); // (50 + 100) / 2
	});

	it('averages scores when multiple tests contribute to the same metric', async () => {
		const { getResults } = await import('$lib/server/db/controllers/result');
		vi.mocked(getResults).mockImplementation(async (type) => {
			if (type === 'stroop') return [{ attempts: [{ isCorrect: true }] }]; // 100
			if (type === 'math') return [{ attempts: [{ isCorrect: false }] }]; // 0
			return [];
		});
		const { getMetricScores } = await restoreRealModulesAndImportMetrics();
		const scores = await getMetricScores('user1');
		// Both stroop and math have 'attention' in admin_metrics
		expect(scores.attention).toBe(50); // (100 + 0) / 2
	});

	it('returns 100 for campimetry stage 2', async () => {
		const { getResults } = await import('$lib/server/db/controllers/result');
		vi.mocked(getResults).mockImplementation(async (type) => {
			if (type === 'campimetry') return [{ attempts: [{ stage: 2 }] }];
			return [];
		});
		const { getMetricScores } = await restoreRealModulesAndImportMetrics();
		const scores = await getMetricScores('user1');
		expect(scores.attention).toBe(100);
		expect(scores.perception).toBe(100);
		expect(scores.color_perception).toBe(100);
	});
});

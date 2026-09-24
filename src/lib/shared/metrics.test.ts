import { describe, it, expect, vi, afterEach } from 'vitest';
import { computeSessionScore, getRecommendations } from './metrics';
import type { MetricScores } from './metrics';
import type { SkillMetric } from '$lib/types';
import { SKILL_METRICS } from './metricShares';

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

// Страховка от утечки doMock-реестров: любой тест, замокавший $lib/tests или
// $lib/exercises, освобождает мок даже при падении до конца тела it().
// doUnmock на незамоканном модуле — безопасный no-op. НЕ vi.unmockAll():
// он снесёт и top-level vi.mock('$lib/server/db/controllers/result').
afterEach(() => {
	vi.doUnmock('$lib/tests');
	vi.doUnmock('$lib/exercises');
});

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
			reaction_speed: 70,
			verbal_function: 80,
			spacial_perception: 90,
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
			reaction_speed: 0,
			verbal_function: 0,
			spacial_perception: 0,
			short_memory: 0,
			working_memory: 0,
			long_memory: 0,
			color_perception: 0
		};
		const recs = getRecommendations(scores);
		expect(recs.length).toBe(3);
		// All metrics are equally weak; ties break by metric name ascending.
		// attention → munsterberg, color_perception → campimetry, executive_function → stroop.
		expect(recs.map((r) => r.name)).toEqual(['munsterberg', 'campimetry', 'stroop']);
	});

	it('returns an empty array when no tests feed any metric', async () => {
		// Пустые реестры: ни одна из 11 метрик не имеет фидера → 0 рекомендаций.
		vi.doMock('$lib/tests', () => ({ tests: [] }));
		vi.doMock('$lib/exercises', () => ({ exercises: [], EXERCISE_SLUG_TO_TEST_TYPE: {} }));

		vi.resetModules();

		const { getRecommendations: getRecs } = await import('./metrics');

		const scores: Record<SkillMetric, number> = {
			executive_function: 100,
			memory: 100,
			attention: 100,
			thinking: 100,
			reaction_speed: 100,
			verbal_function: 100,
			spacial_perception: 100,
			short_memory: 100,
			working_memory: 100,
			long_memory: 100,
			color_perception: 100
		};

		const recs = getRecs(scores);
		expect(recs).toHaveLength(0);
		// Очистку doMock-реестров выполняет глобальный afterEach.
	});

	it('handles all-zero scores gracefully', () => {
		const scores: Record<SkillMetric, number> = {
			executive_function: 0,
			memory: 0,
			attention: 0,
			thinking: 0,
			reaction_speed: 0,
			verbal_function: 0,
			spacial_perception: 0,
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
			reaction_speed: 100,
			short_memory: 100,
			spacial_perception: 100,
			thinking: 100,
			verbal_function: 100,
			working_memory: 100
		};

		const recs = getRecs(scores);
		expect(recs.length).toBe(1);
		expect(recs[0].name).toBe('dup');
	});

	it('never recommends articles, only tests and exercises', () => {
		const scores: Record<SkillMetric, number> = {
			executive_function: 0,
			memory: 0,
			attention: 0,
			thinking: 0,
			reaction_speed: 0,
			verbal_function: 0,
			spacial_perception: 0,
			short_memory: 0,
			working_memory: 0,
			long_memory: 0,
			color_perception: 0
		};
		const recs = getRecommendations(scores);
		// Статьи отвязаны от метрик: рекомендации — только тесты и упражнения.
		for (const rec of recs) {
			expect(rec.path).not.toContain('/materials/');
		}
	});
});

describe('getUserMetricScores', () => {
	const USER_METRIC_KEYS = [
		'executive_function',
		'attention',
		'color_perception',
		'reaction_speed',
		'spacial_perception',
		'memory'
	] as const;

	function session(attempts: Array<{ isCorrect?: boolean; guessed?: boolean; stage?: number }>) {
		return [{ sessionId: 's1', createdAt: new Date().toISOString(), attempts }];
	}

	it('returns exactly 6 user metric keys in the canonical order', async () => {
		const { getResults } = await import('$lib/server/db/controllers/result');
		vi.mocked(getResults).mockResolvedValue([]);
		const { getUserMetricScores } = await restoreRealModulesAndImportMetrics();
		const scores = await getUserMetricScores('empty-user');
		expect(Object.keys(scores)).toEqual([...USER_METRIC_KEYS]);
	});

	it('returns all zeros for a user with no sessions', async () => {
		const { getResults } = await import('$lib/server/db/controllers/result');
		vi.mocked(getResults).mockResolvedValue([]);
		const { getUserMetricScores } = await restoreRealModulesAndImportMetrics();
		const scores = await getUserMetricScores('empty-user');
		expect(Object.values(scores).every((v) => v === 0)).toBe(true);
		expect(Object.values(scores)).toHaveLength(6);
	});

	it('direct metric: averages munsterberg sessions into user attention', async () => {
		const { getResults } = await import('$lib/server/db/controllers/result');
		vi.mocked(getResults).mockImplementation(async (type) => {
			if (type === 'munsterberg') {
				return [
					{
						sessionId: 's1',
						createdAt: new Date().toISOString(),
						attempts: [
							{ guessed: true },
							{ guessed: true },
							{ guessed: true },
							{ guessed: false },
							{ guessed: false }
						]
					}, // 60
					{
						sessionId: 's2',
						createdAt: new Date().toISOString(),
						attempts: [
							{ guessed: true },
							{ guessed: true },
							{ guessed: true },
							{ guessed: true },
							{ guessed: false }
						]
					} // 80
				];
			}
			return [];
		});
		const { getUserMetricScores } = await restoreRealModulesAndImportMetrics();
		const scores = await getUserMetricScores('user1');
		expect(scores.attention).toBe(70); // (60 + 80) / 2
	});

	it('direct metric: math sessions feed user reaction_speed', async () => {
		const { getResults } = await import('$lib/server/db/controllers/result');
		vi.mocked(getResults).mockImplementation(async (type) => {
			if (type === 'math')
				return session([
					{ isCorrect: true },
					{ isCorrect: true },
					{ isCorrect: true },
					{ isCorrect: true },
					{ isCorrect: false }
				]); // 80
			return [];
		});
		const { getUserMetricScores } = await restoreRealModulesAndImportMetrics();
		const scores = await getUserMetricScores('user1');
		expect(scores.reaction_speed).toBe(80);
	});

	// Контролируемые реестры: админские working/short/long разведены по разным
	// тестам/упражнениям, чтобы точно задать входы композита memory.
	function mockCompositeRegistries() {
		vi.doMock('$lib/tests', () => ({
			tests: [
				{
					name: 'memory',
					title: 'Memory',
					path: '/tests/memory/about',
					img: '/tests/memory1.svg',
					admin_metrics: [],
					user_metrics: ['memory']
				},
				{
					name: 'swallow',
					title: 'Swallow',
					path: '/tests/swallow/about',
					img: '/tests/swallow1.svg',
					admin_metrics: ['working_memory'],
					user_metrics: []
				},
				{
					name: 'flanker',
					title: 'Flanker',
					path: '/tests/flanker/about',
					img: '/tests/flanker1.svg',
					admin_metrics: ['short_memory'],
					user_metrics: []
				}
			]
		}));
		vi.doMock('$lib/exercises', () => ({
			exercises: [
				{
					name: 'long-ex',
					title: 'Long',
					path: '/exercises/long-ex/about',
					img: '/exercises/long-ex1.svg',
					admin_metrics: ['long_memory'],
					user_metrics: []
				}
			],
			EXERCISE_SLUG_TO_TEST_TYPE: { 'long-ex': 'wordMorphingExercise' }
		}));
	}

	function accuracySession(correct: number, total: number) {
		return session(Array.from({ length: total }, (_, i) => ({ isCorrect: i < correct })));
	}

	it('composite memory = round(mean(admin working/short/long)); direct memory sessions ignored', async () => {
		const { getResults } = await import('$lib/server/db/controllers/result');
		mockCompositeRegistries();
		vi.mocked(getResults).mockImplementation(async (type) => {
			// working_memory=60, short_memory=70, long_memory=80 → memory=70
			if (type === 'swallow') return accuracySession(3, 5); // 60
			if (type === 'flanker') return accuracySession(7, 10); // 70
			if (type === 'wordMorphingExercise') return accuracySession(8, 10); // 80
			if (type === 'memory') return accuracySession(5, 5); // 100 — прямой вклад должен быть проигнорирован
			return [];
		});
		vi.resetModules();
		const { getUserMetricScores } = await import('./metrics');
		const scores = await getUserMetricScores('user1');
		expect(scores.memory).toBe(70); // (60 + 70 + 80) / 3, не 100 от прямой сессии
	});

	it('composite memory rounds the mean (60, 61, 62 → 61)', async () => {
		const { getResults } = await import('$lib/server/db/controllers/result');
		mockCompositeRegistries();
		vi.mocked(getResults).mockImplementation(async (type) => {
			if (type === 'swallow') return accuracySession(60, 100); // working=60
			if (type === 'flanker') return accuracySession(61, 100); // short=61
			if (type === 'wordMorphingExercise') return accuracySession(62, 100); // long=62
			return [];
		});
		vi.resetModules();
		const { getUserMetricScores } = await import('./metrics');
		const scores = await getUserMetricScores('user1');
		expect(scores.memory).toBe(61);
	});

	it('uses precomputed adminScores for the memory composite without admin collection', async () => {
		const { getResults } = await import('$lib/server/db/controllers/result');
		mockCompositeRegistries();
		vi.mocked(getResults).mockImplementation(async () => []);
		vi.resetModules();
		const { getUserMetricScores } = await import('./metrics');

		const adminScores: MetricScores = {
			executive_function: 0,
			attention: 0,
			thinking: 0,
			reaction_speed: 0,
			verbal_function: 0,
			spacial_perception: 0,
			working_memory: 60,
			short_memory: 70,
			long_memory: 80,
			color_perception: 0,
			memory: 0
		};
		const scores = await getUserMetricScores('user1', adminScores);

		// Композит из переданных adminScores: round((60 + 70 + 80) / 3) = 70.
		expect(scores.memory).toBe(70);
		// Админ-сбор не выполнялся: getResults звался только для user-фидеров
		// (в mockCompositeRegistries единственный user-фидер — тест 'memory').
		const calledTypes = vi.mocked(getResults).mock.calls.map(([type]) => type);
		expect(calledTypes).toEqual(['memory']);
	});

	it('without adminScores collects admin scores internally', async () => {
		const { getResults } = await import('$lib/server/db/controllers/result');
		mockCompositeRegistries();
		vi.mocked(getResults).mockImplementation(async (type) => {
			// user-фидер: тест 'memory' → 100 (прямой вклад в memory игнорируется).
			if (type === 'memory') return accuracySession(5, 5); // 100
			// admin-фидеры композита: working=60, short=70, long=80.
			if (type === 'swallow') return accuracySession(3, 5); // 60
			if (type === 'flanker') return accuracySession(7, 10); // 70
			if (type === 'wordMorphingExercise') return accuracySession(8, 10); // 80
			return [];
		});
		vi.resetModules();
		const { getUserMetricScores } = await import('./metrics');

		// Второй аргумент не передан — adminScores собираются внутренним getMetricScores.
		const scores = await getUserMetricScores('user1');

		// Админ-сбор состоялся: getResults звался и для user-фидера,
		// и для всех admin-фидеров из mockCompositeRegistries.
		const calledTypes = vi.mocked(getResults).mock.calls.map(([type]) => type);
		expect(calledTypes).toContain('memory');
		expect(calledTypes).toContain('swallow');
		expect(calledTypes).toContain('flanker');
		expect(calledTypes).toContain('wordMorphingExercise');
		// Композит memory посчитан из админ-фидеров: round((60 + 70 + 80) / 3) = 70,
		// прямая memory-сессия (100) не участвует.
		expect(scores.memory).toBe(70);
	});
});

describe('getMetricScores', () => {
	it('returns keys in SKILL_METRICS order', async () => {
		const { getResults } = await import('$lib/server/db/controllers/result');
		vi.mocked(getResults).mockResolvedValue([]);
		const { getMetricScores } = await restoreRealModulesAndImportMetrics();
		const scores = await getMetricScores('empty-user');
		expect(Object.keys(scores)).toEqual(SKILL_METRICS);
	});

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
			if (type === 'math')
				return [
					{
						sessionId: 's1',
						createdAt: new Date().toISOString(),
						attempts: [{ isCorrect: true }, { isCorrect: false }]
					}
				];
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
					{
						sessionId: 's1',
						createdAt: new Date().toISOString(),
						attempts: [{ isCorrect: true }, { isCorrect: false }]
					}, // 50
					{
						sessionId: 's2',
						createdAt: new Date().toISOString(),
						attempts: [{ isCorrect: true }, { isCorrect: true }]
					} // 100
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
			if (type === 'stroop')
				return [
					{
						sessionId: 's1',
						createdAt: new Date().toISOString(),
						attempts: [{ isCorrect: true }]
					}
				]; // 100
			if (type === 'math')
				return [
					{
						sessionId: 's1',
						createdAt: new Date().toISOString(),
						attempts: [{ isCorrect: false }]
					}
				]; // 0
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
			if (type === 'campimetry')
				return [
					{
						sessionId: 's1',
						createdAt: new Date().toISOString(),
						attempts: [{ stage: 2 }]
					}
				];
			return [];
		});
		const { getMetricScores } = await restoreRealModulesAndImportMetrics();
		const scores = await getMetricScores('user1');
		expect(scores.attention).toBe(100);
		expect(scores.color_perception).toBe(100);
	});
});

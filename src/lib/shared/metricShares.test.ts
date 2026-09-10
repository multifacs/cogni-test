import { describe, it, expect } from 'vitest';
import { getMetricShares, SKILL_METRICS, metricColor } from './metricShares';
import type { SkillMetric } from '$lib/types';

describe('SKILL_METRICS', () => {
	it('contains exactly 13 metrics in a stable order', () => {
		expect(SKILL_METRICS).toHaveLength(13);
		expect(new Set(SKILL_METRICS).size).toBe(13);
	});
});

describe('getMetricShares', () => {
	it('returns empty array when total score is zero', () => {
		const scores = Object.fromEntries(SKILL_METRICS.map((m) => [m, 0])) as Record<
			SkillMetric,
			number
		>;
		expect(getMetricShares(scores)).toEqual([]);
	});

	it('returns shares ordered by SKILL_METRICS', () => {
		const scores: Record<SkillMetric, number> = {
			executive_function: 10,
			memory: 20,
			attention: 30,
			thinking: 40,
			perception: 50,
			reaction_speed: 60,
			verbal_function: 70,
			spacial_perception: 80,
			spacial_orientation: 90,
			short_memory: 100,
			working_memory: 110,
			long_memory: 120,
			color_perception: 130
		};
		const result = getMetricShares(scores);
		expect(result.map((r) => r.metric)).toEqual(SKILL_METRICS);
	});

	it('normalizes shares so they sum to 1', () => {
		const scores: Record<SkillMetric, number> = {
			executive_function: 10,
			memory: 20,
			attention: 30,
			thinking: 40,
			perception: 50,
			reaction_speed: 60,
			verbal_function: 70,
			spacial_perception: 80,
			spacial_orientation: 90,
			short_memory: 100,
			working_memory: 110,
			long_memory: 120,
			color_perception: 130
		};
		const result = getMetricShares(scores);
		const totalShare = result.reduce((sum, r) => sum + r.share, 0);
		expect(totalShare).toBeCloseTo(1, 10);
	});

	it('returns correct share values for simple input', () => {
		const scores: Record<SkillMetric, number> = Object.fromEntries(
			SKILL_METRICS.map((m) => [m, m === 'memory' ? 25 : 0])
		) as Record<SkillMetric, number>;
		const result = getMetricShares(scores);
		const memoryEntry = result.find((r) => r.metric === 'memory');
		expect(memoryEntry).toBeDefined();
		expect(memoryEntry!.share).toBe(1);
		expect(memoryEntry!.score).toBe(25);
	});

	it('ignores metrics not in SKILL_METRICS', () => {
		const scores = {
			executive_function: 50,
			memory: 50,
			unknown_metric: 999
		} as unknown as Record<SkillMetric, number>;
		const result = getMetricShares(scores);
		expect(result.map((r) => r.metric)).not.toContain('unknown_metric' as SkillMetric);
	});
});

describe('metricColor', () => {
	it('returns a hex color string for every metric', () => {
		for (const metric of SKILL_METRICS) {
			const color = metricColor(metric);
			expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
		}
	});

	it('returns stable colors across repeated calls', () => {
		for (const metric of SKILL_METRICS) {
			expect(metricColor(metric)).toBe(metricColor(metric));
		}
	});

	it('assigns a unique color to each metric', () => {
		const colors = SKILL_METRICS.map((m) => metricColor(m));
		expect(new Set(colors).size).toBe(SKILL_METRICS.length);
	});
});

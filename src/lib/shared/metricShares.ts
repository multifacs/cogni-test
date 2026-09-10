import type { SkillMetric } from '$lib/types';

/**
 * Единственный источник порядка метрик для UI и нормализации.
 * Дублирование списка из getMetricScores (metrics.ts) исключено —
 * будущие потребители импортируют SKILL_METRICS отсюда.
 */
export const SKILL_METRICS: SkillMetric[] = [
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

export type MetricShare = {
	metric: SkillMetric;
	score: number;
	share: number;
};

/**
 * Превращает сырые баллы метрик в упорядоченный массив долей.
 *
 * - Порядок фиксирован: SKILL_METRICS.
 * - share = score_i / Σscore.
 * - Если Σscore === 0 → пустой массив (сигнал заглушки для UI).
 */
export function getMetricShares(metricScores: Record<SkillMetric, number>): MetricShare[] {
	const total = SKILL_METRICS.reduce((sum, m) => sum + (metricScores[m] ?? 0), 0);
	if (total === 0) return [];

	return SKILL_METRICS.map((metric) => ({
		metric,
		score: metricScores[metric] ?? 0,
		share: (metricScores[metric] ?? 0) / total
	}));
}

/** Пастельная палитра, гармонирующая с системой «Мягкое стекло». */
const METRIC_COLORS: Record<SkillMetric, string> = {
	executive_function: '#b8c5e8',
	memory: '#a8d5b9',
	attention: '#f5b8ae',
	thinking: '#e8c4a2',
	perception: '#d4b8e8',
	reaction_speed: '#b3d0f5',
	verbal_function: '#f5d68a',
	spacial_perception: '#a2d8d4',
	spacial_orientation: '#e8b8c8',
	short_memory: '#c8e8b8',
	working_memory: '#b8d4e8',
	long_memory: '#e8d4b8',
	color_perception: '#d8b8a8'
};

/**
 * Стабильный детерминированный цвет для метрики.
 * НЕ случайный — одинаковый при каждом рендере.
 */
export function metricColor(metric: SkillMetric): string {
	const color = METRIC_COLORS[metric];
	if (!color) {
		throw new Error(`Unknown metric: ${metric}`);
	}
	return color;
}

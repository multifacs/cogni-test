import { render, cleanup } from 'vitest-browser-svelte';
import { screen } from '@testing-library/dom';
import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MetricsDonutCard from './MetricsDonutCard.svelte';

import '../../../app.css';

const mockGoto = vi.fn();
vi.mock('$app/navigation', () => ({
	goto: (path: string) => mockGoto(path)
}));

import type { SkillMetric } from '$lib/types';
import { SKILL_METRICS, metricColor } from '$lib/shared/metricShares';

function scoresFor(values: number[]): Record<SkillMetric, number> {
	return Object.fromEntries(SKILL_METRICS.map((m, i) => [m, values[i] ?? 0])) as Record<
		SkillMetric,
		number
	>;
}

afterEach(cleanup);

describe('MetricsDonutCard', () => {
	it('(a) renders placeholder when metric scores sum to zero', async () => {
		const zeroScores = scoresFor(new Array(13).fill(0));
		const { container } = await render(MetricsDonutCard, {
			props: { metricScores: zeroScores, hasData: false }
		});
		expect(container.textContent).toContain('Данных по метрикам нет');
		expect(container.querySelectorAll('circle')).toHaveLength(0);
	});

	it('(b) renders sectors only for share>0 metrics, in SKILL_METRICS order, with metricColor fills', async () => {
		const values = new Array(13).fill(0);
		values[0] = 10; // executive_function
		values[1] = 20; // memory
		values[2] = 0; // attention
		values[3] = 10; // thinking
		const scores = scoresFor(values);
		const { container } = await render(MetricsDonutCard, {
			props: { metricScores: scores, hasData: true }
		});
		const circles = container.querySelectorAll('circle');
		expect(circles).toHaveLength(3);

		const expectedFills = [
			metricColor('executive_function'),
			metricColor('memory'),
			metricColor('thinking')
		];
		circles.forEach((circle, i) => {
			expect(circle.getAttribute('stroke')).toBe(expectedFills[i]);
			const dash = circle.getAttribute('stroke-dasharray') ?? '0 0';
			const [part] = dash.split(' ');
			expect(parseFloat(part)).toBeGreaterThan(0);
		});
	});

	it('(c) click triggers goto("/metrics")', async () => {
		mockGoto.mockClear();
		const zeroScores = scoresFor(new Array(13).fill(0));
		const { container } = await render(MetricsDonutCard, {
			props: { metricScores: zeroScores, hasData: false }
		});
		const link = container.querySelector('a')!;
		const event = new MouseEvent('click', { cancelable: true, bubbles: true });
		link.dispatchEvent(event);
		expect(mockGoto).toHaveBeenCalledTimes(1);
		expect(mockGoto).toHaveBeenCalledWith(expect.stringMatching(/\metrics$/));
	});

	it('(d) Enter key triggers navigation', async () => {
		mockGoto.mockClear();
		const zeroScores = scoresFor(new Array(13).fill(0));
		const { container } = await render(MetricsDonutCard, {
			props: { metricScores: zeroScores, hasData: false }
		});
		const link = container.querySelector('a')!;
		link.focus();
		await userEvent.keyboard('{Enter}');
		expect(mockGoto).toHaveBeenCalledTimes(1);
		expect(mockGoto).toHaveBeenCalledWith(expect.stringMatching(/\metrics$/));
	});

	it('(e) sector count and geometry are consistent with share>0 metrics', async () => {
		const values = new Array(13).fill(0);
		values[5] = 5; // reaction_speed
		values[7] = 15; // spacial_perception
		values[12] = 30; // color_perception
		const scores = scoresFor(values);
		const { container } = await render(MetricsDonutCard, {
			props: { metricScores: scores, hasData: true }
		});
		const circles = container.querySelectorAll('circle');
		expect(circles).toHaveLength(3);
		let totalSeen = 0;
		circles.forEach((circle) => {
			const dash = circle.getAttribute('stroke-dasharray') ?? '0 0';
			const [seg, total] = dash.split(' ').map(Number);
			expect(seg).toBeGreaterThan(0);
			expect(total).toBeGreaterThan(0);
			expect(circle.getAttribute('r')).toBe('36');
			expect(circle.getAttribute('stroke-width')).toBe('20');
			totalSeen += seg;
		});
		expect(totalSeen).toBeCloseTo(2 * Math.PI * 36, 4);
	});
});

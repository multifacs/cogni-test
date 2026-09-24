import { render, cleanup } from 'vitest-browser-svelte';
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
		const zeroScores = scoresFor(new Array(11).fill(0));
		const { container } = await render(MetricsDonutCard, {
			props: { metricScores: zeroScores, hasData: false }
		});
		expect(container.textContent).toContain('Данных по метрикам нет');
		expect(container.querySelectorAll('circle')).toHaveLength(0);
	});

	it('(b) renders sectors only for share>0 metrics, in SKILL_METRICS order, with metricColor fills', async () => {
		const values = new Array(11).fill(0);
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
		const zeroScores = scoresFor(new Array(11).fill(0));
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
		const zeroScores = scoresFor(new Array(11).fill(0));
		const { container } = await render(MetricsDonutCard, {
			props: { metricScores: zeroScores, hasData: false }
		});
		const link = container.querySelector('a')!;
		link.focus();
		await userEvent.keyboard('{Enter}');
		expect(mockGoto).toHaveBeenCalledTimes(1);
		expect(mockGoto).toHaveBeenCalledWith(expect.stringMatching(/\metrics$/));
	});

	it('(e) interactive element has descriptive aria-label', async () => {
		const zeroScores = scoresFor(new Array(11).fill(0));
		const { container } = await render(MetricsDonutCard, {
			props: { metricScores: zeroScores, hasData: false }
		});
		const link = container.querySelector('a')!;
		expect(link.getAttribute('aria-label')).toBe('Открыть раздел Метрики');
	});

	it('(f) sector count and geometry are consistent with share>0 metrics', async () => {
		const values = new Array(11).fill(0);
		values[4] = 5; // reaction_speed
		values[6] = 15; // spacial_perception
		values[10] = 30; // color_perception
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

	it('(g) legend shows score as NN/100, tooltip as — NN%; not share-based', async () => {
		// values[4]=10, values[6]=20, values[10]=40 → scores 10/20/40,
		// shares ~14/29/57. Share-based legend would render "14/100",
		// "29/100", "57/100" — none of which may match below.
		const values = new Array(11).fill(0);
		values[4] = 10; // reaction_speed → score 10, share ~14
		values[6] = 20; // spacial_perception → score 20, share ~29
		values[10] = 40; // color_perception → score 40, share ~57
		const scores = scoresFor(values);
		const { container } = await render(MetricsDonutCard, {
			props: { metricScores: scores, hasData: true }
		});

		// Legend: absolute score as NN/100 (textContent also contains <title>
		// text "— NN%", so these substring asserts stay collision-free).
		const text = container.textContent ?? '';
		expect(text).toContain('10/100');
		expect(text).toContain('20/100');
		expect(text).toContain('40/100');
		// A share-based legend regression would produce these instead.
		expect(text).not.toContain('14/100');
		expect(text).not.toContain('29/100');
		expect(text).not.toContain('57/100');

		// SVG tooltip: "— NN%".
		const titles = [...container.querySelectorAll('circle > title')];
		expect(titles).toHaveLength(3);
		const titleTexts = titles.map((t) => t.textContent ?? '');
		expect(titleTexts.some((t) => t.endsWith('— 10%'))).toBe(true);
		expect(titleTexts.some((t) => t.endsWith('— 20%'))).toBe(true);
		expect(titleTexts.some((t) => t.endsWith('— 40%'))).toBe(true);
	});
});

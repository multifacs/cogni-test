import { render, cleanup } from 'vitest-browser-svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import localforage from 'localforage';
import Page from './+page.svelte';

// app.css подключает Tailwind — без него утилиты не сгенерируются
// в тестовом окружении, и trusted-клик может промахиваться по мишеням
import '../../../app.css';

import type { SkillMetric } from '$lib/types';
import { SKILL_METRICS } from '$lib/shared/metricShares';

// ─── Хоистированные моки ──────────────────────────────────────────────

const navMocks = vi.hoisted(() => ({
	goto: vi.fn<[(string | URL)?], Promise<void>>(() => Promise.resolve()),
	resolve: vi.fn<[string], string>((path: string) => path)
}));

// ─── Моки ─────────────────────────────────────────────────────────────

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => navMocks.goto(...(args as [string]))
}));

vi.mock('$app/paths', () => ({
	resolve: (path: string) => navMocks.resolve(path)
}));

vi.mock('$app/environment', () => ({
	browser: true
}));

// ─── Фикстуры ─────────────────────────────────────────────────────────

function scoresFor(values: number[]): Record<SkillMetric, number> {
	return Object.fromEntries(SKILL_METRICS.map((m, i) => [m, values[i] ?? 0])) as Record<
		SkillMetric,
		number
	>;
}

function makeData(
	options: {
		hasData?: boolean;
		hasUnfinishedTests?: boolean;
		loggedInAdmin?: string;
		predictedAge?: number | null;
	} = {}
) {
	return {
		recommendations: [],
		metricScores:
			options.hasData !== false
				? scoresFor([10, 20, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0])
				: scoresFor(new Array(13).fill(0)),
		hasData: options.hasData !== false,
		hasUnfinishedTests: options.hasUnfinishedTests ?? false,
		loggedInAdmin: options.loggedInAdmin,
		predictedAge: options.predictedAge ?? null
	};
}

// ─── Хелперы ──────────────────────────────────────────────────────────

async function mountPage(data: ReturnType<typeof makeData>) {
	const result = await render(Page, { props: { data } });
	// onMount с await localforage... выполняется асинхронно;
	// даём достаточно времени на отработку микрозадач и рендер
	await new Promise((r) => requestAnimationFrame(() => r(undefined)));
	await new Promise((r) => setTimeout(r, 80));
	return result;
}

// ─── Хуки ─────────────────────────────────────────────────────────────

beforeEach(async () => {
	await localforage.clear();
	navMocks.goto.mockClear();
	navMocks.resolve.mockClear();
});

afterEach(async () => {
	cleanup();
	vi.clearAllMocks();
	await localforage.clear();
});

// ─── Тесты ────────────────────────────────────────────────────────────

describe('/home page — MetricsDonutCard integration', () => {
	it('renders donut sectors when hasData is true and scores are non-zero', async () => {
		const data = makeData({ hasData: true });
		const { container } = await mountPage(data);

		const circles = container.querySelectorAll('circle');
		expect(circles.length).toBeGreaterThan(0);
	});

	it('renders placeholder when hasData is false', async () => {
		const data = makeData({ hasData: false });
		const { container } = await mountPage(data);

		expect(container.textContent).toContain('Данных по метрикам нет');
		expect(container.querySelectorAll('circle')).toHaveLength(0);
	});

	it('renders placeholder when hasData is true but all scores are zero', async () => {
		const data = makeData({ hasData: true });
		data.metricScores = scoresFor(new Array(13).fill(0));
		const { container } = await mountPage(data);

		expect(container.textContent).toContain('Данных по метрикам нет');
		expect(container.querySelectorAll('circle')).toHaveLength(0);
	});

	it('shows undiagnosed branch when hasUnfinishedTests and not admin', async () => {
		const data = makeData({ hasUnfinishedTests: true, loggedInAdmin: undefined });
		const { container } = await mountPage(data);

		expect(container.textContent).toContain('Пройдите начальную диагностику');
	});
});

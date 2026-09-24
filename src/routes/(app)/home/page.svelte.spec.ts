import { render, cleanup } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import localforage from 'localforage';
import Page from './+page.svelte';

// app.css подключает Tailwind — без него утилиты не сгенерируются
// в тестовом окружении, и trusted-клик может промахиваться по мишеням
import '../../../app.css';

import type { SkillMetric } from '$lib/types';
import { streaming } from '$lib/stores/streaming.svelte';

// ─── Хоистированные моки ──────────────────────────────────────────────

const navMocks = vi.hoisted(() => ({
	goto: vi.fn<(path: string) => Promise<void>>(() => Promise.resolve()),
	resolve: vi.fn<(path: string) => string>((path: string) => path)
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

// /home подаёт в донат 6 ПОЛЬЗОВАТЕЛЬСКИХ метрик (остальные читаются как 0)
const USER_METRIC_KEYS = [
	'executive_function',
	'attention',
	'color_perception',
	'reaction_speed',
	'spacial_perception',
	'memory'
] as const;

function scoresFor(values: number[]): Partial<Record<SkillMetric, number>> {
	return Object.fromEntries(USER_METRIC_KEYS.map((m, i) => [m, values[i] ?? 0]));
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
				? scoresFor([10, 20, 0, 5, 0, 0])
				: scoresFor(new Array(6).fill(0)),
		hasData: options.hasData !== false,
		hasUnfinishedTests: options.hasUnfinishedTests ?? false,
		loggedInAdmin: options.loggedInAdmin,
		predictedAge: options.predictedAge ?? null
	};
}

// ─── Хелперы ──────────────────────────────────────────────────────────

async function mountPage(data: ReturnType<typeof makeData>) {
	const result = await render(Page, { props: { data: data as never } });
	// onMount с await localforage... выполняется асинхронно;
	// даём достаточно времени на отработку микрозадач и рендер
	await new Promise((r) => requestAnimationFrame(() => r(undefined)));
	await new Promise((r) => setTimeout(r, 80));
	return result;
}

// ─── Хуки ─────────────────────────────────────────────────────────────

beforeEach(async () => {
	await localforage.clear();
	streaming.pendingStart = false; // сброс in-memory store между тестами
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
		data.metricScores = scoresFor(new Array(6).fill(0));
		const { container } = await mountPage(data);

		expect(container.textContent).toContain('Данных по метрикам нет');
		expect(container.querySelectorAll('circle')).toHaveLength(0);
	});

	it('shows undiagnosed branch when hasUnfinishedTests and not admin', async () => {
		const data = makeData({ hasUnfinishedTests: true, loggedInAdmin: undefined });
		const { container } = await mountPage(data);

		expect(container.textContent).toContain('Пройдите начальную диагностику');
	});

	it('клик «Пройти диагностику» ставит streaming.pendingStart и уходит на /tests', async () => {
		const data = makeData({ hasUnfinishedTests: true, loggedInAdmin: undefined });
		await mountPage(data);

		expect(streaming.pendingStart).toBe(false);

		await page.getByRole('button', { name: 'Пройти диагностику' }).click();

		expect(streaming.pendingStart).toBe(true);
		expect(navMocks.goto).toHaveBeenCalledTimes(1);
		expect(navMocks.goto).toHaveBeenCalledWith('/tests');
	});
});

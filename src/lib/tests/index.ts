import type { TestType } from './types';

export type TestData = {
	name: string;
	title: string;
	path: string;
	img: string;
	hidden?: boolean;
};

export const tests: TestData[] = [
	{
		name: 'stroop',
		title: 'Тест Струпа',
		path: '/tests/stroop/about',
		img: '/tests/stroop.jpg'
	},
	{
		name: 'math',
		title: 'Aрифметический тест',
		path: '/tests/math/about',
		img: '/tests/math.svg'
	},
	{
		name: 'munsterberg',
		title: 'Тест Мюнстерберга',
		path: '/tests/munsterberg/about',
		img: '/tests/munsterberg.svg'
	},
	{
		name: 'campimetry',
		title: 'Компьютерная кампиметрия',
		path: '/tests/campimetry/about',
		img: '/tests/campimetry.svg'
	},
	{
		name: 'memory',
		title: 'Тест на память',
		path: '/tests/memory/about',
		img: '/tests/memory.svg'
	},
	{
		name: 'swallow',
		title: 'Тест «Ласточка»',
		path: '/tests/swallow/about',
		img: '/tests/swallow.svg'
	}
];

export const TEST_ORDER: TestType[] = tests.map((t) => t.name as TestType);

type TestLoader = {
	about: () => Promise<any>;
	playground: () => Promise<any>;
	resultsChart?: () => Promise<any>;
};

const testLoaders: Record<string, TestLoader> = {
	stroop: {
		about: () => import('./stroop/About.svelte'),
		playground: () => import('./stroop/Playground.svelte'),
		resultsChart: () => import('./stroop/ResultsChart.svelte')
	},
	math: {
		about: () => import('./math/About.svelte'),
		playground: () => import('./math/Playground.svelte'),
		resultsChart: () => import('./math/ResultsChart.svelte')
	},
	munsterberg: {
		about: () => import('./munsterberg/About.svelte'),
		playground: () => import('./munsterberg/Playground.svelte'),
		resultsChart: () => import('./munsterberg/ResultsChart.svelte')
	},
	campimetry: {
		about: () => import('./campimetry/About.svelte'),
		playground: () => import('./campimetry/Playground.svelte'),
		resultsChart: () => import('./campimetry/ResultsChart.svelte')
	},
	memory: {
		about: () => import('./memory/About.svelte'),
		playground: () => import('./memory/Playground.svelte'),
		resultsChart: () => import('./memory/ResultsChart.svelte')
	},
	swallow: {
		about: () => import('./swallow/About.svelte'),
		playground: () => import('./swallow/Playground.svelte'),
		resultsChart: () => import('./swallow/ResultsChart.svelte')
	}
};

export const testRegistry: Record<string, TestData & TestLoader> = Object.fromEntries(
	tests.map((t) => [t.name, { ...t, ...testLoaders[t.name] }])
);

/**
 * GTO test order — includes all tests in the GTO battery,
 * even those that live under /exercises/ (e.g. ravenMatrices).
 * Maps each test type to its playground route prefix.
 */
export const GTO_TEST_ORDER: { type: string; route: string }[] = [
	{ type: 'stroop', route: '/tests/stroop' },
	{ type: 'math', route: '/tests/math' },
	{ type: 'munsterberg', route: '/tests/munsterberg' },
	{ type: 'campimetry', route: '/tests/campimetry' },
	{ type: 'memory', route: '/tests/memory' },
	{ type: 'swallow', route: '/tests/swallow' },
	{ type: 'ravenMatrices', route: '/exercises/raven-matrices' }
];

/**
 * Given a test type from the GTO battery, return the about page URL
 * with the gtoSessionId param appended.
 */
export function gtoTestAboutUrl(
	testType: string,
	index: number,
	gtoSessionId: string
): string {
	const entry = GTO_TEST_ORDER[index] ?? GTO_TEST_ORDER.find((e) => e.type === testType);
	if (!entry) return '/gto';
	return `${entry.route}/about?gtoSessionId=${gtoSessionId}`;
}

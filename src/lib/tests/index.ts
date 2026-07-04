import type { TestType } from './types';

export type TestData = {
	name: string;
	title: string;
	path: string;
	img: string;
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

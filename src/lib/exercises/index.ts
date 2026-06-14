export type ExerciseData = {
	name: string;
	title: string;
	path: string;
	img: string;
};

export type { ExerciseType, ExerciseResult, ExerciseResults } from './types';

export const exercises: ExerciseData[] = [
	{
		name: 'word-morphing',
		title: 'Тест на словосочетания',
		path: '/exercises/word-morphing/about',
		img: '/exercises/word-morphing.svg'
	},
	{
		name: 'campimetry',
		title: 'Расширенная кампиметрия',
		path: '/exercises/campimetry/about',
		img: '/tests/campimetry.svg'
	},
	{
		name: 'memory-match',
		title: 'Совпадения',
		path: '/exercises/memory-match/about',
		img: '/exercises/memory-match.svg'
	},
	{
		name: 'nback-stream',
		title: 'Определение повторов',
		path: '/exercises/nback-stream/about',
		img: '/exercises/n-back.svg'
	},
	{
		name: 'raven-matrices',
		title: 'Матрицы Равена',
		path: '/exercises/raven-matrices/about',
		img: '/exercises/raven-matrices.svg'
	},
	{
		name: 'emoji',
		title: 'Тест на смену эмодзи',
		path: '/exercises/emoji/about',
		img: '/exercises/emoji.svg'
	},
	{
		name: 'attention',
		title: 'Тест на внимание',
		path: '/exercises/attention/about',
		img: '/exercises/attention.svg'
	},
	{
		name: 'pictures',
		title: 'Запоминание картинок',
		path: '/exercises/pictures/about',
		img: '/exercises/pictures.svg'
	},
	{
		name: 'numbers',
		title: 'Запоминание чисел',
		path: '/exercises/numbers/about',
		img: '/exercises/numbers.svg'
	},
	{
		name: 'flanker',
		title: 'Фланговый тест Эриксена',
		path: '/exercises/flanker/about',
		img: '/exercises/flanker.svg'
	},
	{
		name: 'letters',
		title: 'Буквенный охват',
		path: '/exercises/letters/about',
		img: '/exercises/letters.svg'
	},
	{
		name: 'road-trip',
		title: 'По дороге на работу',
		path: '/exercises/road-trip/about',
		img: '/exercises/road-trip.svg'
	},
	{
		name: 'not-lost',
		title: 'По дороге на работу',
		path: '/exercises/not-lost/about',
		img: '/exercises/not-lost.svg'
	}
];

type ExerciseLoader = {
	about: () => Promise<any>;
	playground?: () => Promise<any>;
	result?: () => Promise<any>;
};

const exerciseLoaders: Record<string, ExerciseLoader> = {
	'word-morphing': {
		about: () => import('./word-morphing/About.svelte'),
		playground: () => import('./word-morphing/Playground.svelte')
	},
	campimetry: {
		about: () => import('./campimetry/About.svelte'),
		playground: () => import('./campimetry/Playground.svelte')
	},
	'memory-match': {
		about: () => import('./memory-match/About.svelte'),
		playground: () => import('./memory-match/Playground.svelte')
	},
	'nback-stream': {
		about: () => import('./nback-stream/About.svelte'),
		playground: () => import('./nback-stream/Playground.svelte')
	},
	'raven-matrices': {
		about: () => import('./raven-matrices/About.svelte'),
		playground: () => import('./raven-matrices/Playground.svelte'),
		result: () => import('./raven-matrices/Result.svelte')
	},
	emoji: {
		about: () => import('./emoji/About.svelte'),
		playground: () => import('./emoji/Playground.svelte'),
		result: () => import('./emoji/Result.svelte')
	},
	attention: {
		about: () => import('./attention/About.svelte'),
		playground: () => import('./attention/Playground.svelte'),
		result: () => import('./attention/Result.svelte')
	},
	pictures: {
		about: () => import('./pictures/About.svelte'),
		playground: () => import('./pictures/Playground.svelte')
	},
	numbers: {
		about: () => import('./numbers/About.svelte'),
		playground: () => import('./numbers/Playground.svelte'),
		result: () => import('./numbers/Result.svelte')
	},
	flanker: {
		about: () => import('./flanker/About.svelte'),
		playground: () => import('./flanker/Playground.svelte'),
		result: () => import('./flanker/Result.svelte')
	},
	letters: {
		about: () => import('./letters/About.svelte'),
		playground: () => import('./letters/Playground.svelte'),
		result: () => import('./letters/Result.svelte')
	},
	'road-trip': {
		about: () => import('./road-trip/About.svelte')
	},
	'not-lost': {
		about: () => import('./not-lost/About.svelte')
	}
};

export const exerciseRegistry: Record<string, ExerciseData & ExerciseLoader> = Object.fromEntries(
	exercises.map((e) => [e.name, { ...e, ...exerciseLoaders[e.name] }])
);

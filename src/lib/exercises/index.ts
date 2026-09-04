import type { TestType } from '$lib/tests/types';
import type { SkillMetric } from '$lib/types';
import type { Component } from 'svelte';
import type { ExerciseType } from './types';

export type ExerciseData = {
	name: string;
	title: string;
	path: string;
	img: string;
	admin_metrics?: SkillMetric[];
	user_metrics?: SkillMetric[];
};

export type { ExerciseType, ExerciseResult, ExerciseResults } from './types';

export const exercises: ExerciseData[] = [
	{
		name: 'word-morphing',
		title: 'Цепочка слов',
		path: '/exercises/word-morphing/about',
		img: '/exercises/word-morphing1.svg',
		admin_metrics: [
			'working_memory',
			'short_memory',
			'long_memory',
			'perception',
			'attention',
			'thinking'
		],
		user_metrics: ['memory']
	},
	{
		name: 'campimetry',
		title: 'Поле зрения',
		path: '/exercises/campimetry/about',
		img: '/tests/campimetry1.svg',
		admin_metrics: ['attention', 'perception', 'color_perception'],
		user_metrics: ['perception']
	},
	{
		name: 'memory-match',
		title: 'Найди пару',
		path: '/exercises/memory-match/about',
		img: '/exercises/memory-match1.svg',
		admin_metrics: ['spacial_perception', 'short_memory', 'attention'],
		user_metrics: ['memory']
	},
	{
		name: 'nback-stream',
		title: 'Повторы в ряду',
		path: '/exercises/nback-stream/about',
		img: '/exercises/n-back1.svg',
		admin_metrics: ['executive_function', 'perception', 'attention', 'short_memory'],
		user_metrics: ['memory']
	},
	{
		name: 'raven-matrices',
		title: 'Матрицы Равена',
		path: '/exercises/raven-matrices/about',
		img: '/exercises/raven-matrices1.svg'
	},
	{
		name: 'emoji',
		title: 'Смена эмодзи',
		path: '/exercises/emoji/about',
		img: '/exercises/emoji1.svg'
	},
	{
		name: 'attention',
		title: 'Найди число',
		path: '/exercises/attention/about',
		img: '/exercises/attention1.svg'
	},
	{
		name: 'pictures',
		title: 'Детали картинок',
		path: '/exercises/pictures/about',
		img: '/exercises/pictures1.svg'
	},
	{
		name: 'numbers',
		title: 'Цифровой ряд',
		path: '/exercises/numbers/about',
		img: '/exercises/numbers1.svg'
	},
	{
		name: 'flanker',
		title: 'Стрелки',
		path: '/exercises/flanker/about',
		img: '/exercises/flanker1.svg'
	},
	{
		name: 'letters',
		title: 'Цепочка букв',
		path: '/exercises/letters/about',
		img: '/exercises/letters1.svg'
	},
	{
		name: 'road-trip',
		title: 'По дороге на работу',
		path: '/exercises/road-trip/about',
		img: '/exercises/road-trip.svg',
		admin_metrics: ['perception', 'verbal_function', 'thinking'],
		user_metrics: ['perception']
	},
	{
		name: 'not-lost',
		title: 'По дороге на работу',
		path: '/exercises/not-lost/about',
		img: '/exercises/not-lost.svg',
		admin_metrics: ['spacial_perception', 'spacial_orientation', 'short_memory'],
		user_metrics: ['spacial_perception']
	}
];

// Компонент с произвольными пропсами: страницы передают gameEnd/sendResults/data
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = Component<any>;

type ExerciseLoader = {
	about: () => Promise<{ default: AnyComponent }>;
	playground?: () => Promise<{ default: AnyComponent }>;
	result?: () => Promise<{ default: AnyComponent }>;
};

const exerciseLoaders: Record<string, ExerciseLoader> = {
	'word-morphing': {
		about: () => import('./word-morphing/About.svelte'),
		playground: () => import('./word-morphing/Playground.svelte'),
		result: () => import('./word-morphing/Result.svelte')
	},
	campimetry: {
		about: () => import('./campimetry/About.svelte'),
		playground: () => import('./campimetry/Playground.svelte'),
		result: () => import('./campimetry/Result.svelte')
	},
	'memory-match': {
		about: () => import('./memory-match/About.svelte'),
		playground: () => import('./memory-match/Playground.svelte'),
		result: () => import('./memory-match/Result.svelte')
	},
	'nback-stream': {
		about: () => import('./nback-stream/About.svelte'),
		playground: () => import('./nback-stream/Playground.svelte'),
		result: () => import('./nback-stream/Result.svelte')
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
		playground: () => import('./pictures/Playground.svelte'),
		result: () => import('./pictures/Result.svelte')
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

/** Map exercise URL slug to the testType stored in the DB session table. */
export const EXERCISE_SLUG_TO_TEST_TYPE: Record<string, ExerciseType | TestType> = {
	attention: 'attention',
	campimetry: 'campimetry',
	emoji: 'emoji',
	flanker: 'flanker',
	letters: 'letters',
	'memory-match': 'memoryMatchExercise',
	'nback-stream': 'nbackExercise',
	numbers: 'numbers',
	pictures: 'pictures',
	'raven-matrices': 'ravenMatrices',
	'word-morphing': 'wordMorphingExercise'
};

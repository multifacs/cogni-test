import type { TestType } from '$lib/tests/types';
import type { SkillMetric } from '$lib/types';
import type { Component } from 'svelte';
import type { ExerciseType } from './types';

export type ExerciseData = {
	name: string;
	title: string;
	path: string;
	label?: string;
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
		label: '\u00A0',
		img: '/exercises/word-morphing.svg',
		admin_metrics: [
			'working_memory',
			'short_memory',
			'long_memory',
			'attention',
			'thinking',
			'verbal_function'
		],
		user_metrics: ['memory']
	},
	{
		name: 'campimetry',
		title: 'Поле зрения',
		path: '/exercises/campimetry/about',
		label: 'Расширенная кампиметрия',
		img: '/tests/campimetry.svg',
		admin_metrics: ['attention', 'color_perception'],
		user_metrics: ['color_perception']
	},
	{
		name: 'memory-match',
		title: 'Найди пару',
		path: '/exercises/memory-match/about',
		label: '\u00A0',
		img: '/exercises/memory-match.svg',
		admin_metrics: ['spacial_perception', 'short_memory', 'attention'],
		user_metrics: ['memory']
	},
	{
		name: 'nback-stream',
		title: 'Повторы в ряду',
		path: '/exercises/nback-stream/about',
		label: '\u00A0',
		img: '/exercises/n-back.svg',
		admin_metrics: ['executive_function', 'attention', 'working_memory'],
		user_metrics: ['memory']
	},
	{
		name: 'raven-matrices',
		title: 'Матрицы Равена',
		label: '\u00A0',
		path: '/exercises/raven-matrices/about',
		img: '/exercises/raven-matrices.svg'
	},
	{
		name: 'emoji',
		title: 'Смена эмодзи',
		label: '\u00A0',
		path: '/exercises/emoji/about',
		img: '/exercises/emoji.svg'
	},
	{
		name: 'attention',
		title: 'Найди число',
		label: '\u00A0',
		path: '/exercises/attention/about',
		img: '/exercises/attention.svg'
	},
	{
		name: 'pictures',
		title: 'Детали картинок',
		label: '\u00A0',
		path: '/exercises/pictures/about',
		img: '/exercises/pictures.svg'
	},
	{
		name: 'numbers',
		title: 'Цифровой ряд',
		label: '\u00A0',
		path: '/exercises/numbers/about',
		img: '/exercises/numbers.svg'
	},
	{
		name: 'flanker',
		title: 'Стрелки',
		label: '\u00A0',
		path: '/exercises/flanker/about',
		img: '/exercises/flanker.svg'
	},
	{
		name: 'letters',
		title: 'Цепочка букв',
		label: '\u00A0',
		path: '/exercises/letters/about',
		img: '/exercises/letters.svg'
	},
	{
		name: 'rhythm',
		title: 'Ритм',
		label: '\u00A0',
		path: '/exercises/rhythm/about',
		img: '/exercises/rhythm.svg'
	},
	{
		name: 'dot-position',
		title: 'Точная точка',
		path: '/exercises/dot-position/about',
		img: '/exercises/dot-position1.svg'
	}
];

// Компонент с произвольными пропсами: страницы передают gameEnd/sendResults/data.
// Контракт завершения: gameEnd() переключает страницу в локальный финальный UI
// без навигации; sendResults(results) — асинхронный оркестратор, страница
// сохраняет результат и навигирует ТОЛЬКО после подтверждения сервера или
// offline-enqueue. Игровой компонент не должен полагаться на навигацию после
// gameEnd().
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = Component<any>;

type ExerciseLoader = {
	about: () => Promise<{ default: AnyComponent }>;
	playground?: () => Promise<{ default: AnyComponent }>;
	result?: () => Promise<{ default: AnyComponent }>;
	summary?: () => Promise<{ default: AnyComponent }>;
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
	rhythm: {
		about: () => import('./rhythm/About.svelte'),
		playground: () => import('./rhythm/Playground.svelte'),
		result: () => import('./rhythm/Result.svelte'),
		summary: () => import('./rhythm/Summary.svelte')
	},
	'dot-position': {
		about: () => import('./dot-position/About.svelte'),
		playground: () => import('./dot-position/Playground.svelte'),
		result: () => import('./dot-position/Result.svelte')
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
	'word-morphing': 'wordMorphingExercise',
	rhythm: 'rhythm',
	'dot-position': 'dotPosition'
};

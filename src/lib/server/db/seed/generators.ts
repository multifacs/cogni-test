/**
 * Shared random result generators used by both the manual `npm run test:seed` script
 * and the default dev-user seed.
 */
import type { StroopResult, Color } from '$lib/tests/stroop/types';
import type { MathResult, Sign } from '$lib/tests/math/types';
import type { MemoryResult } from '$lib/tests/memory/types';
import type { CampimetryResult } from '$lib/tests/campimetry/types';
import type { SwallowResult, Direction, Background } from '$lib/tests/swallow/types';
import type { MunsterbergResult } from '$lib/tests/munsterberg/types';

function rnd(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rndBool(pCorrect = 0.7) {
	return Math.random() < pCorrect;
}

const COLORS: Color[] = ['red', 'blue', 'green', 'cyan', 'magenta', 'yellow'];
const STROOP_TASKS: ('both' | 'meaning' | 'color')[] = ['both', 'meaning', 'color'];
const DIRECTIONS: Direction[] = ['up', 'right', 'down', 'left'];
const BACKGROUNDS: Background[] = ['red', 'blue'];
const SIGNS: Sign[] = ['>', '<', '>=', '<=', '=', '!='];
const SILHOUETTES = ['bird', 'tree', 'house', 'fish', 'star'];
const CHANNELS: ('a' | 'b')[] = ['a', 'b'];
const OPS: ('+' | '-')[] = ['+', '-'];
const MUNSTERBERG_WORDS = [
	'СОЛНЦЕ',
	'ДОРОГА',
	'КОРАБЛЬ',
	'ПТИЦА',
	'ЗЕРКАЛО',
	'ВОЛНА',
	'ГОРОД',
	'КНИГА'
];

export function genStroop(n: number): StroopResult[] {
	return Array.from({ length: n }, (_, i) => ({
		stage: i < 5 ? 1 : i < 15 ? 2 : 3,
		attempt: i,
		time: rnd(300, 2000),
		word: COLORS[rnd(0, 5)],
		color: COLORS[rnd(0, 5)],
		task: STROOP_TASKS[rnd(0, 2)],
		userAnswer: COLORS[rnd(0, 5)],
		isCorrect: rndBool()
	}));
}

export function genMath(n: number): MathResult[] {
	return Array.from({ length: n }, (_, i) => ({
		stage: 1,
		attempt: i,
		time: rnd(300, 2500),
		left: rnd(-5, 15),
		sign: SIGNS[rnd(0, 4)],
		right: rnd(-5, 15),
		correctAnswer: rndBool(),
		userAnswer: rndBool() ? rndBool() : null,
		isCorrect: rndBool()
	}));
}

export function genMemory(n: number): MemoryResult[] {
	const words = ['дом', 'сад', 'лес', 'река', 'гора', 'дом', 'окно', 'дверь', 'стол', 'стул'];
	return Array.from({ length: n }, (_, i) => ({
		attempt: i,
		time: rnd(300, 1500),
		word: words[i % words.length],
		correctAnswer: rndBool(0.5),
		userAnswer: rndBool(0.8) ? rndBool(0.5) : null,
		isCorrect: rndBool()
	}));
}

export function genCampimetry(n: number): CampimetryResult[] {
	const colorNames = Object.keys({
		'dark-magenta': {},
		'light-magenta': {},
		'dark-blue': {},
		'light-blue': {},
		'dark-green': {},
		'light-green': {},
		'dark-red': {},
		'light-red': {}
	});
	return Array.from({ length: n }, (_, i) => ({
		attempt: i,
		stage: i % 2 === 0 ? 1 : 2,
		silhouette: SILHOUETTES[i % SILHOUETTES.length],
		color: colorNames[i % colorNames.length],
		channel: CHANNELS[i % 2],
		op: OPS[i % 2],
		delta: rnd(-10, 10),
		time: rnd(300, 3000)
	}));
}

export function genSwallow(n: number): SwallowResult[] {
	return Array.from({ length: n }, (_, i) => ({
		attempt: i,
		time: rnd(100, 800),
		direction: DIRECTIONS[rnd(0, 3)],
		background: BACKGROUNDS[i % 2],
		correctAnswer: DIRECTIONS[rnd(0, 3)],
		userAnswer: DIRECTIONS[rnd(0, 3)],
		isCorrect: rndBool()
	}));
}

export function genMunsterberg(n: number): { results: MunsterbergResult[]; words: string[] } {
	const shuffled = [...MUNSTERBERG_WORDS].sort(() => Math.random() - 0.5);
	const chosen = shuffled.slice(0, Math.min(n, shuffled.length));
	const results: MunsterbergResult[] = chosen.map((word, i) => ({
		word,
		row: rnd(0, 10),
		col: rnd(0, 2),
		guessed: rndBool(),
		attempt: i,
		time: rnd(1000, 55000)
	}));
	return { results, words: chosen };
}

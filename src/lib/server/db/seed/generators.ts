/**
 * Shared random result generators used by both the manual `npm run test:seed` script,
 * the default dev-user seed and the DEV-only "Автопрохождение" playground button.
 */
import { env } from '$env/dynamic/private';
import type { StroopResult, Color } from '$lib/tests/stroop/types';
import type { MathResult, Sign } from '$lib/tests/math/types';
import type { MemoryResult } from '$lib/tests/memory/types';
import type { CampimetryResult } from '$lib/tests/campimetry/types';
import type { SwallowResult, Direction, Background } from '$lib/tests/swallow/types';
import type { MunsterbergResult } from '$lib/tests/munsterberg/types';
import type {
	RavenAttemptRow,
	TaskClass,
	RuleFamily,
	DistractorFamily
} from '$lib/exercises/raven-matrices/types';

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

const MEMORY_WORDS = ['дом', 'сад', 'лес', 'река', 'гора', 'дом', 'окно', 'дверь', 'стол', 'стул'];
// The real game (MemoryGame) shows exactly 6 unique words in the memorization phase
// (memorizationCount = 6) and sends them as meta — take the first 6 unique pool words.
const MEMORY_META_WORDS = [...new Set(MEMORY_WORDS)].slice(0, 6);

export function genMemory(n: number): MemoryResult[] {
	return Array.from({ length: n }, (_, i) => ({
		attempt: i,
		time: rnd(300, 1500),
		word: MEMORY_WORDS[i % MEMORY_WORDS.length],
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

const TASK_CLASSES: TaskClass[] = [
	'attribute_reasoning',
	'row_column_factorization',
	'quantity_reasoning',
	'spatial_movement',
	'grid_bitmask',
	'logical_set_reasoning',
	'structural_composition',
	'regional_texture_reasoning',
	'vector_primitive_reasoning'
];

const RULE_FAMILIES: RuleFamily[] = [
	'constant',
	'progression',
	'distribution',
	'permutation',
	'addition',
	'subtraction',
	'and',
	'or',
	'xor',
	'set_difference',
	'movement',
	'rotation',
	'reflection',
	'nesting',
	'overlay',
	'region_overlay',
	'primitive_union'
];

const DISTRACTOR_FAMILIES: DistractorFamily[] = [
	'correct',
	'repetition',
	'wrong_attribute',
	'wrong_step',
	'wrong_operation',
	'missing_component',
	'extra_component',
	'wrong_position',
	'mirror_error',
	'rotation_error',
	'wrong_layer',
	'wrong_axis',
	'wrong_region',
	'wrong_texture'
];

const RAVEN_SKILL_TAGS = [
	'induction',
	'analogy',
	'pattern',
	'symmetry',
	'arithmetic',
	'spatial',
	'set-logic',
	'abstraction'
];

function rndSubset<T>(values: readonly T[]): T[] {
	return values.filter(() => Math.random() < 0.5);
}

function rndNonEmptySubset<T>(values: readonly T[]): T[] {
	const subset = rndSubset(values);
	return subset.length > 0 ? subset : [values[rnd(0, values.length - 1)]];
}

function rndSeed() {
	return Math.random().toString(36).slice(2, 10);
}

/**
 * Dev-autoplay always selects an answer: `selectedIndex` is always a number,
 * never null (unlike the real game, which can send null for unanswered tasks).
 */
export function genRaven(n: number): RavenAttemptRow[] {
	return Array.from({ length: n }, (_, i) => ({
		taskId: rndSeed(),
		taskIndex: i,
		taskClass: TASK_CLASSES[rnd(0, TASK_CLASSES.length - 1)],
		difficultyLevel: rnd(1, 3),
		difficultyScore: rnd(0, 100),
		rules: JSON.stringify(rndNonEmptySubset(RULE_FAMILIES)),
		skillTags: JSON.stringify(rndSubset(RAVEN_SKILL_TAGS)),
		selectedIndex: rnd(0, 5),
		correctIndex: rnd(0, 5),
		selectedFamily: rndBool(0.9)
			? DISTRACTOR_FAMILIES[rnd(0, DISTRACTOR_FAMILIES.length - 1)]
			: null,
		isCorrect: rndBool(),
		responseTimeMs: rnd(1000, 30000),
		seed: rndSeed()
	}));
}

/**
 * Thrown when the requested slug is valid at the route level (present in
 * testRegistry) but has no DEV random-results generator mapped. Lets the
 * endpoint distinguish a missing slug (404) from the MODE gate (403).
 */
export class UnknownDevSlugError extends Error {
	constructor(slug: string) {
		super(`[dev-random] Unknown test slug: ${slug}`);
		this.name = 'UnknownDevSlugError';
	}
}

export type DevRandomPayload =
	| StroopResult[]
	| MathResult[]
	| CampimetryResult[]
	| SwallowResult[]
	| RavenAttemptRow[]
	| { results: MemoryResult[]; meta: string[] }
	| { results: MunsterbergResult[]; meta: string[] };

/**
 * DEV-only: generates a random result payload for the given test slug,
 * identical in shape to what the corresponding game's sendResults callback sends.
 * Fails closed unless MODE === 'DEV'.
 */
export function generateDevRandomResults(slug: string): DevRandomPayload {
	if (env.MODE !== 'DEV') {
		throw new Error(
			`[dev-random] Refusing to generate random results: MODE is not "DEV" (got ${JSON.stringify(env.MODE)})`
		);
	}

	switch (slug) {
		case 'stroop':
			return genStroop(25);
		case 'math':
			return genMath(10);
		case 'campimetry':
			return genCampimetry(20);
		case 'swallow':
			return genSwallow(100);
		case 'memory': {
			const results = genMemory(10);
			return { results, meta: MEMORY_META_WORDS };
		}
		case 'munsterberg': {
			const { results, words } = genMunsterberg(8);
			return { results, meta: words };
		}
		case 'raven-matrices':
			return genRaven(10);
		default:
			throw new UnknownDevSlugError(slug);
	}
}

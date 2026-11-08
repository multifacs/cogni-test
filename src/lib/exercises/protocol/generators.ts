import dictionary from './dictionary.json';
import type { Stimulus } from './types';
import type { ProtocolType } from './config';
export { dictionary };
export function normalize(value: string): string {
	return value
		.normalize('NFKC')
		.toLowerCase()
		.replaceAll('ё', 'е')
		.trim()
		.replace(/^[\p{P}\p{S}\s]+|[\p{P}\p{S}\s]+$/gu, '')
		.replace(/\s+/g, ' ');
}
export function randomFromSeed(seed: string): () => number {
	let h = 2166136261;
	for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
	return () => {
		h += 0x6d2b79f5;
		let t = h;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
	const out = [...items];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}
export function integer(rng: () => number, min: number, max: number): number {
	return min + Math.floor(rng() * (max - min + 1));
}
export function classification(
	rng: () => number,
	used: string[]
): { stimulus: Stimulus; level: number } {
	const level = integer(rng, 1, 3);
	const pool = dictionary.features.filter((f) => f.level === level);
	const fresh = pool.filter((f) => !used.includes(f.id));
	const f = shuffle(fresh.length ? fresh : pool, rng)[0];
	const words = shuffle(f.words, rng).slice(0, 3);
	const aliases = dictionary.features
		.filter((other) => words.every((w) => other.words.map(normalize).includes(normalize(w))))
		.flatMap((f) => [f.label, ...f.aliases]);
	if (words.map(normalize).sort().join('|') === ['красный', 'желтый', 'зеленый'].sort().join('|'))
		aliases.push('цвета светофора', 'цвет светофора');
	return {
		level,
		stimulus: {
			feature_id: f.id,
			displayed_words: words,
			accepted_answers_snapshot: [...new Set(aliases.map(normalize))],
			dictionary_version: dictionary.version
		}
	};
}
export const directions = [
	[0, 1],
	[0, -1],
	[1, 0],
	[-1, 0],
	[1, 1],
	[1, -1],
	[-1, 1],
	[-1, -1]
];
export function pathKey(path: number[], word: string): string {
	const a = path.join(',');
	if (word !== [...word].reverse().join('')) return a;
	const b = [...path].reverse().join(',');
	return a < b ? a : b;
}
export function scan(grid: string[], word: string, dirs: number[][]): number[][] {
	const n = grid.length,
		m = grid[0].length;
	const found = new Map<string, number[]>();
	for (let r = 0; r < n; r++)
		for (let c = 0; c < m; c++)
			for (const [dr, dc] of dirs) {
				const path: number[] = [];
				for (let k = 0; k < word.length; k++) {
					const rr = r + dr * k,
						cc = c + dc * k;
					if (rr < 0 || rr >= n || cc < 0 || cc >= m || grid[rr][cc] !== word[k]) break;
					path.push(rr * m + cc);
				}
				if (path.length === word.length) found.set(pathKey(path, word), path);
			}
	return [...found.values()];
}
export function antiBoard(level: number, rng: () => number): Stimulus {
	const word = shuffle(
		['береза', 'машина', 'ракета', 'солнце', 'дорога', 'шалаш', 'молоко', 'картина'],
		rng
	)[0];
	const n = level === 3 ? 2 * word.length + 2 : word.length + level + 3;
	for (let attempt = 0; attempt < 100; attempt++) {
		const grid: (string | null)[][] = Array.from({ length: n }, () => Array(n).fill(null));
		const forced: { direction: number[]; path: number[] }[] = [];
		const dirs = level === 3 ? shuffle(directions, rng).slice(0, integer(rng, 3, 5)) : [[0, 1]];
		let failed = false;
		for (const dir of dirs) {
			const copies = level === 3 ? integer(rng, 1, 2) : 1;
			for (let copy = 0; copy < copies; copy++) {
				let placed = false;
				for (let tries = 0; tries < 500; tries++) {
					const r = integer(rng, 0, n - 1),
						c = integer(rng, 0, n - 1);
					const path: number[] = [];
					for (let k = 0; k < word.length; k++) {
						const rr = r + dir[0] * k,
							cc = c + dir[1] * k;
						if (
							rr < 0 ||
							rr >= n ||
							cc < 0 ||
							cc >= n ||
							(grid[rr][cc] !== null && grid[rr][cc] !== word[k])
						)
							break;
						path.push(rr * n + cc);
					}
					if (
						path.length !== word.length ||
						forced.some((p) => pathKey(p.path, word) === pathKey(path, word))
					)
						continue;
					path.forEach((id, k) => (grid[Math.floor(id / n)][id % n] = word[k]));
					forced.push({ direction: dir, path });
					placed = true;
					break;
				}
				if (!placed) {
					failed = true;
					break;
				}
			}
			if (failed) break;
		}
		if (failed) continue;
		const alphabet =
			level === 1 ? 'абвгдежзийклмнопрстуфхцчшщэюя' : [...new Set(word)].join('');
		const snapshot = grid.map((row) =>
			row.map((c) => c ?? alphabet[integer(rng, 0, alphabet.length - 1)]).join('')
		);
		if (level === 1 && scan(snapshot, word, directions).length !== 1) continue;
		const allowed = level === 3 ? directions : [[0, 1]];
		return {
			target_word: word,
			grid_rows: n,
			grid_cols: n,
			grid_snapshot: snapshot,
			allowed_directions: allowed,
			forced_paths: forced,
			expected_paths: scan(snapshot, word, allowed)
		};
	}
	throw new Error('Не удалось создать корректную матрицу');
}
export function memoryPattern(level: number, rng: () => number, previous?: number[]): Stimulus {
	const n = 3 + Math.floor((level - 1) / 2);
	let cells: number[];
	do {
		cells = shuffle(
			Array.from({ length: n * n }, (_, i) => i),
			rng
		)
			.slice(0, level + 2)
			.sort((a, b) => a - b);
	} while (previous && cells.join(',') === [...previous].sort((a, b) => a - b).join(','));
	return { level, grid_size: n, target_count: level + 2, target_cells: cells };
}
export type LexiconEntry = {
	id: string;
	token: string;
	level: number;
	is_real_word: boolean;
	review_status: 'draft' | 'approved' | 'rejected';
	morphology_lexicon_version: string;
	generation_pattern?: unknown;
};
/** Only externally reviewed candidates are eligible. The starter word list cannot validate pseudo words. */
export function lexicalPlan(entries: LexiconEntry[], rng: () => number): Stimulus[] {
	const result: Stimulus[] = [];
	for (const real of [true, false])
		for (const level of [1, 2]) {
			const pool = entries.filter(
				(e) =>
					e.review_status === 'approved' && e.is_real_word === real && e.level === level
			);
			const count = level === 1 ? 3 : 2;
			if (pool.length < count)
				throw new Error('Для запуска нужен утверждённый лексикон реальных и псевдослов');
			result.push(
				...shuffle(pool, rng)
					.slice(0, count)
					.map((e) => ({
						displayed_token: e.token,
						is_real_word: e.is_real_word,
						lexicon_entry_id: e.id,
						difficulty_level: level,
						morphology_lexicon_version: e.morphology_lexicon_version,
						generation_pattern: e.generation_pattern ?? null
					}))
			);
		}
	return shuffle(result, rng);
}
export function hslToRgb([h, s, l]: number[]): number[] {
	h = ((h % 360) + 360) % 360;
	s /= 100;
	l /= 100;
	const a = s * Math.min(l, 1 - l);
	return [0, 8, 4].map((n) => {
		const k = (n + h / 30) % 12;
		return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
	});
}
export function oklab(rgb: number[]): number[] {
	const [r, g, b] = rgb.map((v) => {
		v /= 255;
		return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
	});
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b),
		m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b),
		s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	return [
		0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
	];
}
export function distance(a: number[], b: number[]): number {
	const x = oklab(a),
		y = oklab(b);
	return Math.hypot(...x.map((v, i) => v - y[i]));
}
export const families = ['red', 'yellow', 'green', 'blue', 'white', 'black'];
export function colorPair(type: ProtocolType, index: number, rng: () => number): Stimulus {
	const family = shuffle(type === 'color_saturation' ? families.slice(0, 4) : families, rng)[0];
	const f = families.indexOf(family),
		h = [0, 60, 120, 240, 0, 0][f],
		neutral = f >= 4,
		delta = 11 - index;
	let base: number[], a: number[], b: number[], reference: number[] | undefined;
	let step = delta;
	if (type === 'color_distance') {
		reference = [h, neutral ? 0 : 100, f === 4 ? 100 : f === 5 ? 0 : 50];
		step = neutral ? delta : [40, 35, 30, 25, 20, 16, 12, 9, 6, 3][index - 1];
		const near = integer(rng, 2, 7);
		base = reference;
		a = neutral ? [0, 0, f === 4 ? 100 - near : near] : [(h + near) % 360, 100, 50];
		b = neutral
			? [0, 0, f === 4 ? 100 - near - step : near + step]
			: [(h + near + step) % 360, 100, 50];
	} else {
		base = [
			(h + integer(rng, -10, 10) + 360) % 360,
			neutral ? 0 : integer(rng, 35, 75),
			f === 4 ? 85 : f === 5 ? 15 : integer(rng, 30, 65)
		];
		a = [...base];
		b = [...base];
		const axis = type === 'color_lightness' ? 2 : 1;
		a[axis] += delta;
		b[axis] -= delta;
	}
	if (rng() < 0.5) [a, b] = [b, a];
	const ar = hslToRgb(a),
		br = hslToRgb(b),
		ref = reference ? hslToRgb(reference) : undefined;
	const da = ref ? distance(ar, ref) : undefined,
		db = ref ? distance(br, ref) : undefined;
	const correct =
		type === 'color_distance'
			? da! < db!
				? 'A'
				: 'B'
			: a[type === 'color_lightness' ? 2 : 1] > b[type === 'color_lightness' ? 2 : 1]
				? 'A'
				: 'B';
	if (ar.join(',') === br.join(',') || (ref && Math.abs(da! - db!) <= 1e-6))
		return colorPair(type, index, rng);
	return {
		base_color_family: family,
		base_hsl: base,
		option_a_hsl: a,
		option_b_hsl: b,
		option_a_srgb: ar,
		option_b_srgb: br,
		correct_option: correct,
		delta_param: step,
		...(ref
			? {
					reference_color_family: family,
					reference_hsl: reference,
					reference_srgb: ref,
					distance_a: da,
					distance_b: db,
					distance_gap: Math.abs(da! - db!)
				}
			: {})
	};
}
export function draftLexicalPlan(rng: () => number): Stimulus[] {
	const entries: LexiconEntry[] = dictionary.real.map((e) => ({
		...e,
		is_real_word: true,
		review_status: 'approved',
		morphology_lexicon_version: dictionary.version
	}));
	const seen = new Set(entries.map((e) => normalize(e.token)));
	const syllables = [
		'ба',
		'во',
		'ги',
		'ду',
		'же',
		'ки',
		'лу',
		'ме',
		'но',
		'па',
		'ри',
		'со',
		'ту',
		'фе',
		'ха',
		'чу',
		'ша',
		'бро',
		'пле',
		'кри'
	];
	const endings = [
		'ный',
		'та',
		'а',
		'о',
		'ор',
		'ер',
		'кор',
		'топ',
		'ство',
		'ить',
		'ать',
		'оть',
		'еть'
	];
	for (const level of [1, 2])
		for (let i = 0; i < 20; i++) {
			let token: string;
			do {
				token =
					Array.from(
						{ length: level === 1 ? 2 : 3 },
						() => syllables[integer(rng, 0, syllables.length - 1)]
					).join('') + endings[integer(rng, 0, endings.length - 1)];
			} while (seen.has(normalize(token)));
			seen.add(normalize(token));
			entries.push({
				id: `draft_${level}_${i}`,
				token,
				level,
				is_real_word: false,
				review_status: 'approved',
				morphology_lexicon_version: 'temporary-unverified-1',
				generation_pattern: { syllables: 'CV/CCV', endings, version: '1', temporary: true }
			});
		}
	return lexicalPlan(entries, rng).map((s) => ({ ...s, dictionary_provisional: true }));
}

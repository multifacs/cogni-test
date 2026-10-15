import type { SyllablePair } from '../types';
import { SYLLABLES } from './syllables';

const PAIRS_PER_SESSION = 5;
const WORDS_PER_PAIR = 2;
const MIN_SYLLABLES_PER_WORD = 2;
const MAX_SYLLABLES_PER_WORD = 5;

/**
 * Fisher-Yates с инжектируемым rng. Возвращает копию — исходный массив
 * не мутируется (в отличие от shuffle из $lib/utils).
 */
function shuffledCopy<T>(items: readonly T[], rng: () => number): T[] {
	const copy = [...items];
	for (let i = copy.length - 1; i > 0; i -= 1) {
		const j = Math.floor(rng() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
}

function randomWordLength(rng: () => number): number {
	return (
		MIN_SYLLABLES_PER_WORD +
		Math.floor(rng() * (MAX_SYLLABLES_PER_WORD - MIN_SYLLABLES_PER_WORD + 1))
	);
}

/**
 * Генерирует 5 пар псевдословосочетаний.
 *
 * Каждая пара — 2 слова по 2–5 слогов. Слоги всегда уникальны внутри
 * одного слова; внутри пары — уникальны, пока в пуле есть неиспользованные
 * различимые слоги (при малом пуле повторы между словами допустимы).
 * Между парами слоги не повторяются, пока пул не исчерпан (выбор без
 * возвращения).
 *
 * @param rng инжектируемый источник случайности для детерминированных тестов
 * @param pool пул слогов (параметр для edge-case тестов с маленьким пулом)
 */
export function generateSessionPairs(
	rng: () => number = Math.random,
	pool: readonly string[] = SYLLABLES
): SyllablePair[] {
	const distinctPoolSize = new Set(pool).size;
	let bag = shuffledCopy(pool, rng);

	return Array.from({ length: PAIRS_PER_SESSION }, () => {
		// Слоги, использованные в текущей паре (оба слова).
		const picked: string[] = [];
		/**
		 * Берёт `wordLength` слогов. Инварианты:
		 * 1. Внутри слова — всегда уникальные слоги (строго).
		 * 2. Внутри пары — уникальность, пока есть неиспользованные различимые
		 *    слоги пула; при исчерпании — повторы между словами допустимы.
		 *
		 * Термация: различимых слогов пула ≥ wordLength, значит среди них
		 * всегда есть слог вне текущего слова; каждый полный проход bag
		 * (все слоги пула) добавляет в слово хотя бы один слог, поэтому
		 * цикл завершается за конечное число перетасовок.
		 */
		const drawDistinct = (wordLength: number): string[] => {
			if (distinctPoolSize < wordLength) {
				throw new Error(
					`Pool of ${distinctPoolSize} distinct syllables cannot fill a word of ${wordLength}`
				);
			}
			const word: string[] = [];
			while (word.length < wordLength) {
				if (bag.length === 0) bag = shuffledCopy(pool, rng);
				const candidate = bag.shift()!;
				// Строго: без повторов внутри слова.
				if (word.includes(candidate)) continue;
				// Без повторов в паре, пока пул не исчерпан.
				if (picked.includes(candidate) && picked.length < distinctPoolSize) continue;
				word.push(candidate);
				picked.push(candidate);
			}
			return word;
		};

		const words = Array.from({ length: WORDS_PER_PAIR }, () =>
			drawDistinct(randomWordLength(rng))
		);
		return { word1: words[0], word2: words[1] };
	});
}

/** '({ба, ко, ми}, {ло, те, су})' → 'ба-ко-ми ло-те-су'. */
export function pairToPhrase(pair: SyllablePair): string {
	return `${pair.word1.join('-')} ${pair.word2.join('-')}`;
}

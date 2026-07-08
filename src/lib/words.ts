/**
 * Parse raw text from /words into a filtered array of words.
 * - Trims each line
 * - Excludes empty strings
 * - Excludes words longer than 9 characters (matching Munsterberg/Memory test constraints)
 * - Excludes "TRUE"/"true" (reserved keyword in the word list)
 */
export function filterWords(rawText: string): string[] {
	return rawText
		.split('\n')
		.map((x) => x.replace(/(\r\n|\n|\r)/gm, ''))
		.filter((x) => x.length > 0 && x.length <= 9 && x !== 'TRUE' && x !== 'true');
}

/**
 * Select N random items from an array without replacement.
 * Uses Fisher-Yates shuffle on a copy.
 */
export function pickRandom<T>(arr: T[], count: number): T[] {
	const copy = [...arr];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy.slice(0, count);
}

export type WordMorphingResult = {
	original: string;
	modifiedAdj: string;
	modifiedNoun: string;
	recalled: string[];
	timestamp: number;
};

export type WordMorphingSession = {
	timerEndsAt: number; // Unix timestamp in milliseconds
	expectedCombos: string[];
	category: 'words' | 'shapes';
};
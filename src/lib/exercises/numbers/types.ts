export type LevelReview = {
	level: number;
	sequence: number[];
	submitted: number[];
	isCorrect: boolean;
	reactionTimeMs: number;
};

export type NumbersTrialRow = {
	levelIndex: number;
	level: number;
	digitCount: number;
	mode: string;
	sequence: string;
	submitted: string;
	isCorrect: boolean;
	reactionTimeMs: number;
};

export type LevelReview = {
	level: number;
	sequence: number[];
	submitted: number[];
	isCorrect: boolean;
	reactionTimeMs: number;
};

export type NumbersResult = {
	correct: number;
	total: number;
	digitSpan: number;
	reviews: LevelReview[];
};

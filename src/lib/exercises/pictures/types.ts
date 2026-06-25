export type PicturesTrialRow = {
	questionIndex: number;
	questionId: string;
	questionKind: string;
	scored: boolean;
	answer: string | null;
	isCorrect: boolean | null;
	reactionTimeMs: number;
};

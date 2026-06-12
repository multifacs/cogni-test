export type AnswerRecord = {
	questionId: string;
	answer: string | undefined;
	isCorrect: boolean | null;
	reactionTimeMs: number;
};

export type PicturesResult = {
	score: number;
	maxScore: number;
	normalizedScore: number;
	answers: AnswerRecord[];
};

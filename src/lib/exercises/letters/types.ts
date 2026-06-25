export type RoundEntry = {
	target: string;
	submitted: string;
	isCorrect: boolean;
	reactionTimeMs: number;
	letterCount: number;
};

export type LettersResult = {
	maxSpan: number;
	roundsCompleted: number;
	elapsed: number;
	timeoutTriggered: boolean;
};

export type LettersTrialRow = {
	roundIndex: number;
	target: string;
	submitted: string;
	isCorrect: boolean;
	reactionTimeMs: number;
	letterCount: number;
	timeoutTriggered: boolean;
	elapsed: number;
};

export type FlankerTrialRow = {
	trialIndex: number;
	target: string;
	selected: string;
	isCorrect: boolean;
	congruent: boolean;
	reactionTimeMs: number;
	timeLimit: boolean;
	elapsedTime: number;
};

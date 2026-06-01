export type TrialLog = {
	index: number;
	previousEmoji: string;
	currentEmoji: string;
	actualChanged: boolean;
	userSaidChanged: boolean;
	isCorrect: boolean;
	reactionTimeMs: number;
};

export type EmojiResult = {
	score: number;
	mistakes: number;
	totalAnswers: number;
	accuracy: number;
	trialLog: TrialLog[];
};

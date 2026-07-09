export type EmojiTrialRow = {
	trialIndex: number;
	previousEmoji: string;
	currentEmoji: string;
	actualChanged: boolean;
	userSaidChanged: boolean;
	isCorrect: boolean;
	reactionTimeMs: number;
};

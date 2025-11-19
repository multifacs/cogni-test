export type WordMorphingResult = {
	original: string;
	modifiedAdj: string;
	modifiedNoun: string;
	recalled: string[];
	timestamp: number;
};

export type WordMorphingSession = {
	id: string;
    userId: string;
    expectedCombos: string[];
	timerStartedAt: number;
    timerValueInSeconds: number;
	isActive: boolean;
};

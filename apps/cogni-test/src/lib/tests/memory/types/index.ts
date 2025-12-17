export type Word = {
	value: string;
	isCorrect: boolean;
};

export type MemoryResult = {
	attempt: number;
	time: number;
	word: string;
	correctAnswer: boolean;
	userAnswer: boolean | null;
	isCorrect: boolean;
};

export type Word = {
	value: string;
	isCorrect: boolean;
};

export type MemoryResult = {
    type: 'memory';
	attempt: number;
	time: number;
	word: string;
	correctAnswer: boolean;
	userAnswer: boolean | null;
	isCorrect: boolean;
};

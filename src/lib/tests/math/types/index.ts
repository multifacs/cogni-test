export type Sign = '>' | '<' | '>=' | '<=' | '=' | '!=';

export type Inequality = {
	left: number | 'stage';
	right: number | null;
	sign: Sign | null;
	answer: boolean | null;
};

export type MathResult = {
	stage: number;
	attempt: number;
	time: number;
	left: number;
	sign: Sign;
	right: number;
	correctAnswer: boolean;
	userAnswer: boolean | null;
	isCorrect: boolean;
};

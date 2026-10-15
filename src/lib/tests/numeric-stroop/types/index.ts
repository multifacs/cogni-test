export type Side = 'left' | 'right';
export type DigitSize = 'small' | 'big';

// One displayed number: its value (1-9) and its physical font size
export type NumberSide = { value: number; size: DigitSize };

export type NumericStroopTask = {
	left: NumberSide;
	right: NumberSide;
	correctAnswer: Side; // side rendered with the 'big' size
	congruent: boolean; // value(big side) > value(small side)
};

export type NumericStroopResult = {
	attempt: number; // 0-based sequential index
	time: number; // ms, performance.now() delta
	leftValue: number;
	rightValue: number;
	congruent: boolean;
	correctAnswer: Side;
	userAnswer: Side;
	isCorrect: boolean;
};

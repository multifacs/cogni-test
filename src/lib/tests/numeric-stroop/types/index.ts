export type Side = 'left' | 'right';
export type DigitSize = 'small' | 'big';

// Background colour selects the rule (task switching, like the Swallow test):
// yellow — compare font size, green — compare numeric value.
export type NumericStroopBackground = 'yellow' | 'green';
export type NumericStroopRule = 'size' | 'value';

export const RULE_BY_BACKGROUND: Record<NumericStroopBackground, NumericStroopRule> = {
	yellow: 'size',
	green: 'value'
};

// One displayed number: its value (1-9) and its physical font size
export type NumberSide = { value: number; size: DigitSize };

export type NumericStroopTask = {
	left: NumberSide;
	right: NumberSide;
	background: NumericStroopBackground; // cue that selects the active rule
	correctAnswer: Side; // side with the big size (yellow) or the bigger value (green)
	congruent: boolean; // value(big side) > value(small side)
};

export type NumericStroopResult = {
	attempt: number; // 0-based sequential index
	time: number; // ms, performance.now() delta
	leftValue: number;
	rightValue: number;
	background: NumericStroopBackground;
	congruent: boolean;
	correctAnswer: Side;
	userAnswer: Side;
	isCorrect: boolean;
};

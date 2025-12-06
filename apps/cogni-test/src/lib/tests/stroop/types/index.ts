export const COLOR_VALUES = ['red', 'blue', 'green', 'cyan', 'magenta', 'yellow'] as const;
export type Color = (typeof COLOR_VALUES)[number];
export type Stage = 'stage -1' | 'stage 1' | 'stage 2' | 'stage 3';
export type Word = Color | Stage;
export type Task = {
	stage: number;
	word: Word;
	color: Color | 'white';
	task: 'both' | 'meaning' | 'color' | 'stage';
};

export interface StroopResult extends Task {
    type: 'stroop';
	attempt: number;
	time: number;
	userAnswer: Color | null;
	isCorrect: boolean;
}

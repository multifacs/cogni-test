export type Direction = 'up' | 'right' | 'down' | 'left';
export type Background = 'red' | 'blue';

export type BirdTask = {
	direction: Direction;
	background: Background;
	correctAnswer: Direction;
};

export interface SwallowResult extends BirdTask {
    // stage: number;
	attempt: number;
	time: number;
	userAnswer: Direction;
	isCorrect: boolean;
}

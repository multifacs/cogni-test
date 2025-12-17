// Game
export type Cell = { letter: string; isCorrect: boolean; isIncorrect: boolean };
export type Word = {
	value: string;
	row: number;
	col: number;
	guessed: boolean;
	attempt: number;
	time: number;
};
export type Selection = { row: number; fromCol: number; toCol: number };

export interface MunsterbergResult extends Omit<Word, 'value'> {
	word: string;
}

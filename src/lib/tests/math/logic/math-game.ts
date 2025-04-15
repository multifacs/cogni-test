import { clamp } from '$lib/utils';
import type { Inequality, MathResult } from '../types';

export class MathGame {
	private readonly stageTaskCounts: number[] = [10];
	private currentTaskIndex: number = 0;
	private startTime: number = 0;
	private tasks: Inequality[] = [];
	private results: MathResult[] = [];

	constructor() {
		this.generateTasks();
	}

	/**
	 * Generates words for all stages.
	 */
	private generateTasks(): void {
		this.tasks.push({ left: 'stage', right: 1, sign: null, answer: null });
		for (let i = 0; i < this.stageTaskCounts[0]; i++) {
			const task = this.getRandomTask();
			this.tasks.push(task);
		}
	}

	/**
	 * Starts the game or advances to the next word.
	 */
	public startNextTask(): void {
		if (this.currentTaskIndex >= this.tasks.length) {
			console.log('Game over!');
			return;
		}
		this.startTime = performance.now();
	}

	/**
	 * Handles the player's color selection.
	 * @param selectedColor The color selected by the player.
	 */
	public handleAnswer(selectedAnswer: boolean | null): void {
		const currentTask = this.getCurrentTask();
		if (currentTask.left != 'stage') {
			const endTime = performance.now();
			const reactionTime = Math.round(clamp(endTime - this.startTime, 0, 3000));
			const isCorrect = currentTask.answer == selectedAnswer;

			this.results.push({
				stage: 1,
				attempt: this.results.length,
				time: reactionTime,
				left: currentTask.left,
				sign: currentTask.sign,
				right: currentTask.right,
				correctAnswer: currentTask.answer,
				userAnswer: selectedAnswer,
				isCorrect
			} as MathResult);
		}

		this.currentTaskIndex++;
	}

	/**
	 * Gets a random color from the available colors.
	 * @returns A random color.
	 */
	private getRandomTask(): Inequality {
		const signs = ['>', '<', '>=', '<=', '='];

		const left = Math.floor(Math.random() * 20 - 5);
		const right = Math.floor(Math.random() * 20 - 5);
		const sign = Math.round(Math.random() * 4);
		let answer = false;
		switch (sign) {
			case 0:
				answer = left > right;
				break;
			case 1:
				answer = left < right;
				break;
			case 2:
				answer = left >= right;
				break;
			case 3:
				answer = left <= right;
				break;
			case 4:
				answer = left == right;
				break;
			default:
				answer = false;
		}
		return { left, right, sign: signs[sign], answer } as Inequality;
	}

	/**
	 * Gets the current word and its color.
	 * @returns The current word and its color.
	 */
	public getCurrentTask(): Inequality {
		return this.tasks[this.currentTaskIndex];
	}

	/**
	 * Gets the results of the game.
	 * @returns The reaction times and correctness of answers.
	 */
	public getResults(): MathResult[] {
		console.log(this.results);
		return this.results;
	}

	/**
	 * Checks if the game is over.
	 * @returns True if the game is over, false otherwise.
	 */
	public isGameOver(): boolean {
		return this.currentTaskIndex >= this.tasks.length;
	}
}

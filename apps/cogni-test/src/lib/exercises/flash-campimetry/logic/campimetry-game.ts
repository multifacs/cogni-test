import { LabColor } from './lab-color.svelte';
import { colors } from './lab-color.svelte';
import { shuffle } from '$lib/utils';
import type { CampimetryTask, CampimetryResult } from '../types';

export class CampimetryGame {
	private currentTaskIndex: number = 0;
	private results: any[] = [];

	private tasks: any[] = [];
	private silhouettes: string[] = [];

	private allColors = Object.keys(colors);

	constructor(silhouettes: string[]) {
		this.silhouettes = silhouettes.slice();
		this.generateTasks();
	}

	/**
	 * Generates tasks for all stages.
	 */
	private generateTasks(): void {
		const colors: Array<string> = [];
		colors.push(...this.allColors);
		shuffle(colors);
		console.log(colors);

		colors.forEach((color) => {
			const task = this.getRandomTask(color);
			task.attempt = this.tasks.length;
			this.tasks.push(task);
		});

		console.log(this.tasks);
	}

	/**
	 * Starts the game or advances to the next word.
	 */
	public startNextTask(): void {
		if (this.currentTaskIndex >= this.tasks.length) {
			console.log('Game over!');
			return;
		}
	}

	/**
	 * Handles the player's color selection.
	 * @param selectedColor The color selected by the player.
	 */
	public handleAnswer(freq: number): void {
		const task = this.getCurrentTask();

		this.results.push({
			attempt: task.attempt,
			silhouette: task.silhouette,
			color: task.color.getColorName(),
			freq,
		});
		this.currentTaskIndex++;
	}

	/**
	 * Gets a random color from the available colors.
	 * @returns A random color.
	 */
	private getRandomTask(colorString: string): any {
		const silhouette = this.silhouettes[Math.floor(Math.random() * this.silhouettes.length)];
		const color = new LabColor();
		color.setColor(colorString);
		const bgColor = new LabColor();
		bgColor.setColor(colorString);
		bgColor.jitterColor();

		return {
			attempt: 0,
			silhouette,
			color,
			bgColor
		};
	}

	/**
	 * Gets the current word and its color.
	 * @returns The current word and its color.
	 */
	public getCurrentTask(): any {
		return this.tasks[this.currentTaskIndex];
	}

	/**
	 * Gets the results of the game.
	 * @returns The reaction times and correctness of answers.
	 */
	public getResults(): any[] {
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

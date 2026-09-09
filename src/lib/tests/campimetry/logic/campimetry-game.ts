import { LabColor } from './lab-color.svelte';
import { colors } from './lab-color.svelte';
import { shuffle } from '$lib/utils';
import type { CampimetryTask, CampimetryResult } from '../types';
export class CampimetryGame {
	private currentTaskIndex: number = 0;
	private results: CampimetryResult[] = [];

	private tasks: CampimetryTask[] = [];
	private silhouettes: string[] = [];

	private startTime: number = 0;

	private allColors = Object.keys(colors);

	/** Use the full color palette instead of a random ~60% subset (exercise mode). */
	private fullPalette: boolean;

	constructor(silhouettes: string[], options?: { fullPalette?: boolean }) {
		this.silhouettes = silhouettes.slice();
		this.fullPalette = options?.fullPalette ?? false;
		this.generateTasks();
	}

	/**
	 * Generates tasks for all stages.
	 */
	private generateTasks(): void {
		const colors: Array<string> = this.fullPalette
			? this.pickAllColors()
			: this.pickColorSubset();
		console.log(colors);

		colors.forEach((color) => {
			const task1 = this.getRandomTask(color);
			task1.attempt = this.tasks.length;
			this.tasks.push(task1);
			const task2 = structuredClone(task1);
			task2.color = new LabColor(task1.color);
			task2.attempt += 1;
			task2.stage = 2;
			task2.op = task2.op == '+' ? '-' : '+';
			this.tasks.push(task2);
		});
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
	public handleAnswer(delta: number): void {
		const task = this.getCurrentTask();
		const endTime = performance.now();
		const reactionTime = Math.round(endTime - this.startTime);

		this.results.push({
			attempt: task.attempt,
			stage: task.stage,
			silhouette: task.silhouette,
			color: task.color.getColorName(),
			channel: task.channel,
			op: task.op,
			delta: delta,
			time: reactionTime
		});
		this.currentTaskIndex++;
	}

	/**
	 * Gets a random color from the available colors.
	 * @returns A random color.
	 */
	private getRandomTask(colorString: string): CampimetryTask {
		const op = Math.round(Math.random()) == 1 ? '+' : '-';
		const channel = Math.round(Math.random()) == 1 ? 'a' : 'b';

		const silhouette = this.silhouettes[Math.floor(Math.random() * this.silhouettes.length)];
		const color = new LabColor();
		color.setColor(colorString);

		return {
			attempt: 0,
			stage: 1,
			silhouette,
			channel,
			op,
			color
		};
	}

	/** Full palette — one task pair per color (exercise mode). */
	private pickAllColors(): string[] {
		const all = this.allColors.slice();
		shuffle(all);
		return all;
	}

	/** Random ~60% subset of the palette (test mode). */
	private pickColorSubset(): string[] {
		let NUM_OF_COLORS = Math.round((this.allColors.length / 5) * 3);

		const colors: Array<string> = [];

		for (let i = 4; i < 9; i += 2) {
			const randomChoice = Math.round(Math.random());
			colors.push(this.allColors[i + randomChoice]);
		}
		NUM_OF_COLORS -= 3;

		const restOfColors = this.allColors.slice(0, 4);
		shuffle(restOfColors);

		colors.push(...restOfColors.slice(0, NUM_OF_COLORS));
		shuffle(colors);
		return colors;
	}

	/**
	 * Gets the current word and its color.
	 * @returns The current word and its color.
	 */
	public getCurrentTask(): CampimetryTask {
		return this.tasks[this.currentTaskIndex];
	}

	/**
	 * Gets the results of the game.
	 * @returns The reaction times and correctness of answers.
	 */
	public getResults(): CampimetryResult[] {
		return this.results;
	}

	/**
	 * Checks if the game is over.
	 * @returns True if the game is over, false otherwise.
	 */
	public isGameOver(): boolean {
		return this.currentTaskIndex >= this.tasks.length;
	}

	public getTotalTasks(): number {
		return this.tasks.length;
	}

	public getCurrentTaskNumber(): number {
		return this.currentTaskIndex + 1;
	}

	/**
	 * Gets the unique color names in task order (for the progress dots).
	 * Each color is played as a stage-1 + stage-2 pair, so this returns
	 * one entry per color, e.g. ['dark-blue', 'light-magenta', ...].
	 */
	public getTaskColors(): string[] {
		const seen = new Set<string>();
		const unique: string[] = [];
		for (const task of this.tasks) {
			const name = task.color.getColorName();
			if (!seen.has(name)) {
				seen.add(name);
				unique.push(name);
			}
		}
		return unique;
	}

	/**
	 * Gets the index of the current task's color within getTaskColors().
	 */
	public getCurrentColorIndex(): number {
		return this.getTaskColors().indexOf(this.getCurrentTask().color.getColorName());
	}
}

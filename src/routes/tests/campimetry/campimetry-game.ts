import { LabColor } from "./lab-color.svelte";
import { colors } from "./lab-color.svelte";
import { shuffle } from "$lib";

export type Silhouette = {
    answer: string;
    color: LabColor;
    channel: 'a' | 'b';
    op: '+' | '-';
}

import type { Result } from "$lib/components/result";

export class CampimetryGame {
    // private readonly stageTaskCounts: number[] = [5]; // Words per stage
    private currentTaskIndex: number = 0;
    private currentStage: number = 1;

    private results: Result[] = [];

    private tasks: Silhouette[] = [];
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
        shuffle(this.allColors);

        this.allColors.forEach(color => {
            this.tasks.push(this.getRandomTask(color));
        })
    }

    /**
     * Handles the player's color selection.
     * @param selectedColor The color selected by the player.
     */
    public handleAnswer(delta: number): void {
        console.log("logic stage:", this.currentStage);
        let x = this.currentTaskIndex + 1;
        if (this.currentStage == 2) {
            x += this.allColors.length - 1;
        }
        const y = delta;
        const isCorrect = true;
        const stage = this.currentStage;

        this.results.push({
            x,
            y,
            isCorrect,
            stage
        });
        if (this.currentStage == 1) this.currentTaskIndex++;
        this.currentStage = (this.currentStage + 2) % 2 + 1
    }

    /**
     * Gets a random color from the available colors.
     * @returns A random color.
     */
    private getRandomTask(colorString: string): Silhouette {
        const op = (Math.round(Math.random()) == 1) ? '+' : '-';
        const channel = (Math.round(Math.random()) == 1) ? 'a' : 'b';

        const answer = this.silhouettes[Math.floor(Math.random() * this.silhouettes.length)];
        const color = new LabColor();
        color.setColor(colorString);

        return {
            answer,
            color,
            channel,
            op
        }
    }

    /**
     * Gets the current word and its color.
     * @returns The current word and its color.
     */
    public getCurrentTask(): Silhouette {
        return this.tasks[this.currentTaskIndex];
    }

    /**
     * Gets the results of the game.
     * @returns The reaction times and correctness of answers.
     */
    public getResults(): Result[] {
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

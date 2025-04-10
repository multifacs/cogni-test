export type Color = 'red' | 'blue' | 'green' | 'cyan' | 'magenta' | 'yellow';
export type Task = { stage: number; word: string; color: Color | 'white'; task: 'meaning' | 'color' | 'stage' };
import type { Result } from "$lib/components/charts/types";
import { clamp } from "$lib/utils";

export class StroopGame {
    private readonly colors: Color[] = ['red', 'blue', 'green', 'cyan', 'magenta', 'yellow'];
    private readonly stageWordCounts: number[] = [5, 10, 10]; // Words per stage
    // private readonly stageWordCounts: number[] = [2, 2, 2]; // Words per stage
    // private currentStage: number = 0;
    private currentTaskIndex: number = 0;
    private currentX: number = 0;
    private results: Result[] = [];
    private startTime: number = 0;
    private tasks: Task[] = [];

    constructor() {
        this.generateTasks();
    }

    /**
     * Generates words for all stages.
     */
    private generateTasks(): void {
        let lastColor = '';
        // Stage 1: Word color matches meaning
        this.tasks.push({ stage: 0, word: "stage 1", color: 'white', task: 'stage' } as Task);
        for (let i = 0; i < this.stageWordCounts[0]; i++) {

            let color = this.getRandomTask();
            while (color == lastColor) color = this.getRandomTask();
            lastColor = color;

            this.tasks.push({ stage: 1, word: color, color: color, task: 'meaning' } as Task);
        }

        this.tasks.push({ stage: 0, word: "stage 2", color: 'white', task: 'stage' } as Task);
        // Stage 2: Word color differs from meaning, task is to match meaning
        for (let i = 0; i < this.stageWordCounts[1]; i++) {
            const word = this.getRandomTask();
            let color = this.getRandomTask();
            while (color === word || color == lastColor) {
                color = this.getRandomTask(); // Ensure color and word are different
            }
            lastColor = color;
            this.tasks.push({ stage: 2, word, color, task: 'meaning' } as Task);
        }

        this.tasks.push({ stage: 0, word: "stage 3", color: 'white', task: 'stage' } as Task);
        // Stage 3: Word color differs from meaning, task is to match color
        for (let i = 0; i < this.stageWordCounts[2]; i++) {
            const word = this.getRandomTask();
            let color = this.getRandomTask();
            while (color === word || color == lastColor) {
                color = this.getRandomTask(); // Ensure color and word are different
            }
            lastColor = color;
            this.tasks.push({ stage: 3, word, color, task: 'color' } as Task);
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
    public handleAnswer(selectedColor: Color | null): void {
        const currentTask = this.getCurrentTask();

        if (currentTask.task != 'stage') {
            this.currentX++;

            const endTime = performance.now();
            const reactionTime = clamp(endTime - this.startTime, 0, 3000);
            const isCorrect =
                currentTask.task === 'meaning'
                    ? selectedColor === currentTask.word
                    : selectedColor === currentTask.color;
            this.results.push({
                x: this.results.length + 1,
                stage: currentTask.stage,
                y: reactionTime,
                isCorrect
            } as Result);
        }

        this.currentTaskIndex++;
    }

    /**
     * Gets a random color from the available colors.
     * @returns A random color.
     */
    private getRandomTask(): Color {
        return this.colors[Math.floor(Math.random() * this.colors.length)];
    }

    /**
     * Gets the current word and its color.
     * @returns The current word and its color.
     */
    public getCurrentTask(): Task {
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

import { LabColor } from "./lab-color";

export type Silhouette = {
    answer: string;
    backgroundColor?: LabColor;
    silhouetteColor?: LabColor;
    channel?: 'a' | 'b';
    op?: '+' | '-';
    reverse?: boolean;
}

export class CampimetryGame {
    private readonly stageTaskCounts: number[] = [5, 5]; // Words per stage
    private currentStage: number = 0;
    private currentTaskIndex: number = 0;

    private numTries: number[] = [];

    private tasks: Silhouette[] = [];
    private silhouettes: string[] = [];

    constructor(silhouettes: string[]) {
        this.generateTasks();
        this.silhouettes = silhouettes.slice();
    }

    /**
     * Generates tasks for all stages.
     */
    private generateTasks(): void {
        this.tasks.push({ answer: "stage 1" });
        for (let i = 0; i < this.stageTaskCounts[0]; i++) {
            const task = this.getRandomTask(false);
            this.tasks.push(task);
        }
        this.tasks.push({ answer: "stage 2" });
        for (let i = 0; i < this.stageTaskCounts[1]; i++) {
            const task = this.getRandomTask(true);
            this.tasks.push(task);
        }
    }

    /**
     * Starts the game or advances to the next task.
     */
    public startNextTask(): void {
        if (this.currentTaskIndex >= this.tasks.length) {
            console.log('Game over!');
            return;
        }
        // this.startTime = performance.now();
    }

    /**
     * Handles the player's color selection.
     * @param selectedColor The color selected by the player.
     */
    public handleSelection(numTries?: number): void {
        const currentTask = this.getCurrentTask();
        if (currentTask.answer != 'stage' && numTries) {
            this.numTries.push(numTries);
        }
        this.currentTaskIndex++;
    }

    /**
     * Gets a random color from the available colors.
     * @returns A random color.
     */
    private getRandomTask(reverse: boolean): Silhouette {
        const answer = this.silhouettes[Math.floor(Math.random() * this.silhouettes.length)];
        const backgroundColor = new LabColor();
        // const reverse = Math.round(Math.random()) == 1;

        let silhouetteColor = new LabColor(backgroundColor);
        if (reverse) {
            silhouetteColor = new LabColor();
        }

        const channel = (Math.round(Math.random()) == 1) ? 'a' : 'b';
        const op = (Math.round(Math.random()) == 1) ? '+' : '-';

        return {
            answer,
            backgroundColor,
            silhouetteColor,
            channel,
            op,
            reverse
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
    public getResults(): { numTries: number[] } {
        return {
            numTries: this.numTries
        };
    }

    /**
     * Checks if the game is over.
     * @returns True if the game is over, false otherwise.
     */
    public isGameOver(): boolean {
        return this.currentTaskIndex >= this.tasks.length;
    }
}

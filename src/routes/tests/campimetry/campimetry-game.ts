import { LabColor } from "./lab-color.svelte";

export type Silhouette = {
    answer: string;
    backgroundColor?: LabColor;
    silhouetteColor?: LabColor;
    channel?: 'a' | 'b';
    op?: '+' | '-';
}

export class CampimetryGame {
    private readonly stageTaskCounts: number[] = [5, 5]; // Words per stage
    private currentStage: number = 0;
    private currentTaskIndex: number = 0;

    private delta: number[] = [];

    private tasks: Silhouette[] = [];
    private silhouettes: string[] = [];

    constructor(silhouettes: string[]) {
        this.silhouettes = silhouettes.slice();
        this.generateTasks();
    }

    /**
     * Generates tasks for all stages.
     */
    private generateTasks(): void {
        this.tasks.push({ answer: "stage 1" });
        for (let i = 0; i < this.stageTaskCounts[0]; i++) {
            const task = this.getRandomTask('+');
            this.tasks.push(task);
        }
        this.tasks.push({ answer: "stage 2" });
        for (let i = 0; i < this.stageTaskCounts[1]; i++) {
            const task = this.getRandomTask('-');
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
    public handleAnswer(delta?: number): void {
        const currentTask = this.getCurrentTask();
        if (currentTask.answer != 'stage' && delta) {
            this.delta.push(delta);
        }
        this.currentTaskIndex++;
    }

    /**
     * Gets a random color from the available colors.
     * @returns A random color.
     */
    private getRandomTask(op: '+' | '-'): Silhouette {
        const answer = this.silhouettes[Math.floor(Math.random() * this.silhouettes.length)];
        const backgroundColor = new LabColor();
        // const reverse = Math.round(Math.random()) == 1;

        let silhouetteColor = new LabColor(backgroundColor);
        const channel = (Math.round(Math.random()) == 1) ? 'a' : 'b';
        if (op == '-') {
            channel == 'a' ? silhouetteColor.setRandomA() : silhouetteColor.setRandomB()
        }

        return {
            answer,
            backgroundColor,
            silhouetteColor,
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
    public getResults(): { delta: number[] } {
        return {
            delta: this.delta
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

export type Inequality = {
    left: number | "stage" | null,
    right: number | null,
    sign: '>' | '<' | '>=' | '<=' | '=' | null,
    answer: boolean | null
}

export class MathTestGame {
    private readonly stageTaskCounts: number[] = [10]; // Words per stage
    private currentStage: number = 0;
    private currentTaskIndex: number = 0;
    private reactionTimes: number[] = [];
    private correctAnswers: boolean[] = [];
    private startTime: number = 0;
    private tasks: Inequality[] = [];
    constructor() {
        this.generateTasks();
    }

    /**
     * Generates words for all stages.
     */
    private generateTasks(): void {
        this.tasks.push({ left: "stage", right: 1, sign: null, answer: null });
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
    public handleSelection(selectedAnswer: boolean | null): void {
        const currentTask = this.getCurrentTask();
        if (currentTask.left != 'stage') {
            const endTime = performance.now();
            const reactionTime = endTime - this.startTime;
            this.reactionTimes.push(reactionTime);

            const isCorrect = currentTask.answer == selectedAnswer;
            this.correctAnswers.push(isCorrect);
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
            default: answer = false;
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
    public getResults(): { reactionTimes: number[]; correctAnswers: boolean[] } {
        return {
            reactionTimes: this.reactionTimes,
            correctAnswers: this.correctAnswers,
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

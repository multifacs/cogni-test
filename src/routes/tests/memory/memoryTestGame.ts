export type Word = {
    value: string;
    isCorrect: boolean;

    // типа генерить слова которые есть в списке или нет в списке
}

export class MemoryTestGame {
    private readonly stageTaskCounts: number[] = [10]; // Words per stage
    private currentStage: number = 0;
    private currentTaskIndex: number = 0;
    private reactionTimes: number[] = [];
    private correctAnswers: boolean[] = [];
    private startTime: number = 0;
    private tasks: Word[] = [];
    constructor() {
        this.generateTasks();
    }

    /**
     * Generates words for all stages.
     */
    private generateTasks(): void {
        // список слов нужно сгенерить
        this.tasks.push({ value: "здесь список слов", isCorrect: false });
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
        if (currentTask.value != 'спислк слов') {
            const endTime = performance.now();
            const reactionTime = endTime - this.startTime;
            this.reactionTimes.push(reactionTime);

            const isCorrect = currentTask.isCorrect == selectedAnswer;
            this.correctAnswers.push(isCorrect);
        }

        this.currentTaskIndex++;
    }

    /**
     * Gets a random color from the available colors.
     * @returns A random color.
     */
    private getRandomTask(): Word {
        return { value: '', isCorrect: false };
    }

    /**
     * Gets the current word and its color.
     * @returns The current word and its color.
     */
    public getCurrentTask(): Word {
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

export type Inequality = {
    left: number | "stage" | null,
    right: number | null,
    sign: '>' | '<' | '>=' | '<=' | '=' | null,
    answer: boolean | null
}

export class MathTestGame {
    private readonly stageInequalityCounts: number[] = [10]; // Words per stage
    private currentStage: number = 0;
    private currentInequalityIndex: number = 0;
    private reactionTimes: number[] = [];
    private correctAnswers: boolean[] = [];
    private startTime: number = 0;
    private inequalities: Inequality[] = [];
    constructor() {
        this.generateInequalities();
    }

    /**
     * Generates words for all stages.
     */
    private generateInequalities(): void {
        this.inequalities.push({ left: "stage", right: 1, sign: null, answer: null });
        for (let i = 0; i < this.stageInequalityCounts[0]; i++) {
            const color = this.getRandomColor();
            this.inequalities.push({ word: color, color: color, task: 'meaning' });
        }
    }

    /**
     * Starts the game or advances to the next word.
     */
    public startNextWord(): void {
        if (this.currentInequalityIndex >= this.inequalities.length) {
            console.log('Game over!');
            return;
        }
        this.startTime = performance.now();
    }

    /**
     * Handles the player's color selection.
     * @param selectedColor The color selected by the player.
     */
    public handleColorSelection(selectedColor: Color | null): void {
        const currentWord = this.inequalities[this.currentInequalityIndex];
        if (currentWord.task != 'stage') {
            const endTime = performance.now();
            const reactionTime = endTime - this.startTime;
            this.reactionTimes.push(reactionTime);

            const isCorrect =
                currentWord.task === 'meaning'
                    ? selectedColor === currentWord.word
                    : selectedColor === currentWord.color;
            this.correctAnswers.push(isCorrect);
        }

        this.currentInequalityIndex++;
    }

    /**
     * Gets a random color from the available colors.
     * @returns A random color.
     */
    private getRandomInequality(): Color {
        return this.colors[Math.floor(Math.random() * this.colors.length)];
    }

    /**
     * Gets the current word and its color.
     * @returns The current word and its color.
     */
    public getCurrentWord(): { word: string; color: Color | 'white'; task: 'meaning' | 'color' | 'stage' } {
        return this.inequalities[this.currentInequalityIndex];
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
        return this.currentInequalityIndex >= this.inequalities.length;
    }
}

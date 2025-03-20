export type Color = 'red' | 'blue' | 'green' | 'cyan' | 'magenta' | 'yellow';

export class StroopTestGame {
    private readonly colors: Color[] = ['red', 'blue', 'green', 'cyan', 'magenta', 'yellow'];
    private readonly stageWordCounts: number[] = [5, 10, 10]; // Words per stage
    private currentStage: number = 0;
    private currentWordIndex: number = 0;
    private reactionTimes: number[] = [];
    private correctAnswers: boolean[] = [];
    private startTime: number = 0;
    private words: { word: string; color: Color | 'white'; task: 'meaning' | 'color' | 'stage' }[] = [];

    constructor() {
        this.generateWords();
    }

    /**
     * Generates words for all stages.
     */
    private generateWords(): void {
        // Stage 1: Word color matches meaning
        this.words.push({ word: "stage 1", color: 'white', task: 'stage' });
        for (let i = 0; i < this.stageWordCounts[0]; i++) {
            const color = this.getRandomColor();
            this.words.push({ word: color, color: color, task: 'meaning' });
        }

        this.words.push({ word: "stage 2", color: 'white', task: 'stage' });
        // Stage 2: Word color differs from meaning, task is to match meaning
        for (let i = 0; i < this.stageWordCounts[1]; i++) {
            const word = this.getRandomColor();
            let color = this.getRandomColor();
            while (color === word) {
                color = this.getRandomColor(); // Ensure color and word are different
            }
            this.words.push({ word, color, task: 'meaning' });
        }

        this.words.push({ word: "stage 3", color: 'white', task: 'stage' });
        // Stage 3: Word color differs from meaning, task is to match color
        for (let i = 0; i < this.stageWordCounts[2]; i++) {
            const word = this.getRandomColor();
            let color = this.getRandomColor();
            while (color === word) {
                color = this.getRandomColor(); // Ensure color and word are different
            }
            this.words.push({ word, color, task: 'color' });
        }
    }

    /**
     * Starts the game or advances to the next word.
     */
    public startNextWord(): void {
        if (this.currentWordIndex >= this.words.length) {
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
        const currentWord = this.words[this.currentWordIndex];
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

        this.currentWordIndex++;
    }

    /**
     * Gets a random color from the available colors.
     * @returns A random color.
     */
    private getRandomColor(): Color {
        return this.colors[Math.floor(Math.random() * this.colors.length)];
    }

    /**
     * Gets the current word and its color.
     * @returns The current word and its color.
     */
    public getCurrentWord(): { word: string; color: Color | 'white'; task: 'meaning' | 'color' | 'stage' } {
        return this.words[this.currentWordIndex];
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
        return this.currentWordIndex >= this.words.length;
    }
}

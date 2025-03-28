export type Word = {
    value: string;
    isCorrect: boolean;
};

export class MemoryTestGame {
    private readonly memorizationCount: number = 6;
    private readonly totalTasks: number = 10;

    private memorizedWords: string[] = [];
    private allWords: string[] = [];
    private tasks: Word[] = [];

    private currentTaskIndex: number = 0;
    private reactionTimes: number[] = [];
    private correctAnswers: boolean[] = [];
    private startTime: number = 0;

    constructor(wordPool: string[]) {
        this.allWords = wordPool;
        this.generateTasks();
    }

    private shuffle<T>(arr: T[]): T[] {
        return arr.map(value => ({ value, sort: Math.random() }))
                  .sort((a, b) => a.sort - b.sort)
                  .map(({ value }) => value);
    }

    private generateTasks() {
        const shuffled = this.shuffle(this.allWords);
        this.memorizedWords = shuffled.slice(0, this.memorizationCount);

        const remaining = shuffled.slice(this.memorizationCount);
        const falseWords = remaining.slice(0, this.totalTasks / 2);

        const trueTasks: Word[] = this.memorizedWords.slice(0, this.totalTasks / 2).map(word => ({
            value: word,
            isCorrect: true
        }));

        const falseTasks: Word[] = falseWords.map(word => ({
            value: word,
            isCorrect: false
        }));

        this.tasks = this.shuffle([...trueTasks, ...falseTasks]);
    }

    public getMemorizationWords(): string[] {
        return this.memorizedWords;
    }

    public startNextTask(): void {
        this.startTime = performance.now();
    }

    public handleSelection(selectedAnswer: boolean | null): void {
        const currentTask = this.getCurrentTask();
        const endTime = performance.now();
        const reactionTime = endTime - this.startTime;
        this.reactionTimes.push(reactionTime);

        const isCorrect = currentTask.isCorrect === selectedAnswer;
        this.correctAnswers.push(isCorrect);

        this.currentTaskIndex++;
    }

    public getCurrentTask(): Word {
        return this.tasks[this.currentTaskIndex];
    }

    public isGameOver(): boolean {
        return this.currentTaskIndex >= this.tasks.length;
    }

    public getResults() {
        return {
            reactionTimes: this.reactionTimes,
            correctAnswers: this.correctAnswers
        };
    }
}

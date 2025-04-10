export type Word = {
    value: string;
    isCorrect: boolean;
};
import type { Result } from "$lib/components/charts/types";

export class MemoryGame {
    private readonly memorizationCount: number = 6;
    private readonly totalTasks: number = 10;

    private memorizedWords: string[] = [];
    private allWords: string[] = [];
    private tasks: Word[] = [];

    private currentTaskIndex: number = 0;
    private results: Result[] = [];
    private startTime: number = 0;
    private currentX: number = 0;

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
        this.currentX++;
        const currentTask = this.getCurrentTask();
        const endTime = performance.now();
        const reactionTime = endTime - this.startTime;
        const isCorrect = currentTask.isCorrect === selectedAnswer;
        this.results.push({
            x: this.currentX,
            y: reactionTime,
            stage: 1,
            isCorrect
        } as Result);

        this.currentTaskIndex++;
    }

    public getCurrentTask(): Word {
        return this.tasks[this.currentTaskIndex];
    }

    public isGameOver(): boolean {
        return this.currentTaskIndex >= this.tasks.length;
    }

    public getResults() {
        return this.results;
    }
}

import { shuffle } from '$lib/utils';
import type { Word, MemoryResult } from '../types';

export class MemoryGame {
	private readonly memorizationCount: number = 6;
	private readonly totalTasks: number = 10;

	private memorizedWords: string[] = [];
	private allWords: string[] = [];
	private tasks: Word[] = [];

	private currentTaskIndex: number = 0;
	private results: MemoryResult[] = [];
	private startTime: number = 0;
	private currentX: number = 0;

	constructor(wordPool: string[]) {
		this.allWords = wordPool;
		this.generateTasks();
	}

	private generateTasks() {
		const shuffled = structuredClone(this.allWords);
		shuffle(shuffled);
		this.memorizedWords = shuffled.slice(0, this.memorizationCount);

		const remaining = shuffled.slice(this.memorizationCount);
		const falseWords = remaining.slice(0, this.totalTasks / 2);

		const trueTasks: Word[] = this.memorizedWords.slice(0, this.totalTasks / 2).map((word) => ({
			value: word,
			isCorrect: true
		}));

		const falseTasks: Word[] = falseWords.map((word) => ({
			value: word,
			isCorrect: false
		}));

		this.tasks = [...trueTasks, ...falseTasks];
		shuffle(this.tasks);
		console.log(this.tasks);
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
		const reactionTime = Math.round(endTime - this.startTime);
		const isCorrect = currentTask.isCorrect === selectedAnswer;
		this.results.push({
			attempt: this.results.length,
			time: reactionTime,
			word: currentTask.value,
			correctAnswer: currentTask.isCorrect,
			userAnswer: selectedAnswer,
			isCorrect
		} as MemoryResult);

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

	public getWords() {
		return this.memorizedWords;
	}
}

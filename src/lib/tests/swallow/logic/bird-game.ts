import type { Background, SwallowResult, BirdTask, Direction } from '../types';

export class BirdGame {
	private readonly totalTasks = 100;
	private readonly maxLives = 3;

	private tasks: BirdTask[] = [];
	private results: SwallowResult[] = [];
	private currentTaskIndex = 0;

	private startTime = 0;
	private livesLeft = this.maxLives;

	constructor() {
		this.generateTasks();
	}

	private generateTasks() {
		const directions: Direction[] = ['up', 'right', 'down', 'left'];
		const opposite: Record<Direction, Direction> = {
			up: 'down',
			down: 'up',
			left: 'right',
			right: 'left'
		};

		let lastTask: Partial<BirdTask> = {};

		while (this.tasks.length < this.totalTasks) {
			const direction = directions[Math.floor(Math.random() * directions.length)];
			const background: Background = Math.random() < 0.5 ? 'red' : 'blue';
			const correctAnswer = background === 'blue' ? direction : opposite[direction];

			if (lastTask.direction === direction && lastTask.background === background) {
				continue;
			}

			const task: BirdTask = { direction, background, correctAnswer };
			this.tasks.push(task);
			lastTask = task;
		}
	}

	public startNextTask(): void {
		this.startTime = performance.now();
	}

	public handleAnswer(answer: Direction): void {
		const currentTask = this.tasks[this.currentTaskIndex];
		const endTime = performance.now();
		const timeTaken = Math.round(endTime - this.startTime);

		const isCorrect = answer === currentTask.correctAnswer;
		if (!isCorrect) {
			this.livesLeft--;
		}

		this.results.push({
			// stage: 1,
			attempt: this.results.length,
			time: timeTaken,
			direction: currentTask.direction,
			background: currentTask.background,
			correctAnswer: currentTask.correctAnswer,
			userAnswer: answer,
			isCorrect
		});

		this.currentTaskIndex++;
	}

	public getCurrentTask(): BirdTask {
		return this.tasks[this.currentTaskIndex];
	}

	public getLives(): number {
		return this.livesLeft;
	}

	public setLives(livesLeft: number): void {
		this.livesLeft = livesLeft;
	}

	public getResults(): SwallowResult[] {
		return this.results;
	}

	public isGameOver(): boolean {
		return this.livesLeft <= 0 || this.currentTaskIndex >= this.totalTasks;
	}
}

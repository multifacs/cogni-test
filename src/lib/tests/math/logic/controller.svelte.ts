import { MathGame } from './math-game'; // Adjust the import path as needed
import { type Sign as SignType } from './math-game';

export class GameState {
	private isGameRunning = $state(false);

	// Game state
	private currentLeft: string | number = $state('stage');
	private currentSign: SignType | null = $state(null);
	private currentRight: number | null = $state(1);

	private score = 0;
	DURATION = 3;
	private timeLeft = $state(this.DURATION);
	private showResults = $state(false);
	private timer: ReturnType<typeof setInterval> | null = null;

	// Game logic
	private game: MathGame = $state(Object());

	private gameEnd = () => {};

	constructor(gameEnd: () => void) {
		this.gameEnd = gameEnd;
	}

	public getState() {
		return {
			isGameRunning: this.isGameRunning,
			currentLeft: this.currentLeft,
			currentSign: this.currentSign,
			currentRight: this.currentRight,
			timeLeft: this.timeLeft
		};
	}

	public resetGame() {
		this.game = new MathGame();
		this.score = 0;
		this.isGameRunning = true;
		this.nextTask();
	}

	public updateState(left: string | number, sign: SignType | null, right: number | null) {
		this.currentLeft = left;
		this.currentSign = sign;
		this.currentRight = right;
		this.timeLeft = this.DURATION;
	}

	public stopGame() {
		this.isGameRunning = false;
		this.updateState('stage', null, 1);
		this.clearTimer();
		this.gameEnd();
	}

	public startTimer() {
		this.clearTimer();
		this.timer = setInterval(() => {
			this.timeLeft -= 1;
			if (this.timeLeft <= 0) {
				this.clearTimer();
				this.game.handleAnswer(null);
				this.nextTask();
			}
		}, 1000);
	}

	private clearTimer() {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
	}

	private nextTask() {
		if (!this.isGameRunning || this.game.isGameOver()) {
			this.stopGame();
			return;
		}

		this.game.startNextTask();
		const { left, sign, right } = this.game.getCurrentTask();
		this.updateState(left, sign, right);
		this.startTimer();
	}

	public handleAnswer(answer: boolean) {
		if (!this.isGameRunning || this.currentLeft === 'stage') return;
		this.clearTimer();

		this.game.handleAnswer(answer);
		this.score = this.game.getResults().filter((x) => x.isCorrect).length;
		this.nextTask();
	}
}

type Phase = 'idle' | 'computer' | 'player' | 'done';

export class RhythmEngine {
	private beatLength: number;
	private interval: number;

	private beat: number[] = [];
	private userBeat: number[] = [];

	private step = -1;
	private phase: Phase = 'idle';

	private autoJump = false;
	private userJump = false;

	private timer?: ReturnType<typeof setInterval>;

	constructor(beatLength = 4, interval = 600) {
		this.beatLength = beatLength;
		this.interval = interval;
	}

	private stepTimestamps: number[] = [];
	private userTimestamps: number[] = [];

	startComputerPhase() {
		this.beat = Array.from({ length: this.beatLength }, (_, i) =>
			i >= 1 && i <= 4 ? (Math.random() < 0.5 ? 1 : 0) : 0
		);
		this.step = 0;
		this.phase = 'computer';
		this.autoJump = false;

		this.timer = setInterval(() => {
			this.step++;
			if (this.step >= this.beatLength) {
				this.stopTimer();
				this.startPlayerPhase();
				return;
			}
			setTimeout(() => (this.autoJump = this.beat[this.step] === 1), this.interval / 4);
			// this.autoJump = this.beat[this.step] === 1;
			setTimeout(() => (this.autoJump = false), this.interval / 2);
		}, this.interval);
	}

	startPlayerPhase() {
		this.phase = 'player';
		this.step = 0;
		this.userBeat = Array(this.beatLength).fill(0);

		this.timer = setInterval(() => {
			this.step++;
			if (this.step >= this.beatLength) {
				this.stopTimer();
				this.phase = 'done';
			}
			if (this.beat[this.step]) {
				this.stepTimestamps.push(performance.now()); // фиксируем начало попытки
			}
			this.userJump = false;
		}, this.interval);
	}

	registerUserJump() {
		if (this.phase !== 'player') return;
		if (this.step < 0 || this.step >= this.beatLength) return;

		this.userBeat[this.step] = 1;
		this.userJump = true;
		this.userTimestamps.push(performance.now()); // запоминаем время нажатия

		setTimeout(() => (this.userJump = false), this.interval / 2);
	}

	getAutoJump() {
		return this.autoJump;
	}

	getUserJump() {
		return this.userJump;
	}

	getPosition() {
		return this.step;
	}

	getPhase() {
		return this.phase;
	}

	getResults(): { beat: number[]; userBeat: number[] } {
		return { beat: [...this.beat], userBeat: [...this.userBeat] };
	}

	isPerfectMatch() {
		for (let i = 1; i <= 4; i++) {
			if (this.beat[i] !== this.userBeat[i]) return false;
		}
		return true;
	}

	isFinished() {
		return this.phase === 'done';
	}

	private stopTimer() {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = undefined;
		}
	}

	getAverageReactionDelay(): number | null {
		console.log(this.stepTimestamps, this.userTimestamps);
		if (!this.isPerfectMatch()) return null;
		if (this.stepTimestamps.length != this.userTimestamps.length || this.stepTimestamps.length == 0)
			return null;

		let totalDelay = 0;
		for (let i = 0; i < this.stepTimestamps.length; i++) {
			totalDelay += this.userTimestamps[i] - this.stepTimestamps[i];
		}
		totalDelay /= this.stepTimestamps.length;
		return totalDelay || null;
	}
}

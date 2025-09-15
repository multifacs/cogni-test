export default class Metronome {
	constructor(bpm) {
		this.bpm = bpm;
		this.interval = 60000 / bpm;
		this.currentBeat = 0;
		this.isRunning = false;
	}

	start() {
		if (!this.isRunning) {
			this.isRunning = true;
			this.tick();
		}
	}

	stop() {
		this.isRunning = false;
	}

	tick() {
		if (!this.isRunning) return;

		// Здесь можно добавить логику для воспроизведения звука
		console.log(`Beat ${this.currentBeat % 4 === 0 ? 'Quarter' : 'Eighth'}`);

		this.currentBeat++;
		setTimeout(() => this.tick(), this.interval);
	}
}

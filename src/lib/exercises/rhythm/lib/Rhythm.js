export default class Rhythm {
	constructor(metronome, ctx, canvas) {
		this.metronome = metronome;
		this.ctx = ctx;
		this.canvas = canvas;
		this.beatsPerMeasure = 16;
		this.beatWidth = canvas.width / this.beatsPerMeasure;
		this.ballPosition = 0;
		this.userBeats = [];
	}

	init() {
		this.drawGrid();
		this.metronome.start();
		this.animateBall();
	}

	drawGrid() {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		for (let i = 0; i < this.beatsPerMeasure; i++) {
			const x = i * this.beatWidth;
			this.ctx.beginPath();
			this.ctx.moveTo(x, 0);
			this.ctx.lineTo(x, this.canvas.height);
			this.ctx.strokeStyle = '#ccc';
			this.ctx.stroke();
		}
	}

	animateBall() {
		const ballRadius = 10;
		const y = this.canvas.height / 2;

		this.ballPosition += 0.05;
		if (this.ballPosition > this.canvas.width) {
			this.ballPosition = 0;
		}

		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.drawGrid();

		this.ctx.beginPath();
		this.ctx.arc(this.ballPosition, y, ballRadius, 0, Math.PI * 2);
		this.ctx.fillStyle = '#000';
		this.ctx.fill();

		requestAnimationFrame(() => this.animateBall());
	}

	recordBeat(x) {
		const beatIndex = Math.floor(x / this.beatWidth);
		this.userBeats.push(beatIndex);
		this.drawBeatMarker(x);
	}

	drawBeatMarker(x) {
		const y = this.canvas.height / 2;
		const radius = 5;
		this.ctx.beginPath();
		this.ctx.arc(x, y, radius, 0, Math.PI * 2);
		this.ctx.fillStyle = 'red';
		this.ctx.fill();
	}
}

export const colors = {
	black: {
		l: 5,
		a: 0,
		b: 0
	},
	white: {
		l: 94,
		a: 0,
		b: 0
	},
	'dark-magenta': {
		l: 27,
		a: 40,
		b: -26
	},
	'light-magenta': {
		l: 71,
		a: 37,
		b: -26
	},
	'dark-blue': {
		l: 5,
		a: 26,
		b: -45
	},
	'light-blue': {
		l: 57,
		a: 16,
		b: -40
	},
	'dark-green': {
		l: 31,
		a: -27,
		b: 4
	},
	'light-green': {
		l: 79,
		a: -30,
		b: 0
	},
	'dark-red': {
		l: 28,
		a: 41,
		b: 33
	},
	'light-red': {
		l: 74,
		a: 36,
		b: 22
	},
	'dark-yellow': {
		l: 47,
		a: -1,
		b: 53
	},
	'light-yellow': {
		l: 94,
		a: -5,
		b: 55
	}
};

export class LabColor {
	private l: number = $state(0);
	private a: number = $state(0);
	private b: number = $state(0);

	private colorName: string = $state('');

	public setColor(color: string) {
		if (Object.keys(colors).indexOf(color) != -1) {
			this.colorName = color;

			let { l, a, b } = colors[color];
			this.l = l;
			this.a = a;
			this.b = b;
			return;
		} else {
			throw 'no such color';
		}
	}

	constructor(other?: LabColor) {
		if (!other) {
			return;
		}

		this.l = other.l;
		this.a = other.a;
		this.b = other.b;
		this.colorName = other.colorName;
	}

	public getDelta(other: LabColor): number {
		const dA = this.a - other.a;
		const dB = this.b - other.b;
		if (dA != 0) return dA;
		return dB;
	}

	public incL() {
		if (this.l + 1 > 100) {
			this.l = 100;
			return;
		}
		this.l += 1;
	}
	public decL() {
		if (this.l - 1 < 0) {
			this.l = 0;
			return;
		}
		this.l -= 1;
	}
	public incA() {
		if (this.a + 1 > 125) {
			this.a = 125;
			return;
		}
		this.a += 1;
	}
	public decA() {
		if (this.a + 1 < -125) {
			this.a = -125;
			return;
		}
		this.a -= 1;
	}
	public incB() {
		if (this.b + 1 > 125) {
			this.b = 125;
			return;
		}
		this.b += 1;
	}
	public decB() {
		if (this.b - 1 < -125) {
			this.b = -125;
			return;
		}
		this.b -= 1;
	}

	public getColorName() {
		return this.colorName;
	}

	public toString(): string {
		return `lab(${this.l}% ${this.a} ${this.b})`;
	}
}

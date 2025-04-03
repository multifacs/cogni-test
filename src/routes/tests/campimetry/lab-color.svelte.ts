export const colors = {
    'black': {
        l: 6,
        a: 0,
        b: 0
    },
    'white': {
        l: 94,
        a: 0,
        b: 0
    },
    'dark-magenta': {
        l: 24,
        a: 39,
        b: -27
    },
    'light-magenta': {
        l: 69,
        a: 38,
        b: -26
    },
    'dark-blue': {
        l: 10,
        a: 17,
        b: -40
    },
    'light-blue': {
        l: 49,
        a: 16,
        b: -44
    },
    'dark-green': {
        l: 29,
        a: -24,
        b: 5
    },
    'light-green': {
        l: 78,
        a: -35,
        b: -2
    },
    'dark-red': {
        l: 28,
        a: 40,
        b: 31
    },
    'light-red': {
        l: 71,
        a: 36,
        b: 22
    },
}

export class LabColor {
    private l: number = $state(0);
    private a: number = $state(0);
    private b: number = $state(0);

    public setColor(color: string) {
        console.log(Object.keys(colors).indexOf(color), color)
        if (Object.keys(colors).indexOf(color) != -1) {
            let { l, a, b } = colors[color];
            this.l = l;
            this.a = a;
            this.b = b;
            return;
        } else {
            throw "no such color";
        }
    }

    constructor(other?: LabColor) {
        if (!other) {
            return;
        };

        this.l = other.l;
        this.a = other.a;
        this.b = other.b;
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

    public toString(): string {
        return `lab(${this.l}% ${this.a} ${this.b})`;
    }
}
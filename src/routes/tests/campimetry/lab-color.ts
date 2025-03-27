export class LabColor {
    private l: number = $state(0);
    private a: number = $state(0);
    private b: number = $state(0);

    private setRandomColor() {
        this.l = Math.round(Math.random() * 15) + 80; // L between 80 and 95
        this.a = Math.round(Math.random() * 60) - 30; // a between -30 and 30
        this.b = Math.round(Math.random() * 60) - 30; // b between -30 and 30
    }

    constructor(other?: LabColor) {
        if (!other) {
            this.setRandomColor();
            return;
        };

        this.l = other.l;
        this.a = other.a;
        this.b = other.b;
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
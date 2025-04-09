
import { LabColor } from "./lab-color.svelte";
import { colors } from "./lab-color.svelte";
import { shuffle } from "$lib";
import type { Result } from "$lib/components/result";

export type Silhouette = {
    answer: string;
    color: LabColor;
    channel: 'a' | 'b';
    op: '+' | '-';
};

export class CampimetryGame {
    private currentTaskIndex: number = 0;
    private currentStage: number = 1;

    private results: Result[] = [];

    private tasks: Silhouette[] = [];
    private silhouettes: string[] = [];

    private allColors = Object.keys(colors);

    // New fields
    private decreasingSteps: number[] = [];
    private currentDecreaseStep: number = 0;
    private maxDecreaseSteps: number = 0;

    constructor(silhouettes: string[]) {
        this.silhouettes = silhouettes.slice();
        this.generateTasks();
    }

    private getRandomTask(colorName: string): Silhouette {
        const color = colors[colorName];
        const channel: 'a' | 'b' = Math.random() < 0.5 ? 'a' : 'b';
        const op: '+' | '-' = Math.random() < 0.5 ? '+' : '-';
        const answer = this.silhouettes[Math.floor(Math.random() * this.silhouettes.length)];
    
        return {
            answer,
            color,
            channel,
            op
        };
    }
    

    private generateTasks(): void {
        shuffle(this.allColors);
        this.allColors.forEach(color => {
            this.tasks.push(this.getRandomTask(color));
        });

        // Generate decreasing steps once for all tasks (can be moved to per-task logic)
        const initialOffset = this.randomInt(10, 17);
        let stepsCount = this.randomInt(6, 12);
        this.decreasingSteps = this.generateDecreasingSteps(initialOffset, stepsCount);
        this.maxDecreaseSteps = this.decreasingSteps.length;
        this.currentDecreaseStep = 0;
    }

    public handleAnswer(delta: number): void {
        console.log("logic stage:", this.currentStage);
        let x = this.currentTaskIndex + 1;
        if (this.currentStage == 2) {
            x += this.allColors.length - 1;
        }
        const y = delta;
        const isCorrect = true;
        const stage = this.currentStage;

        this.results.push({
            x,
            y,
            isCorrect,
            stage
        });

        if (this.currentStage == 1) {
            this.currentTaskIndex++;
        }
        this.currentStage = (this.currentStage + 2) % 2 + 1;
    }

    public getCurrentTask(): Silhouette {
        return this.tasks[this.currentTaskIndex];
    }

    public getResults(): Result[] {
        return this.results;
    }

    // New logic for smooth decrease
    private generateDecreasingSteps(total: number, steps: number): number[] {
        const base = Math.floor(total / steps);
        const remainder = total % steps;
        const result = Array(steps).fill(base);
        for (let i = 0; i < remainder; i++) {
            result[i]++;
        }
        return result;
    }

    // Called externally when user clicks 'decrease'
    public getNextDecreaseStep(): number | null {
        if (this.currentDecreaseStep >= this.maxDecreaseSteps) return null;
        return this.decreasingSteps[this.currentDecreaseStep++];
    }

    private randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}

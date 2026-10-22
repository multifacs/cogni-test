import {
	RULE_BY_BACKGROUND,
	type NumberSide,
	type NumericStroopBackground,
	type NumericStroopResult,
	type NumericStroopTask,
	type Side
} from '../types';

const MIN_DIGIT = 1;
const MAX_DIGIT = 9;

const BACKGROUNDS: NumericStroopBackground[] = ['yellow', 'green'];

/**
 * Numeric Stroop core logic (issue multifacs/cogni-test#103).
 *
 * Background colour selects the active rule (task switching, like Swallow):
 * yellow — the user answers which number is bigger BY FONT SIZE (physical size),
 * green — which number is bigger BY VALUE. The distractors swap accordingly.
 * Task generation is lazy and unbounded: the only game boundary is the 60s
 * timer owned by the UI component.
 */
export class NumericStroopGame {
	private currentTask: NumericStroopTask | null = null;
	private results: NumericStroopResult[] = [];
	private trialStartTime = 0;

	constructor() {
		this.currentTask = this.generateTask(null);
	}

	public getCurrentTask(): NumericStroopTask {
		if (this.currentTask === null) {
			throw new Error('No current task: the game has no task to answer.');
		}
		return this.currentTask;
	}

	public startNextTask(): void {
		this.getCurrentTask(); // fail loud if state is broken
		this.trialStartTime = performance.now();
	}

	public handleAnswer(answer: Side): void {
		const currentTask = this.getCurrentTask(); // fail loud if no task
		const timeTaken = Math.round(performance.now() - this.trialStartTime);
		const isCorrect = answer === currentTask.correctAnswer;

		this.results.push({
			attempt: this.results.length,
			time: timeTaken,
			leftValue: currentTask.left.value,
			rightValue: currentTask.right.value,
			background: currentTask.background,
			congruent: currentTask.congruent,
			correctAnswer: currentTask.correctAnswer,
			userAnswer: answer,
			isCorrect
		});

		this.currentTask = this.generateTask(currentTask);
	}

	public getResults(): NumericStroopResult[] {
		return this.results;
	}

	/**
	 * Builds the next task, guaranteed different from `previous`
	 * (same values on same sides with the same big side).
	 */
	private generateTask(previous: NumericStroopTask | null): NumericStroopTask {
		let candidate = this.rollTask();
		while (previous !== null && this.isSameTask(candidate, previous)) {
			candidate = this.rollTask();
		}
		return candidate;
	}

	private rollTask(): NumericStroopTask {
		const { big, small } = this.rollDistinctDigits();
		const bigSide: Side = Math.random() < 0.5 ? 'left' : 'right';
		const background = BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];
		const congruent = Math.random() < 0.5;

		// Congruent: the bigger VALUE gets the big FONT.
		// Incongruent: the smaller value gets the big font.
		const bigValue = congruent ? big : small;
		const smallValue = congruent ? small : big;

		const left: NumberSide =
			bigSide === 'left'
				? { value: bigValue, size: 'big' }
				: { value: smallValue, size: 'small' };
		const right: NumberSide =
			bigSide === 'right'
				? { value: bigValue, size: 'big' }
				: { value: smallValue, size: 'small' };

		// The active rule decides which feature is the target:
		// yellow → big font (bigSide), green → bigger value.
		const valueSide: Side = left.value > right.value ? 'left' : 'right';
		const correctAnswer = RULE_BY_BACKGROUND[background] === 'size' ? bigSide : valueSide;

		return { left, right, background, correctAnswer, congruent };
	}

	private rollDistinctDigits(): { big: number; small: number } {
		const first = this.rollDigit();
		let second = this.rollDigit();
		while (second === first) {
			second = this.rollDigit();
		}
		return first > second ? { big: first, small: second } : { big: second, small: first };
	}

	private rollDigit(): number {
		return MIN_DIGIT + Math.floor(Math.random() * (MAX_DIGIT - MIN_DIGIT + 1));
	}

	private isSameTask(a: NumericStroopTask, b: NumericStroopTask): boolean {
		return (
			a.background === b.background &&
			a.correctAnswer === b.correctAnswer &&
			a.left.value === b.left.value &&
			a.right.value === b.right.value
		);
	}
}

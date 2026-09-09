import { page, userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ExercisesPlayground from './Playground.svelte';
import TestsPlayground from '$lib/tests/campimetry/Playground.svelte';
import type { CampimetryResult } from '$lib/tests/campimetry/types';
import { colors } from '$lib/tests/campimetry/logic/lab-color.svelte';

/**
 * Silhouette data as delivered by the route load() functions:
 * name -> static asset URL. The files themselves are never fetched —
 * mask-image does not block rendering, so the game plays fine in tests.
 */
const silhouettes: Record<string, string> = {
	bird: '/campimetry/bird.svg',
	butterfly: '/campimetry/butterfly.svg',
	cat: '/campimetry/cat.svg',
	dog: '/campimetry/dog.svg',
	shark: '/campimetry/shark.svg'
};

/** Both routes pass the same shape of props: data, gameEnd, sendResults. */
function makeProps() {
	const gameEnd = vi.fn();
	const sendResults = vi.fn((_results: CampimetryResult[]) => {});
	return {
		data: { silhouettes },
		gameEnd,
		sendResults,
		results: () => sendResults.mock.calls[0]?.[0] as CampimetryResult[]
	};
}

/** Lets Svelte flush DOM updates after a click. */
async function settle() {
	await new Promise((resolve) => setTimeout(resolve, 0));
}

interface ChoiceButton {
	label: string;
	disabled: boolean;
	url: string;
}

/** Reads the board: choice buttons (label/enabled/mask) + the centre mask URL. */
function readBoard(): { buttons: ChoiceButton[]; centreUrl: string } {
	const buttons: ChoiceButton[] = [
		...document.querySelectorAll<HTMLButtonElement>('button.choice-btn')
	].map((el) => ({
		label: el.getAttribute('aria-label') ?? '',
		disabled: el.hasAttribute('disabled'),
		url: el.style.webkitMaskImage || el.style.maskImage || ''
	}));
	const centre = document.querySelector<HTMLElement>('.background > div');
	const centreUrl = centre ? centre.style.webkitMaskImage || centre.style.maskImage || '' : '';
	return { buttons, centreUrl };
}

/** Reads the progress dots: one per unique color, exactly one highlighted. */
function readDots(): { total: number; current: number } {
	const dots = [...document.querySelectorAll<HTMLElement>('.progress-dot')];
	return {
		total: dots.length,
		current: dots.findIndex((d) => d.classList.contains('progress-dot-current'))
	};
}

/**
 * Plays the whole campimetry game through real UI clicks:
 *
 * - stage 1: click "Проявить фигуру" a couple of times until the choice
 *   buttons unlock, then click the correct silhouette button (the one whose
 *   mask matches the central figure);
 * - stage 2: click "Скрыть фигуру" a couple of times, then click
 *   "Больше не видно".
 */
async function playThrough(maxTasks = 40): Promise<void> {
	for (let task = 0; task < maxTasks; task++) {
		const board = readBoard();

		// The whole game block unmounts on game over
		if (board.buttons.length === 0) {
			expect(page.getByText('Тест окончен').query()).toBeTruthy();
			return;
		}

		// Stage 2: hide the figure, then report it is no longer visible
		if (await page.getByRole('button', { name: 'Скрыть фигуру' }).query()) {
			await userEvent.click(page.getByRole('button', { name: 'Скрыть фигуру' }));
			await userEvent.click(page.getByRole('button', { name: 'Скрыть фигуру' }));
			await userEvent.click(page.getByRole('button', { name: 'Больше не видно' }));
			await settle();
			continue;
		}

		// Stage 1: reveal the figure a couple of times…
		const reveal = page.getByRole('button', { name: 'Проявить фигуру' });
		await userEvent.click(reveal);
		await userEvent.click(reveal);
		await settle();

		// …then click the button whose mask matches the centre silhouette
		const fresh = readBoard();
		const correct = fresh.buttons.find(
			(b) => !b.disabled && b.url !== '' && b.url === fresh.centreUrl
		);
		if (!correct) {
			throw new Error(
				`No enabled choice button matching the centre silhouette (task ${task}): ${JSON.stringify(fresh)}`
			);
		}
		await userEvent.click(page.getByRole('button', { name: correct.label }));
		await settle();
	}
	throw new Error('Game did not finish within the click budget');
}

describe('Campimetry playground — click-through', () => {
	it('exercise mode (fullPalette): plays the full game by clicking and receives every color in the results', async () => {
		const props = makeProps();
		await render(ExercisesPlayground, props);

		// One progress dot per unique color — not two dots per color
		expect(readDots()).toEqual({ total: Object.keys(colors).length, current: 0 });

		await playThrough();

		// gameEnd + sendResults fired exactly once
		expect(props.gameEnd).toHaveBeenCalledTimes(1);
		expect(props.sendResults).toHaveBeenCalledTimes(1);

		const results = props.results();
		// 12 colors × 2 stages = 24 tasks, one result each
		expect(results).toHaveLength(Object.keys(colors).length * 2);

		// Every palette color must appear in the results — nothing lost
		const allColors = Object.keys(colors);
		const seenColors = new Set(results.map((r) => r.color));
		for (const c of allColors) {
			expect(seenColors.has(c), `color "${c}" missing from results`).toBe(true);
		}
		expect(seenColors.size).toBe(allColors.length);

		// Each color is played on both stages
		for (const c of allColors) {
			const stages = results.filter((r) => r.color === c).map((r) => r.stage);
			expect(new Set(stages), `color "${c}" stages`).toEqual(new Set([1, 2]));
		}

		// Stage-1 answers were given after real "reveal" clicks
		expect(results.some((r) => r.stage === 1 && r.delta > 0)).toBe(true);
	}, 30000);

	it('test mode (subset palette): plays the full game by clicking and receives a well-formed result set', async () => {
		const props = makeProps();
		await render(TestsPlayground, props);

		// One progress dot per unique color in the played subset
		const initialDots = readDots();
		expect(initialDots.total).toBeGreaterThanOrEqual(
			Math.floor(Object.keys(colors).length / 2)
		);
		expect(initialDots.total).toBeLessThan(Object.keys(colors).length);
		expect(initialDots.current).toBe(0);

		await playThrough();

		expect(props.gameEnd).toHaveBeenCalledTimes(1);
		expect(props.sendResults).toHaveBeenCalledTimes(1);

		const results = props.results();
		const allColors = Object.keys(colors);

		// Test mode uses a ~60% subset: at least half of the palette, but not all
		const seenColors = new Set(results.map((r) => r.color));
		expect(seenColors.size).toBeGreaterThanOrEqual(Math.floor(allColors.length / 2));
		expect(seenColors.size).toBeLessThan(allColors.length);

		// 2 tasks (stages) per color, one result each
		expect(results).toHaveLength(seenColors.size * 2);

		// Each played color goes through both stages
		for (const c of seenColors) {
			const stages = results.filter((r) => r.color === c).map((r) => r.stage);
			expect(new Set(stages), `color "${c}" stages`).toEqual(new Set([1, 2]));
		}

		// Result rows carry the expected shape
		expect(
			results.every(
				(r) =>
					typeof r.attempt === 'number' &&
					typeof r.silhouette === 'string' &&
					(r.channel === 'a' || r.channel === 'b') &&
					(r.op === '+' || r.op === '-') &&
					typeof r.time === 'number' &&
					typeof r.delta === 'number'
			)
		).toBe(true);

		// Stage-1 answers were given after real "reveal" clicks
		expect(results.some((r) => r.stage === 1 && r.delta > 0)).toBe(true);
	}, 30000);
});

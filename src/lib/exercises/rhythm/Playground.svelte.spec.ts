import { page, userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Playground from './Playground.svelte';
import '../../../app.css';
import type { MetaResult } from '$lib/exercises/types';

function makeProps(difficultyCounts?: Record<string, number>) {
	const gameEnd = vi.fn();
	const sendResults = vi.fn((_results: MetaResult) => {
		void _results;
	});
	return {
		data: {
			difficultyCounts: difficultyCounts ?? { easy: 0, medium: 0, hard: 0 }
		},
		gameEnd,
		sendResults
	};
}

/** Lets Svelte flush DOM updates after a click. */
async function settle() {
	await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('Rhythm Playground — difficulty selection', () => {
	it('renders difficulty buttons and canvas from mount, header shows placeholder', async () => {
		const props = makeProps({ easy: 1, medium: 0, hard: 2 });
		await render(Playground, props);

		// Difficulty buttons are visible in page flow
		await expect.element(page.getByRole('button', { name: /Легкий/i })).toBeVisible();
		await expect.element(page.getByRole('button', { name: /Средний/i })).toBeVisible();
		await expect.element(page.getByRole('button', { name: /Сложный/i })).toBeVisible();

		// Canvas is rendered from mount, before any difficulty choice
		expect(document.querySelector('.canvas-shell canvas')).not.toBeNull();

		// Subtitle shows the placeholder for null difficulty
		const subtitle = page.getByText(/Сложность ритма/);
		await expect.element(subtitle).toBeVisible();
		expect(subtitle.element().textContent).toContain('---');
	});

	it('clicking a difficulty hides the buttons and updates the header label', async () => {
		const props = makeProps({ easy: 0, medium: 3, hard: 0 });
		await render(Playground, props);

		// Click medium difficulty
		const mediumBtn = page.getByRole('button', { name: /Средний/i });
		await expect.element(mediumBtn).toBeVisible();
		await userEvent.click(mediumBtn);
		await settle();

		// Difficulty buttons disappear
		await expect.element(page.getByRole('button', { name: /Легкий/i })).not.toBeInTheDocument();

		// Subtitle shows the chosen difficulty
		const subtitle = page.getByText(/Сложность ритма/);
		expect(subtitle.element().textContent).toContain('Средний');

		// Canvas is still present
		expect(document.querySelector('.canvas-shell canvas')).not.toBeNull();
	});

	it('displays per-difficulty attempt counts', async () => {
		const props = makeProps({ easy: 5, medium: 0, hard: 2 });
		await render(Playground, props);

		const easyBtn = page.getByRole('button', { name: /Легкий/i });
		const mediumBtn = page.getByRole('button', { name: /Средний/i });
		const hardBtn = page.getByRole('button', { name: /Сложный/i });

		await expect.element(easyBtn).toMatchTextContent('5');
		await expect.element(mediumBtn).toMatchTextContent('0');
		await expect.element(hardBtn).toMatchTextContent('2');
	});

	it('paints the canvas after choosing difficulty', async () => {
		const props = makeProps();
		await render(Playground, props);

		const easyBtn = page.getByRole('button', { name: /Легкий/i });
		await expect.element(easyBtn).toBeVisible();
		await userEvent.click(easyBtn);
		await settle();

		// Wait for canvas to appear in the DOM
		const canvas = document.querySelector('.canvas-shell canvas');
		expect(canvas).not.toBeNull();
		expect(canvas instanceof HTMLCanvasElement).toBe(true);

		// Evaluate canvas pixels directly in the browser context
		const c = canvas as HTMLCanvasElement;
		const cx = c.getContext('2d');
		expect(cx).not.toBeNull();
		const imageData = cx!.getImageData(0, 0, c.width, c.height);
		let paintedPixels = 0;
		for (let i = 3; i < imageData.data.length; i += 4) {
			if (imageData.data[i] > 0) paintedPixels++;
		}

		expect(paintedPixels).toBeGreaterThan(0);
	});
});

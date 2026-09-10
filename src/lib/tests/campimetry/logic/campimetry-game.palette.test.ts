import { describe, it, expect } from 'vitest';
import { CampimetryGame } from './campimetry-game';
import { colors } from './lab-color.svelte';

const silhouettes = ['bird', 'butterfly', 'cat', 'dog', 'shark'];

describe('CampimetryGame palette modes', () => {
	it('fullPalette=true generates one task pair per color', () => {
		const game = new CampimetryGame(silhouettes, { fullPalette: true });
		const total = Object.keys(colors).length;
		expect(game.getTotalTasks()).toBe(total * 2); // 2 stages per color
	});

	it('fullPalette=false (default) generates exactly 6 unique colors (12 tasks)', () => {
		const game = new CampimetryGame(silhouettes);
		const total = Object.keys(colors).length;
		const taskColors = game.getTaskColors();

		// pickColorSubset: 3 colors from index pairs 4-9 + 3 from the first 4
		// (disjoint index ranges) => always exactly 6 unique colors × 2 stages.
		expect(game.getTotalTasks()).toBe(12);
		expect(taskColors).toHaveLength(6);

		const palette = new Set(Object.keys(colors));
		expect(taskColors.length).toBeLessThan(total); // strict subset of the full palette
		for (const name of taskColors) {
			expect(palette.has(name)).toBe(true);
		}
	});
});

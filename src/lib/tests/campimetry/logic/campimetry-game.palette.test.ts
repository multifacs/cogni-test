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

	it('fullPalette=false (default) generates a subset (~60%)', () => {
		const game = new CampimetryGame(silhouettes);
		const total = Object.keys(colors).length;
		expect(game.getTotalTasks()).toBeLessThanOrEqual(total * 2);
		expect(game.getTotalTasks()).toBeGreaterThan(0);
	});
});

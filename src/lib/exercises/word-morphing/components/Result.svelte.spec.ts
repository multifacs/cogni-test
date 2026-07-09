import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Result from './Result.svelte';
import type { Color, Shape } from '../types';

const mockOrginalShape: Shape = {
	name: 'круг',
	render: (color) => `<circle cx="50" cy="50" r="40" fill="${color}" />`
};

const mockOrginalColor: Color = {
	name: 'красный',
	value: '#FF0000'
};

const mockCurrentColor: Color = {
	name: 'синий',
	value: '#0000FF'
};

const mockCurrentShape: Shape = {
	name: 'треугольник',
	render: (color) => `<polygon points="50,10 10,90 90,90" fill="${color}" />`
};

describe('Result.svelte', () => {
	describe('Words category', () => {
		it('should display user answers and expected answers correctly', async () => {
			const recalledCombos = ['громкий ананас', 'зелёный ананас', 'яркий ананас'];
			const expectedCombos = ['громкий фрукт', 'зеленый ананас', 'яркий ананас'];

			render(Result, {
				recalledCombos,
				expectedCombos,
				category: 'words',
				originalShape: mockOrginalShape,
				originalColor: mockOrginalColor,
				currentShape: mockCurrentShape,
				currentColor: mockCurrentColor
			});

			expect(page.getByText('Ваши ответы:')).toBeInTheDocument();
			expect(page.getByText('Ожидаемые ответы:')).toBeInTheDocument();

			const listItems = page.getByRole('listitem').elements();
			expect(listItems.length).toBe(6);
			await expect.element(listItems[0]).toHaveStyle({ color: 'var(--color-red-400)' });
			await expect.element(listItems[1]).toHaveStyle({ color: 'var(--color-green-500)' });
			await expect.element(listItems[2]).toHaveStyle({ color: 'var(--color-green-500)' });
		});
	});
});

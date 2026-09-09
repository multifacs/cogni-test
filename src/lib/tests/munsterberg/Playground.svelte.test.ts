import { render, cleanup } from 'vitest-browser-svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Playground from './Playground.svelte';
import { page } from 'vitest/browser';

// app.css подключает Tailwind — без него утилиты сетки
// не сгенерируются в тестовом окружении
import '../../../app.css';

const WORDS = ['дом', 'кот', 'мир', 'сон'];

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

/**
 * В приложении Playground монтируется в main.main (grid-area: main,
 * padding: 4%, overflow-y: auto) внутри контейнера 100dvh. В тесте
 * воссоздаём эту обёртку, чтобы recalcCellSize() считал от реальной
 * ширины, а не от схлопнутого flex-контейнера.
 */
async function mountInMain() {
	const main = document.createElement('main');
	main.className = 'main';
	// фиксируем размеры явно: body в оркестраторе — flex, и без этого
	// main сжимается по контенту, ломая расчёт recalcCellSize()
	main.style.width = '100vw';
	main.style.height = '100vh';
	main.style.overflowY = 'auto';
	main.style.padding = '4%';
	main.style.boxSizing = 'border-box';
	document.body.appendChild(main);
	const result = await render(Playground, {
		target: main,
		props: {
			data: { words: WORDS },
			gameEnd: vi.fn(),
			sendResults: vi.fn()
		}
	});
	// ждём $effect(innerWidth) → recalcCellSize
	await new Promise((r) => setTimeout(r, 300));
	return { ...result, main };
}

function getGrid(container: HTMLElement): HTMLElement {
	const grid = container.querySelector('button.grid') as HTMLElement | null;
	if (!grid) throw new Error('grid not rendered');
	return grid;
}

describe('Playground — адаптивная сетка', () => {
	it('рендерит сетку 9×11 с буквами', async () => {
		const { container } = await mountInMain();
		const grid = getGrid(container);
		const cells = grid.querySelectorAll('.cell');
		expect(cells.length).toBe(9 * 11);
		expect(grid.querySelector('.cell')!.textContent).toMatch(/[А-ЯЁ]/);
	});

	it('умещает сетку в viewport 320×433 (iPhone SE) без обрезки', async () => {
		await page.viewport(320, 433);
		const { container, main } = await mountInMain();
		const grid = getGrid(container);

		const rect = grid.getBoundingClientRect();
		expect(Math.round(rect.bottom)).toBeLessThanOrEqual(433);
		expect(Math.round(rect.right)).toBeLessThanOrEqual(320);
		// ячейки не вырождаются в нечитаемые (29px при прод-ширине .main)
		const cell = grid.querySelector('.cell')!.getBoundingClientRect();
		expect(cell.width).toBeGreaterThanOrEqual(20);
		// сетка использует всю доступную ширину .main, а не половину
		expect(rect.width).toBeGreaterThan(0.8 * main.clientWidth);
	});

	it('на широком экране ячейки не превышают десктопный максимум 42px', async () => {
		await page.viewport(1280, 800);
		const { container } = await mountInMain();
		const cell = getGrid(container).querySelector('.cell')!.getBoundingClientRect();
		expect(cell.width).toBeLessThanOrEqual(42);
	});
});

describe('Playground — координаты тача', () => {
	it('переводит pointer-координаты в ячейку сетки (fix getBoundingClientRect)', async () => {
		await page.viewport(1280, 800);
		const { container } = await mountInMain();
		const grid = getGrid(container);
		const firstCell = grid.querySelector('.cell')!;
		const cr = firstCell.getBoundingClientRect();

		// pointerdown в центре первой ячейки выделяет её
		firstCell.dispatchEvent(
			new PointerEvent('pointerdown', {
				bubbles: true,
				clientX: cr.left + cr.width / 2,
				clientY: cr.top + cr.height / 2
			})
		);
		await new Promise((r) => setTimeout(r, 50));
		expect(firstCell.className).toContain('selected');
	});

	it('grid имеет touch-action: none, чтобы свайп не скроллил страницу', async () => {
		const { container } = await mountInMain();
		const grid = getGrid(container);
		expect(getComputedStyle(grid).touchAction).toBe('none');
	});
});

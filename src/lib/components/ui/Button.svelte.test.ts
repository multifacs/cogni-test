import { render, cleanup } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Button from './Button.svelte';

// app.css подключает Tailwind — без него утилиты flex/items-center
// не сгенерируются в тестовом окружении
import '../../../app.css';

/** Snippet с простым текстом — официальный способ в Svelte 5 */
const text = (t: string) => createRawSnippet(() => ({ render: () => t }));

afterEach(cleanup);

describe('Button', () => {
	it('renders the accessible name from children', async () => {
		const { container } = await render(Button, {
			props: { color: 'green', children: text('Начать тест') }
		});
		const btn = container.querySelector('button');
		expect(btn?.textContent).toBe('Начать тест');
	});

	it('uses flex centering so icons and text align vertically (layout-shift fix)', async () => {
		const { container } = await render(Button, {
			props: { color: 'green', children: text('Войти') }
		});
		const style = getComputedStyle(container.querySelector('button')!);
		expect(style.display).toBe('flex');
		expect(style.alignItems).toBe('center');
		expect(style.justifyContent).toBe('center');
	});

	it('fires onclick when clicked', async () => {
		const onclick = vi.fn();
		const { container } = await render(Button, {
			props: { color: 'green', onclick, children: text('Нажми') }
		});
		container.querySelector('button')!.click();
		expect(onclick).toHaveBeenCalledTimes(1);
	});

	it('does not fire onclick when disabled', async () => {
		const onclick = vi.fn();
		const { container } = await render(Button, {
			props: { color: 'green', onclick, disabled: true, children: text('Недоступно') }
		});
		const btn = container.querySelector('button')!;
		expect(btn.disabled).toBe(true);
		btn.click();
		expect(onclick).not.toHaveBeenCalled();
	});

	it('disables pointer events in the disabled state', async () => {
		const { container } = await render(Button, {
			props: { color: 'green', disabled: true, children: text('Недоступно') }
		});
		const style = getComputedStyle(container.querySelector('button')!);
		expect(style.pointerEvents).toBe('none');
	});
});

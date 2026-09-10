import { render, cleanup } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RecommendationCard from './RecommendationCard.svelte';

// app.css подключает Tailwind — без него утилиты не сгенерируются
// в тестовом окружении, и trusted-клик может промахиваться по мишеням
import '../../../app.css';

afterEach(cleanup);

describe('RecommendationCard', () => {
	it('renders as a link with correct href in link mode (no onclick)', async () => {
		const { container } = await render(RecommendationCard, {
			props: {
				title: 'Test Title',
				text: 'Test text',
				goto: '/materials/test-article',
				icon: '/icons/test.svg',
				variant: 'card',
				button_text: 'Read'
			}
		});
		const link = container.querySelector('a');
		expect(link).toBeTruthy();
		expect(link?.getAttribute('href')).toMatch(/\/materials\/test-article$/);
	});

	it('calls onclick and prevents default in action mode (card variant)', async () => {
		const onclick = vi.fn();
		const { container } = await render(RecommendationCard, {
			props: {
				title: 'Test Title',
				text: 'Test text',
				goto: '/tests',
				icon: '/icons/test.svg',
				variant: 'card',
				button_text: 'Run',
				onclick
			}
		});
		const link = container.querySelector('a')!;

		const event = new MouseEvent('click', { cancelable: true, bubbles: true });
		link.dispatchEvent(event);

		expect(onclick).toHaveBeenCalledTimes(1);
		expect(event.defaultPrevented).toBe(true);
	});

	it('calls onclick and prevents default in action mode (row variant)', async () => {
		const onclick = vi.fn();
		const { container } = await render(RecommendationCard, {
			props: {
				title: 'Test Title',
				text: 'Test text',
				goto: '/tests',
				icon: '/icons/test.svg',
				variant: 'row',
				onclick
			}
		});
		const link = container.querySelector('a')!;

		const event = new MouseEvent('click', { cancelable: true, bubbles: true });
		link.dispatchEvent(event);

		expect(onclick).toHaveBeenCalledTimes(1);
		expect(event.defaultPrevented).toBe(true);
	});

	it('triggers action on Enter key in action mode', async () => {
		const onclick = vi.fn();
		const { container } = await render(RecommendationCard, {
			props: {
				title: 'Test Title',
				text: 'Test text',
				goto: '/tests',
				icon: '/icons/test.svg',
				variant: 'card',
				button_text: 'Run',
				onclick
			}
		});
		const link = container.querySelector('a')!;
		link.focus();

		await userEvent.keyboard('{Enter}');
		expect(onclick).toHaveBeenCalledTimes(1);
	});
});

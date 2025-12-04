import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
	it('should render h1', async () => {
		render(Page);

		const heading = page.getByRole('heading', { level: 1 });
		await expect.element(heading).toBeInTheDocument();
	});

    it('should handle form inputs', async () => {
        render(Page);

        const firstnameInput = page.getByPlaceholder('ИМЯ');

        expect(firstnameInput).toBeInTheDocument();

        await firstnameInput.fill('John');

        expect(firstnameInput).toHaveValue('JOHN');
    });
});

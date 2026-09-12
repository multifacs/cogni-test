import { render, cleanup } from 'vitest-browser-svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import QuestionField from './QuestionField.svelte';
import type { Question } from './flows';

import '../../../app.css';

vi.mock('./autosave', () => ({
	saveFieldDebounced: vi.fn(),
	saveFieldNow: vi.fn()
}));

import { saveFieldDebounced, saveFieldNow } from './autosave';

const rangeQuestion: Question = {
	key: 'height',
	label: 'Рост',
	type: { kind: 'range', min: 0, max: 250, default: 150 }
};

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	vi.unstubAllGlobals();
});

function expectNoAutosaveAndNoFetch(fetchSpy: ReturnType<typeof vi.fn>) {
	expect(saveFieldDebounced).not.toHaveBeenCalled();
	expect(saveFieldNow).not.toHaveBeenCalled();
	expect(fetchSpy).not.toHaveBeenCalled();
}

describe('QuestionField (range defaults)', () => {
	it('применяет default при value === null и не шлёт fetch/autosave при монтировании', async () => {
		const fetchSpy = vi.fn();
		vi.stubGlobal('fetch', fetchSpy);
		const { container } = await render(QuestionField, {
			props: { question: rangeQuestion, value: null }
		});
		const input = container.querySelector('input[type="number"]') as HTMLInputElement;
		expect(input.value).toBe('150');
		expectNoAutosaveAndNoFetch(fetchSpy);
	});

	it('применяет default при value === undefined', async () => {
		const fetchSpy = vi.fn();
		vi.stubGlobal('fetch', fetchSpy);
		const { container } = await render(QuestionField, {
			props: { question: rangeQuestion, value: undefined }
		});
		const input = container.querySelector('input[type="number"]') as HTMLInputElement;
		expect(input.value).toBe('150');
		expectNoAutosaveAndNoFetch(fetchSpy);
	});

	it('не применяет default при существующем значении', async () => {
		const fetchSpy = vi.fn();
		vi.stubGlobal('fetch', fetchSpy);
		const { container } = await render(QuestionField, {
			props: { question: rangeQuestion, value: 42 }
		});
		const input = container.querySelector('input[type="number"]') as HTMLInputElement;
		expect(input.value).toBe('42');
		expectNoAutosaveAndNoFetch(fetchSpy);
	});
});

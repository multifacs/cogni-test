import { render, cleanup } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
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

const choiceQuestion: Question = {
	key: 'currentOccupation',
	label: 'Занятие',
	type: {
		kind: 'choice',
		options: [
			{
				label: 'Ученик средней школы, гимназии, ПТУ, профессионального училища, профессионального лицея, техникума, колледжа',
				value: 'student'
			},
			{ label: 'Работаю', value: 'employed' }
		]
	}
};

afterEach(async () => {
	await page.viewport(1280, 720);
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

describe('QuestionField (choice cards)', () => {
	it('длинная метка не переполняет карточку и переносится на несколько строк', async () => {
		await page.viewport(375, 667);
		const { container } = await render(QuestionField, {
			props: { question: choiceQuestion, value: null }
		});
		const cards = container.querySelectorAll('label');
		expect(cards.length).toBe(2);

		const longCard = cards[0] as HTMLLabelElement;
		const textSpan = longCard.querySelector('span:last-of-type') as HTMLElement;
		expect(textSpan.scrollWidth).toBeLessThanOrEqual(textSpan.clientWidth + 1);
		// карточка выросла до 2+ строк (72px и выше против фиксированных 60px)
		expect(longCard.clientHeight).toBeGreaterThanOrEqual(72);
	});

	it('короткая метка сохраняет базовую высоту карточки (~56px)', async () => {
		const { container } = await render(QuestionField, {
			props: { question: choiceQuestion, value: null }
		});
		const cards = container.querySelectorAll('label');
		const shortCard = cards[1] as HTMLLabelElement;
		expect(shortCard.clientHeight).toBeGreaterThanOrEqual(55);
		expect(shortCard.clientHeight).toBeLessThanOrEqual(57);
	});
});

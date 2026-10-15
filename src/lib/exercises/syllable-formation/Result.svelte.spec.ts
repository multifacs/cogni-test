import '../../../app.css';
import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Result from './Result.svelte';
import type { ExerciseResults } from '$lib/exercises/types';
import type { SyllableFormationAttemptRow } from './types';

const mockResults: SyllableFormationAttemptRow[] = [
	{
		pairIndex: 1,
		phrase: 'ба-ко-ми ло-те-су',
		association: 'бак с комом земли у лодки',
		isCorrect: true,
		reactionTimeMs: 21_500,
		timedOut: false,
		associationMs: 34_000,
		recalledPhrase: 'ба-ко-ми ло-те-су'
	},
	{
		pairIndex: 2,
		phrase: 'ри-мо-та зу-па',
		association: 'римская мозаика из зубров',
		isCorrect: false,
		reactionTimeMs: 43_200,
		timedOut: false,
		associationMs: 51_000,
		recalledPhrase: 'ри-мо-та па-зу'
	},
	{
		pairIndex: 3,
		phrase: 'гу-си-но ле-то',
		association: null,
		isCorrect: false,
		reactionTimeMs: 0,
		timedOut: true,
		associationMs: 120_000
	},
	{
		pairIndex: 4,
		phrase: 'ду-ша-ка ми-ро',
		association: 'душная погода в мире',
		isCorrect: false,
		reactionTimeMs: 120_000,
		timedOut: true,
		associationMs: 25_000
	},
	{
		pairIndex: 5,
		phrase: 'ти-ку-ла но-са',
		association: 'тихая кукла без носа',
		isCorrect: true,
		reactionTimeMs: 8_900,
		timedOut: false,
		associationMs: 40_000,
		recalledPhrase: 'ти-ку-ла но-са'
	}
];

function renderResult(results: SyllableFormationAttemptRow[] = mockResults) {
	// Тип попадёт в объединение ExerciseResults в Task 1.3 (регистрация).
	render(Result, { results: results as unknown as ExerciseResults });
}

describe('Result.svelte', () => {
	it('renders summary cards with correct count, timeouts and average time', async () => {
		renderResult();

		expect(page.getByText('Верно')).toBeInTheDocument();
		expect(page.getByText('2 из 5')).toBeInTheDocument();
		expect(page.getByText('Таймауты')).toBeInTheDocument();
		expect(page.getByText('Среднее время ответа')).toBeInTheDocument();
		// Среднее только по ответившим строкам (1, 2, 5): (21500+43200+8900)/3 ≈ 24.5 с
		expect(page.getByText('24.5 с')).toBeInTheDocument();
	});

	it('renders «—» as average time when every row timed out', async () => {
		renderResult(
			mockResults.map((row) => ({
				...row,
				isCorrect: false,
				timedOut: true,
				reactionTimeMs: 120_000,
				recalledPhrase: undefined
			}))
		);

		expect(page.getByText('Верно')).toBeInTheDocument();
		expect(page.getByText('0 из 5')).toBeInTheDocument();
		expect(page.getByText('Среднее время ответа')).toBeInTheDocument();
		expect(page.getByText('—').elements().length).toBeGreaterThan(0);
	});

	it('renders table headers and colors answers green/red', async () => {
		renderResult();

		expect(page.getByText('Сочетание')).toBeInTheDocument();
		expect(page.getByText('Ассоциация')).toBeInTheDocument();
		expect(page.getByText('Ваш ответ')).toBeInTheDocument();

		// Верный ответ — зелёным, неверный — красным.
		const answers = page.getByTestId('result-answer').elements();
		expect(answers.length).toBe(5);
		await expect.element(answers[0]).toHaveClass(/text-green-400/);
		await expect.element(answers[1]).toHaveClass(/text-red-400/);

		expect(page.getByText('✓').elements().length).toBe(2);
		expect(page.getByText('✗').elements().length).toBe(3);
	});

	it('renders placeholders for missing association and timed-out answer', async () => {
		renderResult();

		expect(page.getByText('(нет ассоциации)')).toBeInTheDocument();
		expect(page.getByText('(время вышло)').elements().length).toBe(2);
	});

	it('renders exactly 5 rows', async () => {
		renderResult();

		expect(page.getByTestId('result-row').elements().length).toBe(5);
	});
});

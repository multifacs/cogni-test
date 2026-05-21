import { expect, it } from 'vitest';
import parseResults from './resultParser.ts';
import assert from 'assert';

it('should parse stroop results correctly', () => {
	const results = [
		{
			time: 3,
			color: 'red',
			isCorrect: 1
		},
		{
			time: 5,
			color: 'red',
			isCorrect: 1
		},
		{
			time: 2,
			color: 'blue',
			isCorrect: 1
		},
		{
			time: 1,
			color: 'blue',
			isCorrect: 0
		}
	];

	// @ts-ignore
	const parsed = parseResults(results, 'stroop');

	expect(parsed).not.toBeNull();
	assert(parsed);

	expect(parsed.results['Среднее время одной попытки']).toBeCloseTo(2.75);
	expect(parsed.results['Вариабельность времени одной попытки (дисперсия)']).toBeCloseTo(2.1875);
	expect(parsed.results['Среднее отклонение времени одной попытки']).toBeCloseTo(1.47901);
	expect(parsed.results['Общая корректность']).toBeCloseTo(0.75);
	expect(parsed.results['Корректность по красному цвету']).toBe(1);
	expect(parsed.results['Корректность по синему цвету']).toBeCloseTo(0.5);
	expect(parsed.results['Среднее время одной попытки по красному цвету']).toBe(4);
	expect(parsed.results['Среднее время одной попытки по синему цвету']).toBeCloseTo(1.5);
	expect(parsed.results['Среднее отклонение времени одной попытки по красному цвету']).toBe(1);
	expect(parsed.results['Среднее отклонение времени одной попытки по синему цвету']).toBeCloseTo(
		0.5
	);
});

it('should parse math results correctly', () => {
	const results = [
		{
			time: 3,
			correctAnswer: true,
			isCorrect: 1
		},
		{
			time: 5,
			correctAnswer: true,
			isCorrect: 1
		},
		{
			time: 2,
			correctAnswer: false,
			isCorrect: 1
		},
		{
			time: 1,
			correctAnswer: false,
			isCorrect: 0
		}
	];

	// @ts-ignore
	const parsed = parseResults(results, 'math');

	expect(parsed).not.toBeNull();
	assert(parsed);

	expect(parsed.results['Среднее время одной попытки']).toBeCloseTo(2.75);
	expect(parsed.results['Вариабельность времени одной попытки (дисперсия)']).toBeCloseTo(2.1875);
	expect(parsed.results['Среднее отклонение времени одной попытки']).toBeCloseTo(1.47901);
	expect(parsed.results['Общая корректность']).toBeCloseTo(0.75);
	expect(parsed.results['Корректность по верным неравенствам']).toBe(1);
	expect(parsed.results['Корректность по неверным неравенствам']).toBeCloseTo(0.5);
	expect(parsed.results['Среднее время одной попытки по верным неравенствам']).toBe(4);
	expect(parsed.results['Среднее время одной попытки по неверным неравенствам']).toBeCloseTo(1.5);
	expect(parsed.results['Среднее отклонение времени одной попытки по верным неравенствам']).toBe(
		1
	);
	expect(
		parsed.results['Среднее отклонение времени одной попытки по неверным неравенствам']
	).toBeCloseTo(0.5);
});

it('should parse campimetry results correctly', () => {
	const results = [
		{
			time: 3,
			stage: 1,
			delta: 1
		},
		{
			time: 5,
			stage: 1,
			delta: 1
		},
		{
			time: 2,
			stage: 2,
			delta: 1
		},
		{
			time: 1,
			stage: 2,
			delta: -1
		}
	];

	// @ts-ignore
	const parsed = parseResults(results, 'campimetry');

	expect(parsed).not.toBeNull();
	assert(parsed);

	expect(parsed.results['Среднее время одной попытки 1 этапа']).toBe(4);
	expect(parsed.results['Среднее время одной попытки 2 этапа']).toBeCloseTo(1.5);
	expect(parsed.results['Вариабельность времени одной попытки 1 этапа (дисперсия)']).toBe(1);
	expect(parsed.results['Среднее отклонение времени одной попытки 1 этапа']).toBe(1);
	expect(parsed.results['Вариабельность времени одной попытки 2 этапа (дисперсия)']).toBeCloseTo(
		0.25
	);
	expect(parsed.results['Среднее отклонение времени одной попытки 2 этапа']).toBeCloseTo(0.5);
	expect(parsed.results['Среднее количество нажатий по 1 этапу']).toBe(1);
	expect(parsed.results['Среднее отклонение (недожатий) 2 этапа']).toBe(1);
	expect(parsed.results['Среднее отклонение (пережатий) 2 этапа']).toBe(-1);
	expect(parsed.results['Доля попаданий во 2 этапе']).toBe(0);
});

it('should parse swallow results correctly', () => {
	const results = [
		{
			time: 3,
			background: 'red',
			isCorrect: 1
		},
		{
			time: 5,
			background: 'red',
			isCorrect: 1
		},
		{
			time: 2,
			background: 'blue',
			isCorrect: 1
		},
		{
			time: 1,
			background: 'blue',
			isCorrect: 0
		}
	];

	// @ts-ignore
	const parsed = parseResults(results, 'swallow');

	expect(parsed).not.toBeNull();
	assert(parsed);

	expect(parsed.results['Среднее время одной попытки']).toBeCloseTo(2.75);
	expect(parsed.results['Вариабельность времени одной попытки (дисперсия)']).toBeCloseTo(2.1875);
	expect(parsed.results['Среднее отклонение времени одной попытки']).toBeCloseTo(1.47901);
	expect(parsed.results['Общая корректность']).toBeCloseTo(0.75);
	expect(parsed.results['Корректность по красному цвету']).toBe(1);
	expect(parsed.results['Корректность по синему цвету']).toBeCloseTo(0.5);
	expect(parsed.results['Среднее время одной попытки по красному цвету']).toBe(4);
	expect(parsed.results['Среднее время одной попытки по синему цвету']).toBeCloseTo(1.5);
	expect(parsed.results['Среднее отклонение времени одной попытки по красному цвету']).toBe(1);
	expect(parsed.results['Среднее отклонение времени одной попытки по синему цвету']).toBeCloseTo(
		0.5
	);
});

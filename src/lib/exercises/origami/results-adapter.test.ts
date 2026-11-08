import { describe, expect, it } from 'vitest';
import type { OrigamiAttemptRow } from './types';
import { difficultyLabel, formatMs, parseFolds, resultRows, summary } from './results-adapter';

function row(overrides: Partial<OrigamiAttemptRow> = {}): OrigamiAttemptRow {
	return {
		taskIndex: 1,
		difficulty: 'simple',
		folds: JSON.stringify([{ kind: 'h', at: 50 }]),
		selectedIndex: 0,
		correctIndex: 0,
		isCorrect: true,
		responseTimeMs: 1000,
		seed: 'seed-1',
		...overrides
	};
}

describe('origami results-adapter', () => {
	describe('summary', () => {
		it('агрегирует количество, точность и время', () => {
			const attempts = [
				row({ responseTimeMs: 1000, isCorrect: true }),
				row({ taskIndex: 2, responseTimeMs: 3000, isCorrect: false })
			];
			const s = summary(attempts);
			expect(s.totalQuestions).toBe(2);
			expect(s.correctCount).toBe(1);
			expect(s.accuracy).toBe(0.5);
			expect(s.totalDurationMs).toBe(4000);
			expect(s.averageResponseTimeMs).toBe(2000);
		});

		it('возвращает нулевые метрики для пустого списка', () => {
			const s = summary([]);
			expect(s.totalQuestions).toBe(0);
			expect(s.correctCount).toBe(0);
			expect(s.accuracy).toBe(0);
			expect(s.totalDurationMs).toBe(0);
			expect(s.averageResponseTimeMs).toBe(0);
		});

		it('считает точность по каждой сложности', () => {
			const attempts = [
				row({ difficulty: 'simple', isCorrect: true }),
				row({ difficulty: 'simple', isCorrect: true }),
				row({ difficulty: 'medium', isCorrect: false }),
				row({ difficulty: 'hard', isCorrect: false })
			];
			const s = summary(attempts);
			const byKey = Object.fromEntries(s.byDifficulty.map((d) => [d.difficulty, d]));
			expect(byKey.simple).toMatchObject({ total: 2, correct: 2, accuracy: 1 });
			expect(byKey.medium).toMatchObject({ total: 1, correct: 0, accuracy: 0 });
			expect(byKey.hard).toMatchObject({ total: 1, correct: 0, accuracy: 0 });
		});

		it('для пустого списка даёт нули по всем сложностям', () => {
			const s = summary([]);
			expect(s.byDifficulty).toHaveLength(3);
			for (const d of s.byDifficulty) {
				expect(d.total).toBe(0);
				expect(d.correct).toBe(0);
				expect(d.accuracy).toBe(0);
			}
		});
	});

	describe('resultRows', () => {
		it('маппит попытки в строки таблицы с 1-базным индексом', () => {
			const rows = resultRows([
				row({ taskIndex: 1 }),
				row({
					taskIndex: 2,
					difficulty: 'hard',
					selectedIndex: 1,
					correctIndex: 3,
					isCorrect: false
				})
			]);
			expect(rows).toHaveLength(2);
			expect(rows[0]).toMatchObject({
				index: 1,
				difficultyLabel: 'Простая',
				isCorrect: true,
				responseTimeMs: 1000
			});
			expect(rows[1]).toMatchObject({
				index: 2,
				difficultyLabel: 'Сложная',
				selectedIndex: 1,
				correctIndex: 3,
				isCorrect: false
			});
		});

		it('считает количество сгибов из folds JSON', () => {
			const rows = resultRows([
				row({
					folds: JSON.stringify([
						{ kind: 'v', at: 30 },
						{ kind: 'diag', corner: 'tl' }
					])
				})
			]);
			expect(rows[0].foldsCount).toBe(2);
		});
	});

	describe('parseFolds', () => {
		it('возвращает пустой список для некорректного JSON', () => {
			expect(parseFolds('not-json')).toEqual([]);
			expect(parseFolds('{"kind":"h"}')).toEqual([]);
		});
	});

	describe('label helpers', () => {
		it('форматирует время и сложность', () => {
			expect(formatMs(900)).toBe('900 мс');
			expect(formatMs(1500)).toBe('1.5 с');
			expect(formatMs(Number.NaN)).toBe('—');
			expect(difficultyLabel('medium')).toBe('Средняя');
		});
	});
});

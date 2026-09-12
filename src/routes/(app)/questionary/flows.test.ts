import { describe, expect, it } from 'vitest';
import { flows, type Question } from './flows';

const allQuestions: Question[] = flows.flatMap((f) => f.questions);

function findQuestion(key: Question['key']): Question {
	const found = allQuestions.find((q) => q.key === key);
	if (!found) throw new Error(`Question not found: ${String(key)}`);
	return found;
}

describe('flows', () => {
	describe('dominantHand mapping', () => {
		it('«Правая» → right, «Левая» → left (без swap)', () => {
			const q = findQuestion('dominantHand');
			expect(q.type.kind).toBe('choice');
			if (q.type.kind !== 'choice') return;
			expect(q.type.options).toEqual([
				{ label: 'Правая', value: 'right' },
				{ label: 'Левая', value: 'left' }
			]);
		});
	});

	describe('range defaults', () => {
		it.each([
			['yearsNotQualified', 0],
			['yearsQualifiedApplied', 0],
			['yearsQualifiedNonApplied', 0],
			['yearsProfessional', 0],
			['yearsHighResponsibility', 0],
			['height', 150],
			['weight', 50]
		])('%s имеет default = %i, min = 0', (key, expectedDefault) => {
			const q = findQuestion(key as Question['key']);
			expect(q.type.kind).toBe('range');
			if (q.type.kind !== 'range') return;
			expect(q.type.default).toBe(expectedDefault);
			expect(q.type.min).toBe(0);
		});

		it('каждый range-вопрос имеет default', () => {
			const rangeQuestions = allQuestions.filter((q) => q.type.kind === 'range');
			expect(rangeQuestions.length).toBeGreaterThanOrEqual(7);
			for (const q of rangeQuestions) {
				if (q.type.kind !== 'range') continue;
				expect(q.type.default, `missing default for ${String(q.key)}`).toBeDefined();
			}
		});
	});
});

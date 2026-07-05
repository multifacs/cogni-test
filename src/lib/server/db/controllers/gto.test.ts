import { describe, expect, it, vi } from 'vitest';
import { getActiveGtoSessionsForUser } from './gto';

let mockRows: any[] = [
	{
		gtoSessionId: 'sess-1',
		name: 'Test Session',
		hasCompletedTests: false,
		hasSubmittedWords: false,
		currentTestIndex: 2
	}
];

vi.mock('$lib/server/db', () => {
	function whereFn() {
		return Promise.resolve(mockRows);
	}

	function innerJoinFn() {
		return { where: vi.fn(whereFn) };
	}

	function fromFn() {
		return { innerJoin: vi.fn(innerJoinFn) };
	}

	function selectFn() {
		return { from: vi.fn(fromFn) };
	}

	return {
		db: {
			select: vi.fn(selectFn)
		}
	};
});

describe('getActiveGtoSessionsForUser', () => {
	it('returns currentTestIndex from participant in the result', async () => {
		const result = await getActiveGtoSessionsForUser('user-1');
		expect(result).toHaveLength(1);
		expect(result[0]).toHaveProperty('currentTestIndex', 2);
		expect(result[0]).toHaveProperty('gtoSessionId', 'sess-1');
		expect(result[0]).toHaveProperty('name', 'Test Session');
		expect(result[0]).toHaveProperty('hasCompletedTests', false);
		expect(result[0]).toHaveProperty('hasSubmittedWords', false);
	});

	it('defaults currentTestIndex to 0 for fresh participant', async () => {
		mockRows = [
			{
				gtoSessionId: 'sess-fresh',
				name: 'Fresh Session',
				hasCompletedTests: false,
				hasSubmittedWords: false,
				currentTestIndex: 0
			}
		];
		const result = await getActiveGtoSessionsForUser('user-fresh');
		expect(result).toHaveLength(1);
		expect(result[0]).toHaveProperty('currentTestIndex', 0);
	});
});

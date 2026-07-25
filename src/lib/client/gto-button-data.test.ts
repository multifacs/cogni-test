import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
	getResultForParticipant,
	getParticipantIdsForFile,
	getFileNumbersWithStatus,
	getAvailableFileNumbers,
	clearAllButtonData,
	isOldFormatEntry,
	hasOldFormatData,
	type StoredButtonPair
} from './gto-button-data';

const mockStore = new Map<string, unknown>();

vi.mock('localforage', () => ({
	default: {
		createInstance: () => ({
			iterate: (callback: (value: unknown, key: string) => void | Promise<void>) => {
				for (const [key, value] of mockStore.entries()) {
					const result = callback(value, key);
					if (result instanceof Promise) return result;
				}
			},
			getItem: (key: string) => Promise.resolve(mockStore.get(key) ?? null),
			setItem: (key: string, value: unknown) => {
				mockStore.set(key, value);
				return Promise.resolve(value);
			},
			removeItem: (key: string) => {
				mockStore.delete(key);
				return Promise.resolve();
			}
		})
	}
}));

beforeEach(async () => {
	mockStore.clear();
	await clearAllButtonData();
});

describe('getResultForParticipant', () => {
	test('computes avgReaction and accuracy from stimulusCells on the fly', async () => {
		expect.assertions(4);
		mockStore.set(
			'gto-button-001',
			makePair({
				leftParticipants: [{ buttonId: 1, stimulusCells: [572, '-', 'x', 881] }],
				rightParticipants: [{ buttonId: 1, stimulusCells: [400, 500, 600] }]
			})
		);
		const result = await getResultForParticipant('001', 1);
		expect(result.left).not.toBeNull();
		expect(result.left!.avgReaction).toBeCloseTo((572 + 881) / 2, 2);
		expect(result.right).not.toBeNull();
		expect(result.right!.avgReaction).toBeCloseTo((400 + 500 + 600) / 3, 2);
	});

	test('returns null for missing buttonId', async () => {
		expect.assertions(2);
		mockStore.set(
			'gto-button-001',
			makePair({
				leftParticipants: [{ buttonId: 1, stimulusCells: [572, 881] }],
				rightParticipants: [{ buttonId: 1, stimulusCells: [572, 881] }]
			})
		);
		const result = await getResultForParticipant('001', 999);
		expect(result.left).toBeNull();
		expect(result.right).toBeNull();
	});
});

describe('getParticipantIdsForFile', () => {
	test('returns sorted unique ids from both hands', async () => {
		expect.assertions(1);
		mockStore.set(
			'gto-button-001',
			makePair({
				leftParticipants: [
					{ buttonId: 3, stimulusCells: [100] },
					{ buttonId: 1, stimulusCells: [200] }
				],
				rightParticipants: [{ buttonId: 2, stimulusCells: [300] }]
			})
		);
		const result = await getParticipantIdsForFile('001');
		expect(result).toEqual([1, 2, 3]);
	});
});

describe('isOldFormatEntry', () => {
	test('detects old format participant without stimulusCells', () => {
		expect.assertions(1);
		const oldPair = {
			left: {
				fileNumber: '',
				hand: 'left' as const,
				participants: [{ buttonId: 1, avgReaction: 100, accuracy: 0.9 }],
				uploadedAt: 1
			},
			right: {
				fileNumber: '',
				hand: 'right' as const,
				participants: [],
				uploadedAt: 1
			}
		};
		expect(isOldFormatEntry(oldPair as unknown as StoredButtonPair)).toBe(true);
	});

	test('returns false for new format with stimulusCells', () => {
		expect.assertions(1);
		const newPair = makePair({
			leftParticipants: [{ buttonId: 1, stimulusCells: [572, 881] }],
			rightParticipants: [{ buttonId: 2, stimulusCells: [572, 881] }]
		});
		expect(isOldFormatEntry(newPair)).toBe(false);
	});

	test('returns false when both hands are empty', () => {
		expect.assertions(1);
		const emptyPair = makePair({ leftParticipants: [], rightParticipants: [] });
		expect(isOldFormatEntry(emptyPair)).toBe(false);
	});
});

describe('hasOldFormatData', () => {
	test('returns true when store contains old-format entry', async () => {
		expect.assertions(1);
		mockStore.set('gto-button-old', {
			left: {
				fileNumber: '',
				hand: 'left',
				participants: [{ buttonId: 1, avgReaction: 100, accuracy: 0.9 }],
				uploadedAt: 1
			},
			right: {
				fileNumber: '',
				hand: 'right',
				participants: [],
				uploadedAt: 1
			}
		});
		mockStore.set(
			'gto-button-new',
			makePair({
				leftParticipants: [{ buttonId: 1, stimulusCells: [572, 881] }],
				rightParticipants: [{ buttonId: 2, stimulusCells: [572, 881] }]
			})
		);
		const result = await hasOldFormatData();
		expect(result).toBe(true);
	});

	test('returns false when all entries are new format', async () => {
		expect.assertions(1);
		mockStore.set(
			'gto-button-001',
			makePair({
				leftParticipants: [{ buttonId: 1, stimulusCells: [572, 881] }],
				rightParticipants: [{ buttonId: 2, stimulusCells: [572, 881] }]
			})
		);
		const result = await hasOldFormatData();
		expect(result).toBe(false);
	});

	test('returns false for empty store', async () => {
		expect.assertions(1);
		const result = await hasOldFormatData();
		expect(result).toBe(false);
	});
});

// ─── Helpers for seeding mock store ───────────────────────────────────

function makePair(partial: {
	leftParticipants?: { buttonId: number; stimulusCells: (string | number | undefined | null)[] }[];
	rightParticipants?: { buttonId: number; stimulusCells: (string | number | undefined | null)[] }[];
}): StoredButtonPair {
	return {
		left: {
			fileNumber: '',
			hand: 'left',
			participants: partial.leftParticipants ?? [],
			uploadedAt: 1
		},
		right: {
			fileNumber: '',
			hand: 'right',
			participants: partial.rightParticipants ?? [],
			uploadedAt: 1
		}
	};
}

describe('getFileNumbersWithStatus', () => {
	test('complete pair has hasLeft and hasRight true', async () => {
		expect.assertions(3);
		mockStore.set(
			'gto-button-001',
			makePair({
				leftParticipants: [{ buttonId: 1, stimulusCells: [572, 881, 772] }],
				rightParticipants: [{ buttonId: 2, stimulusCells: [572, 881, 772] }]
			})
		);
		const result = await getFileNumbersWithStatus();
		expect(result).toHaveLength(1);
		expect(result[0].hasLeft).toBe(true);
		expect(result[0].hasRight).toBe(true);
	});

	test('pair with only left hand has hasLeft true and hasRight false', async () => {
		expect.assertions(3);
		mockStore.set(
			'gto-button-002',
			makePair({
				leftParticipants: [{ buttonId: 1, stimulusCells: [572, 881, 772] }],
				rightParticipants: []
			})
		);
		const result = await getFileNumbersWithStatus();
		expect(result).toHaveLength(1);
		expect(result[0].hasLeft).toBe(true);
		expect(result[0].hasRight).toBe(false);
	});

	test('pair with only right hand has hasLeft false and hasRight true', async () => {
		expect.assertions(3);
		mockStore.set(
			'gto-button-003',
			makePair({
				leftParticipants: [],
				rightParticipants: [{ buttonId: 1, stimulusCells: [572, 881, 772] }]
			})
		);
		const result = await getFileNumbersWithStatus();
		expect(result).toHaveLength(1);
		expect(result[0].hasLeft).toBe(false);
		expect(result[0].hasRight).toBe(true);
	});

	test('sorts file numbers alphabetically', async () => {
		expect.assertions(2);
		mockStore.set(
			'gto-button-003',
			makePair({
				leftParticipants: [{ buttonId: 1, stimulusCells: [572, 881, 772] }],
				rightParticipants: [{ buttonId: 2, stimulusCells: [572, 881, 772] }]
			})
		);
		mockStore.set(
			'gto-button-001',
			makePair({
				leftParticipants: [{ buttonId: 1, stimulusCells: [572, 881, 772] }],
				rightParticipants: [{ buttonId: 2, stimulusCells: [572, 881, 772] }]
			})
		);
		const result = await getFileNumbersWithStatus();
		expect(result.map((r) => r.fileNumber)).toEqual(['001', '003']);
		expect(result.every((r) => r.hasLeft && r.hasRight)).toBe(true);
	});

	test('pair with both hands empty has hasLeft and hasRight false', async () => {
		expect.assertions(3);
		mockStore.set(
			'gto-button-004',
			makePair({
				leftParticipants: [],
				rightParticipants: []
			})
		);
		const result = await getFileNumbersWithStatus();
		expect(result).toHaveLength(1);
		expect(result[0].hasLeft).toBe(false);
		expect(result[0].hasRight).toBe(false);
	});

	test('empty store returns empty array', async () => {
		expect.assertions(1);
		const result = await getFileNumbersWithStatus();
		expect(result).toEqual([]);
	});
});

describe('getAvailableFileNumbers', () => {
	test('only returns file numbers with both hands present', async () => {
		expect.assertions(3);
		mockStore.set(
			'gto-button-complete',
			makePair({
				leftParticipants: [{ buttonId: 1, stimulusCells: [572, 881, 772] }],
				rightParticipants: [{ buttonId: 2, stimulusCells: [572, 881, 772] }]
			})
		);
		mockStore.set(
			'gto-button-incomplete',
			makePair({
				leftParticipants: [{ buttonId: 1, stimulusCells: [572, 881, 772] }],
				rightParticipants: []
			})
		);
		mockStore.set(
			'gto-button-empty',
			makePair({
				leftParticipants: [],
				rightParticipants: []
			})
		);
		const result = await getAvailableFileNumbers();
		expect(result).toHaveLength(1);
		expect(result[0]).toBe('complete');
		expect(result).not.toContain('empty');
	});
});

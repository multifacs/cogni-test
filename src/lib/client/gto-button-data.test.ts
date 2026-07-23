import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
	parseStimulusRow,
	getFileNumbersWithStatus,
	getAvailableFileNumbers,
	clearAllButtonData,
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

describe('parseStimulusRow', () => {
	test('all numeric cells → correct average and 100% accuracy', () => {
		expect.assertions(2);
		const result = parseStimulusRow([572, 881, 772]);
		expect(result.avgReaction).toBeCloseTo((572 + 881 + 772) / 3, 2);
		expect(result.accuracy).toBe(1);
	});

	test('mix of numbers and x → correct average and reduced accuracy', () => {
		expect.assertions(2);
		const result = parseStimulusRow([572, 'x', 881]);
		expect(result.avgReaction).toBeCloseTo((572 + 881) / 2, 2);
		expect(result.accuracy).toBeCloseTo(2 / 3, 2);
	});

	test('dash cells are skipped', () => {
		expect.assertions(2);
		const result = parseStimulusRow([572, '-', 881]);
		expect(result.avgReaction).toBeCloseTo((572 + 881) / 2, 2);
		expect(result.accuracy).toBe(1);
	});

	test('empty array → returns both null', () => {
		expect.assertions(2);
		const result = parseStimulusRow([]);
		expect(result.avgReaction).toBeNull();
		expect(result.accuracy).toBeNull();
	});

	test('all x → avgReaction is null, accuracy is 0', () => {
		expect.assertions(2);
		const result = parseStimulusRow(['x', 'x', 'x']);
		expect(result.avgReaction).toBeNull();
		expect(result.accuracy).toBe(0);
	});

	test('mixed: [572, "-", "x", 881, "", 772] → avgReaction≈741.67, accuracy≈0.75', () => {
		expect.assertions(2);
		const result = parseStimulusRow([572, '-', 'x', 881, '', 772]);
		expect(result.avgReaction).toBeCloseTo((572 + 881 + 772) / 3, 2);
		expect(result.accuracy).toBeCloseTo(3 / 4, 2);
	});

	test('all zero values → avgReaction is 0, accuracy is 1', () => {
		expect.assertions(2);
		const result = parseStimulusRow([0, 0, 0]);
		expect(result.avgReaction).toBe(0);
		expect(result.accuracy).toBe(1);
	});
});

// ─── Helpers for seeding mock store ───────────────────────────────────

function makePair(partial: {
	leftParticipants?: { buttonId: number; avgReaction: number; accuracy: number }[];
	rightParticipants?: { buttonId: number; avgReaction: number; accuracy: number }[];
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
				leftParticipants: [{ buttonId: 1, avgReaction: 100, accuracy: 0.9 }],
				rightParticipants: [{ buttonId: 2, avgReaction: 200, accuracy: 0.8 }]
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
				leftParticipants: [{ buttonId: 1, avgReaction: 100, accuracy: 0.9 }],
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
				rightParticipants: [{ buttonId: 1, avgReaction: 100, accuracy: 0.9 }]
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
				leftParticipants: [{ buttonId: 1, avgReaction: 100, accuracy: 0.9 }],
				rightParticipants: [{ buttonId: 2, avgReaction: 200, accuracy: 0.8 }]
			})
		);
		mockStore.set(
			'gto-button-001',
			makePair({
				leftParticipants: [{ buttonId: 1, avgReaction: 100, accuracy: 0.9 }],
				rightParticipants: [{ buttonId: 2, avgReaction: 200, accuracy: 0.8 }]
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
				leftParticipants: [{ buttonId: 1, avgReaction: 100, accuracy: 0.9 }],
				rightParticipants: [{ buttonId: 2, avgReaction: 200, accuracy: 0.8 }]
			})
		);
		mockStore.set(
			'gto-button-incomplete',
			makePair({
				leftParticipants: [{ buttonId: 1, avgReaction: 100, accuracy: 0.9 }],
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

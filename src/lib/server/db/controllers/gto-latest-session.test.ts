import { describe, expect, it } from 'vitest';
import { latestTestSessionByType } from './gto';

describe('latestTestSessionByType', () => {
	it('returns an empty Map for an empty array', () => {
		const result = latestTestSessionByType([]);
		expect(result.size).toBe(0);
	});

	it('places a single session into the map', () => {
		const sessions = [
			{ testType: 'stroop', createdAt: '2024-01-01T00:00:00Z', rowid: 1, extra: 'a' }
		];
		const result = latestTestSessionByType(sessions);
		expect(result.size).toBe(1);
		expect(result.get('stroop')).toEqual(sessions[0]);
	});

	it('picks the latest session per type when multiple types exist', () => {
		const sessions = [
			{ testType: 'stroop', createdAt: '2024-01-01T00:00:00Z', rowid: 1 },
			{ testType: 'math', createdAt: '2024-01-02T00:00:00Z', rowid: 2 },
			{ testType: 'stroop', createdAt: '2024-01-03T00:00:00Z', rowid: 3 }
		];
		const result = latestTestSessionByType(sessions);
		expect(result.size).toBe(2);
		expect(result.get('stroop')?.rowid).toBe(3);
		expect(result.get('math')?.rowid).toBe(2);
	});

	it('prefers the later createdAt on re-take', () => {
		const sessions = [
			{ testType: 'stroop', createdAt: '2024-01-01T00:00:00Z', rowid: 1 },
			{ testType: 'stroop', createdAt: '2024-01-02T00:00:00Z', rowid: 2 }
		];
		const result = latestTestSessionByType(sessions);
		expect(result.get('stroop')?.rowid).toBe(2);
	});

	it('uses rowid as tie-breaker when createdAt is identical', () => {
		const sessions = [
			{ testType: 'stroop', createdAt: '2024-01-01T00:00:00Z', rowid: 1 },
			{ testType: 'stroop', createdAt: '2024-01-01T00:00:00Z', rowid: 2 }
		];
		const result = latestTestSessionByType(sessions);
		expect(result.get('stroop')?.rowid).toBe(2);
	});

	it('does not include missing types', () => {
		const sessions = [{ testType: 'stroop', createdAt: '2024-01-01T00:00:00Z', rowid: 1 }];
		const result = latestTestSessionByType(sessions);
		expect(result.get('math')).toBeUndefined();
	});
});

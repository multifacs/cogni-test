import { describe, it, expect } from 'vitest';
import type { TestData } from '$lib/tests';
import { getStreamingQueue } from './testQueue';

const mockTests: TestData[] = [
	{ name: 'stroop', title: 'T1', path: '/t1', img: '/i1.svg' },
	{ name: 'math', title: 'T2', path: '/t2', img: '/i2.svg' },
	{ name: 'memory', title: 'T3', path: '/t3', img: '/i3.svg' },
	{ name: 'campimetry', title: 'T4', path: '/t4', img: '/i4.svg' }
];

describe('getStreamingQueue', () => {
	it('returns all visible tests for a new user (all counts zero/undefined)', () => {
		const counts = {};
		const result = getStreamingQueue(mockTests, counts);
		expect(result).toEqual(mockTests);
	});

	it('returns only incomplete tests when partially done', () => {
		const counts = { stroop: 1, math: 0 };
		const result = getStreamingQueue(mockTests, counts);
		expect(result.map((t) => t.name)).toEqual(['math', 'memory', 'campimetry']);
	});

	it('returns all visible tests when everything is completed', () => {
		const counts = { stroop: 2, math: 1, memory: 5, campimetry: 1 };
		const result = getStreamingQueue(mockTests, counts);
		expect(result).toEqual(mockTests);
	});

	it('preserves input order of pending tests', () => {
		const counts = { memory: 1 };
		const result = getStreamingQueue(mockTests, counts);
		expect(result.map((t) => t.name)).toEqual(['stroop', 'math', 'campimetry']);
	});

	it('returns an empty array for empty tests input', () => {
		expect(getStreamingQueue([], {})).toEqual([]);
		expect(getStreamingQueue([], { stroop: 1 })).toEqual([]);
	});

	it('excludes hidden tests defensively even if passed in', () => {
		const withHidden: TestData[] = [
			...mockTests,
			{ name: 'secret', title: 'Secret', path: '/secret', img: '/secret.svg', hidden: true }
		];
		const result = getStreamingQueue(withHidden, {});
		expect(result.map((t) => t.name)).not.toContain('secret');
		expect(result).toEqual(mockTests);
	});

	it('returns all visible tests when only hidden ones are incomplete', () => {
		const withHidden: TestData[] = [
			{ name: 'stroop', title: 'T1', path: '/t1', img: '/i1.svg' },
			{ name: 'secret', title: 'Secret', path: '/secret', img: '/secret.svg', hidden: true }
		];
		const counts = { stroop: 1 };
		const result = getStreamingQueue(withHidden, counts);
		// все visible пройдены, но hidden incomplete; должен вернуть visible (полный повтор)
		expect(result.map((t) => t.name)).toEqual(['stroop']);
	});
});

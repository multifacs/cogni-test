import { describe, expect, it } from 'vitest';
import { exercises } from '$lib/exercises';
import { exerciseToSessionType } from './session-types';

describe('exercise catalog session-type mapping', () => {
	it('covers every exercise in the registry', () => {
		for (const ex of exercises) {
			expect(exerciseToSessionType, `missing mapping for "${ex.name}"`).toHaveProperty(
				ex.name
			);
			expect(typeof exerciseToSessionType[ex.name]).toBe('string');
			expect(exerciseToSessionType[ex.name].length).toBeGreaterThan(0);
		}
	});
});

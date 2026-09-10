import { describe, it, expect } from 'vitest';
import { getMissingModelInputs } from './runAgeModel';

const INPUT_NAMES = [
	'swallow_time_red',
	'munster_mean_attempt_time',
	'stroop_var_attempt_time'
] as const;

describe('getMissingModelInputs', () => {
	it('returns all inputs when features are empty', () => {
		const missing = getMissingModelInputs({}, INPUT_NAMES);
		expect(missing).toEqual([
			'swallow_time_red',
			'munster_mean_attempt_time',
			'stroop_var_attempt_time'
		]);
	});

	it('returns only the missing inputs for partial features', () => {
		const missing = getMissingModelInputs(
			{ swallow_time_red: 1.2 },
			INPUT_NAMES
		);
		expect(missing).toEqual([
			'munster_mean_attempt_time',
			'stroop_var_attempt_time'
		]);
	});

	it('returns empty array when all inputs are present', () => {
		const missing = getMissingModelInputs(
			{
				swallow_time_red: 1.2,
				munster_mean_attempt_time: 2.3,
				stroop_var_attempt_time: 3.4
			},
			INPUT_NAMES
		);
		expect(missing).toEqual([]);
	});
});

import { describe, expect, it } from 'vitest';
import { initMetricsDraft, collectMetricsFromDraft } from './table-helpers';
import type { ParticipantMetrics } from '$lib/server/db/controllers/gto';

describe('initMetricsDraft', () => {
	it('normalizes null values to empty strings', () => {
		const participant = {
			editableMetrics: {
				id: null,
				balanceTest: null,
				mazeQ1: null,
				mazeQ2: null,
				mazeQ3: null,
				mazeVRNumber: null,
				mazeVRFileName: null,
				buttonTestNumber: null,
				buttonTestFileName: null,
				logic: null,
				wordSetNumber: null
			}
		} as unknown as ParticipantMetrics;

		const draft = initMetricsDraft(participant, null);
		expect(draft.balanceTest).toBe('');
		expect(draft.mazeQ1).toBe('');
		expect(draft.mazeQ2).toBe('');
		expect(draft.mazeQ3).toBe('');
		expect(draft.mazeVRNumber).toBe('');
		expect(draft.mazeVRFileName).toBe('');
		expect(draft.buttonTestNumber).toBe('');
		expect(draft.buttonTestFileName).toBe('');
		expect(draft.logic).toBe('');
		expect(draft.wordSetId).toBe('');
	});

	it('converts non-null numbers and strings to strings', () => {
		const participant = {
			editableMetrics: {
				id: 'm-1',
				balanceTest: '15-30',
				mazeQ1: 0.5,
				mazeQ2: 1,
				mazeQ3: 0,
				mazeVRNumber: 42,
				mazeVRFileName: 'vr.dat',
				buttonTestNumber: 7,
				buttonTestFileName: 'bt.xls',
				logic: 1,
				wordSetNumber: 3
			}
		} as unknown as ParticipantMetrics;

		const draft = initMetricsDraft(participant, 'ws-99');
		expect(draft.balanceTest).toBe('15-30');
		expect(draft.mazeQ1).toBe('0.5');
		expect(draft.mazeQ2).toBe('1');
		expect(draft.mazeQ3).toBe('0');
		expect(draft.mazeVRNumber).toBe('42');
		expect(draft.mazeVRFileName).toBe('vr.dat');
		expect(draft.buttonTestNumber).toBe('7');
		expect(draft.buttonTestFileName).toBe('bt.xls');
		expect(draft.logic).toBe('1');
		expect(draft.wordSetId).toBe('ws-99');
	});

	it('handles zero correctly (not treating as null)', () => {
		const participant = {
			editableMetrics: {
				id: null,
				balanceTest: null,
				mazeQ1: 0,
				mazeQ2: 0,
				mazeQ3: 0,
				mazeVRNumber: 0,
				mazeVRFileName: null,
				buttonTestNumber: 0,
				buttonTestFileName: null,
				logic: 0,
				wordSetNumber: null
			}
		} as unknown as ParticipantMetrics;

		const draft = initMetricsDraft(participant, undefined);
		expect(draft.mazeQ1).toBe('0');
		expect(draft.mazeQ2).toBe('0');
		expect(draft.mazeVRNumber).toBe('0');
		expect(draft.buttonTestNumber).toBe('0');
		expect(draft.logic).toBe('0');
		expect(draft.wordSetId).toBe('');
	});

	it('works for empty participant with all-null editableMetrics', () => {
		const participant = {
			editableMetrics: {
				id: null,
				balanceTest: null,
				mazeQ1: null,
				mazeQ2: null,
				mazeQ3: null,
				mazeVRNumber: null,
				mazeVRFileName: null,
				buttonTestNumber: null,
				buttonTestFileName: null,
				logic: null,
				wordSetNumber: null
			}
		} as unknown as ParticipantMetrics;

		const draft = initMetricsDraft(participant, null);
		expect(draft.wordSetId).toBe('');
		expect(draft.balanceTest).toBe('');
		expect(draft.mazeQ1).toBe('');
		expect(draft.logic).toBe('');
	});
});

describe('collectMetricsFromDraft', () => {
	it('excludes wordSetId from the collected payload', () => {
		const draft = {
			balanceTest: '30-45',
			mazeQ1: '0.75',
			mazeQ2: '',
			mazeQ3: '1',
			mazeVRNumber: '12',
			mazeVRFileName: 'file.dat',
			buttonTestNumber: '3',
			buttonTestFileName: 'btn.xls',
			logic: '0.5',
			wordSetId: 'ws-1'
		};

		const payload = collectMetricsFromDraft(draft);
		expect(payload).not.toHaveProperty('wordSetId');
		expect(payload.balanceTest).toBe('30-45');
		expect(payload.mazeQ1).toBe('0.75');
		expect(payload.mazeQ3).toBe('1');
		expect(payload.mazeVRNumber).toBe('12');
		expect(payload.mazeVRFileName).toBe('file.dat');
		expect(payload.buttonTestNumber).toBe('3');
		expect(payload.buttonTestFileName).toBe('btn.xls');
		expect(payload.logic).toBe('0.5');
	});

	it('roundtrip: init then collect preserves non-empty values and omits wordSetId', () => {
		const participant = {
			editableMetrics: {
				id: 'm-1',
				balanceTest: '45-60',
				mazeQ1: 1,
				mazeQ2: null,
				mazeQ3: 0.25,
				mazeVRNumber: 7,
				mazeVRFileName: 'vr.txt',
				buttonTestNumber: 15,
				buttonTestFileName: 'b.txt',
				logic: 0,
				wordSetNumber: null
			}
		} as unknown as ParticipantMetrics;

		const draft = initMetricsDraft(participant, 'ws-5');
		const payload = collectMetricsFromDraft(draft);

		expect(payload.balanceTest).toBe('45-60');
		expect(payload.mazeQ1).toBe('1');
		expect(payload).not.toHaveProperty('mazeQ2');
		expect(payload.mazeQ3).toBe('0.25');
		expect(payload.mazeVRNumber).toBe('7');
		expect(payload.mazeVRFileName).toBe('vr.txt');
		expect(payload.buttonTestNumber).toBe('15');
		expect(payload.buttonTestFileName).toBe('b.txt');
		expect(payload.logic).toBe('0');
		expect(payload.wordSetId).toBeUndefined();
	});

	it('omits empty string values from payload', () => {
		const draft = {
			balanceTest: '',
			mazeQ1: '',
			mazeQ2: '',
			mazeQ3: '',
			mazeVRNumber: '',
			mazeVRFileName: '',
			buttonTestNumber: '',
			buttonTestFileName: '',
			logic: '',
			wordSetId: ''
		};

		const payload = collectMetricsFromDraft(draft);
		expect(Object.keys(payload)).toHaveLength(0);
	});
});

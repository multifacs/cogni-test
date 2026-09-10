import { describe, expect, it } from 'vitest';
import { initMetricsDraft, collectMetricsFromDraft, rebuildDraftMap } from './table-helpers';
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

describe('rebuildDraftMap', () => {
	function makeParticipant(
		id: string,
		overrides: Partial<ParticipantMetrics['editableMetrics']> = {}
	) {
		return {
			participantId: id,
			userId: `u-${id}`,
			firstname: 'User',
			lastname: 'Test',
			email: null,
			sex: 'male',
			age: 30,
			missingSurveyFields: [],
			stroop: {
				stage1: { meanTime: null, accuracy: null, total: 0, correct: 0 },
				stage2: { meanTime: null, accuracy: null, total: 0, correct: 0 },
				stage3: { meanTime: null, accuracy: null, total: 0, correct: 0 }
			},
			math: { meanTime: null, accuracy: null, total: 0, correct: 0 },
			munsterberg: { meanTime: null, accuracy: null, total: 0, correct: 0 },
			campimetry: { meanTime: null, accuracy: null, total: 0, correct: 0 },
			memory: { meanTime: null, accuracy: null, total: 0, correct: 0 },
			swallow: { meanTime: null, accuracy: null, total: 0, correct: 0, totalTime: 0 },
			raven: {
				total: 0,
				correct: 0,
				meanTime: null,
				byDifficulty: {
					easy: { total: 0, correct: 0 },
					medium: { total: 0, correct: 0 },
					hard: { total: 0, correct: 0 }
				},
				byTaskClass: Object.create(null)
			},
			editableMetrics: {
				id: `m-${id}`,
				balanceTest: '15-30',
				mazeQ1: 0.5,
				mazeQ2: 1,
				mazeQ3: 0,
				mazeVRNumber: 42,
				mazeVRFileName: 'vr.dat',
				buttonTestNumber: 7,
				buttonTestFileName: 'bt.xls',
				logic: 1,
				wordSetNumber: 3,
				...overrides
			},
			wordScore: null,
			submittedWords: null
		} as unknown as ParticipantMetrics;
	}

	it('fresh build (no prevDrafts): every row gets initMetricsDraft values from server data', () => {
		const metrics = [makeParticipant('A')];
		const wordSetIdMap = new Map([['A', 'ws-A']]);

		const result = rebuildDraftMap(metrics, wordSetIdMap, undefined, null);
		expect(result.size).toBe(1);
		expect(result.get('A')?.balanceTest).toBe('15-30');
		expect(result.get('A')?.wordSetId).toBe('ws-A');
	});

	it('carry-over with savedId=null: prev drafts for A and B with user-typed field changes are preserved', () => {
		const metrics = [makeParticipant('A'), makeParticipant('B')];
		const wordSetIdMap = new Map([
			['A', 'ws-A'],
			['B', 'ws-B']
		]);
		const prevDrafts = new Map([
			[
				'A',
				{ ...initMetricsDraft(metrics[0], 'ws-A'), balanceTest: 'changed-A', mazeQ1: '99' }
			],
			['B', { ...initMetricsDraft(metrics[1], 'ws-B'), logic: '66' }]
		]);

		const result = rebuildDraftMap(metrics, wordSetIdMap, prevDrafts, null);
		expect(result.size).toBe(2);
		// A preserved with user-typed changes
		expect(result.get('A')?.balanceTest).toBe('changed-A');
		expect(result.get('A')?.mazeQ1).toBe('99');
		expect(result.get('A')?.wordSetId).toBe('ws-A');
		// B preserved with user-typed changes
		expect(result.get('B')?.logic).toBe('66');
		expect(result.get('B')?.mazeQ2).toBe('1');
		expect(result.get('B')?.wordSetId).toBe('ws-B');
	});

	it('savedId=A: A refreshed from server values, B draft preserved', () => {
		const metrics = [
			makeParticipant('A', { balanceTest: 'server-A-new', mazeQ1: 0.25 }),
			makeParticipant('B', { balanceTest: 'server-B', mazeQ1: 1.5 })
		];
		const wordSetIdMap = new Map([
			['A', 'ws-A-new'],
			['B', 'ws-B']
		]);
		const prevDrafts = new Map([
			[
				'A',
				{
					...initMetricsDraft(makeParticipant('A'), 'ws-A-old'),
					balanceTest: 'draft-A',
					mazeQ1: '55'
				}
			],
			[
				'B',
				{
					...initMetricsDraft(makeParticipant('B'), 'ws-B'),
					balanceTest: 'draft-B',
					mazeQ1: '88'
				}
			]
		]);

		const result = rebuildDraftMap(metrics, wordSetIdMap, prevDrafts, 'A');
		expect(result.size).toBe(2);
		// A refreshed from server (ignore prev draft)
		expect(result.get('A')?.balanceTest).toBe('server-A-new');
		expect(result.get('A')?.mazeQ1).toBe('0.25');
		expect(result.get('A')?.wordSetId).toBe('ws-A-new');
		// B preserved from draft
		expect(result.get('B')?.balanceTest).toBe('draft-B');
		expect(result.get('B')?.mazeQ1).toBe('88');
		expect(result.get('B')?.wordSetId).toBe('ws-B');
	});

	it('new participant C appears in metrics and gets fresh draft', () => {
		const metrics = [
			makeParticipant('A'),
			makeParticipant('C', { balanceTest: 'new-C', mazeQ1: 9 })
		];
		const wordSetIdMap = new Map([
			['A', 'ws-A'],
			['C', 'ws-C']
		]);
		const prevDrafts = new Map([
			['A', { ...initMetricsDraft(metrics[0], 'ws-A'), balanceTest: 'draft-A' }]
		]);

		const result = rebuildDraftMap(metrics, wordSetIdMap, prevDrafts, null);
		expect(result.size).toBe(2);
		expect(result.get('A')?.balanceTest).toBe('draft-A');
		// C gets fresh server values
		expect(result.get('C')?.balanceTest).toBe('new-C');
		expect(result.get('C')?.mazeQ1).toBe('9');
		expect(result.get('C')?.wordSetId).toBe('ws-C');
	});

	it('participant removed from metrics is absent from result map', () => {
		const metrics = [makeParticipant('A')];
		const wordSetIdMap = new Map([['A', 'ws-A']]);
		const prevDrafts = new Map([
			['A', { ...initMetricsDraft(makeParticipant('A'), 'ws-A'), balanceTest: 'draft-A' }],
			['B', { ...initMetricsDraft(makeParticipant('B'), 'ws-B'), balanceTest: 'draft-B' }]
		]);

		const result = rebuildDraftMap(metrics, wordSetIdMap, prevDrafts, null);
		expect(result.size).toBe(1);
		expect(result.has('A')).toBe(true);
		expect(result.has('B')).toBe(false);
	});

	it('wordSetId re-sync: user-typed fields preserved but wordSetId updated from server map', () => {
		const metrics = [makeParticipant('A', { balanceTest: 'server-A', mazeQ1: 0.5 })];
		const wordSetIdMap = new Map([['A', 'ws-new']]);
		const prevDrafts = new Map([
			[
				'A',
				{
					...initMetricsDraft(makeParticipant('A'), 'ws-old'),
					balanceTest: 'draft-A',
					mazeQ2: 'draft-mazeQ2',
					wordSetId: 'ws-old'
				}
			]
		]);

		const result = rebuildDraftMap(metrics, wordSetIdMap, prevDrafts, null);
		expect(result.size).toBe(1);
		// User-typed fields preserved
		expect(result.get('A')?.balanceTest).toBe('draft-A');
		expect(result.get('A')?.mazeQ2).toBe('draft-mazeQ2');
		// wordSetId re-synced from map
		expect(result.get('A')?.wordSetId).toBe('ws-new');
		// Server-only field refreshed
		expect(result.get('A')?.mazeQ1).toBe('0.5');
	});
});

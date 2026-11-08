import { describe, it, expect } from 'vitest';
import { ProtocolEngine } from './engine';
import { validateProtocolPayload } from './validation';
import {
	antiBoard,
	scan,
	directions,
	normalize,
	draftLexicalPlan,
	randomFromSeed,
	colorPair,
	distance
} from './generators';
import { protocolTypes, type ProtocolType } from './config';
function validate(e: ProtocolEngine) {
	const p = validateProtocolPayload(e.type, e.payload());
	expect(p.meta.protocol_version).toBe('1');
	return p;
}
function memoryRun(success: boolean) {
	const e = new ProtocolEngine('memory_matrix', 'memory');
	let now = 0;
	e.start(now);
	for (let i = 0; i < 10; i++) {
		now += 2000;
		e.tick(now);
		now += 100;
		if (success) e.answer([...e.current!.stimulus.target_cells!], now);
		else e.tick((now = e.deadline));
		now += 1100;
		e.tick(now);
	}
	return e;
}
describe('memory protocol', () => {
	it('presents exactly levels 1..10 on ten successes without counting eleven', () => {
		const e = memoryRun(true);
		expect(e.phase).toBe('finished');
		expect(e.trials.map((t) => t.stimulus.level)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
		expect(e.summary.max_level).toBe(10);
		expect(e.summary.max_correct_level).toBe(10);
		validate(e);
	});
	it('ten timeouts keep level one and generate new patterns', () => {
		const e = memoryRun(false);
		expect(e.trials).toHaveLength(10);
		expect(e.summary.max_level).toBe(1);
		expect(e.summary.mean_response_time).toBeNull();
		expect(e.summary.total_reproduction_ms).toBe(300000);
		expect(e.payload().meta.eligible_for_profile).toBe('false');
		validate(e);
	});
	it('ignores input during display and rejects a late answer', () => {
		const e = new ProtocolEngine('memory_matrix', 'late');
		e.start(0);
		e.toggle(1, 100);
		expect(e.selected).toEqual([]);
		e.tick(2000);
		e.answer(e.current!.stimulus.target_cells!, 32001);
		expect(e.trials[0].is_timeout).toBe(true);
		expect(e.trials[0].response_time_ms).toBeNull();
	});
});
describe('search and generation', () => {
	it('counts a palindrome and its reverse once', () =>
		expect(scan(['шалаш'], 'шалаш', directions)).toEqual([[4, 3, 2, 1, 0]]));
	it('generates auditable boards for each level', () => {
		for (let seed = 0; seed < 15; seed++)
			for (const level of [1, 2, 3]) {
				const s = antiBoard(level, randomFromSeed(String(seed)));
				expect(scan(s.grid_snapshot!, s.target_word!, s.allowed_directions!)).toEqual(
					s.expected_paths
				);
				if (level === 1)
					expect(scan(s.grid_snapshot!, s.target_word!, directions)).toHaveLength(1);
			}
	});
	it('deduplicates paths and stop ends only one board', () => {
		const e = new ProtocolEngine('anti_munsterberg', 'anti');
		e.start(0);
		e.stopBoard(100);
		expect(e.trials).toHaveLength(1);
		expect(e.current!.trial_index).toBe(2);
		while (e.phase !== 'finished') e.stopBoard(200);
		validate(e);
	});
	it('normalizes punctuation and yo without fuzzy spelling', () => {
		expect(normalize('  « ЁЛКИ  и СОСНЫ! » ')).toBe('елки и сосны');
		expect(normalize('цвита')).not.toBe('цвета');
	});
	it('balances the temporary lexical plan and never repeats stimuli', () => {
		const plan = draftLexicalPlan(randomFromSeed('lex'));
		expect(plan).toHaveLength(10);
		expect(new Set(plan.map((s) => s.displayed_token)).size).toBe(10);
		expect(plan.filter((s) => s.is_real_word)).toHaveLength(5);
		for (const real of [true, false])
			expect(
				plan.filter((s) => s.is_real_word === real && s.difficulty_level === 1)
			).toHaveLength(3);
	});
	it('computes unique color answers using displayed RGB', () => {
		for (let i = 1; i <= 10; i++)
			for (const type of [
				'color_lightness',
				'color_saturation',
				'color_distance'
			] as ProtocolType[]) {
				const s = colorPair(type, i, randomFromSeed(type + i));
				expect(s.option_a_srgb).not.toEqual(s.option_b_srgb);
				if (type === 'color_distance')
					expect(s.correct_option).toBe(
						distance(s.option_a_srgb!, s.reference_srgb!) <
							distance(s.option_b_srgb!, s.reference_srgb!)
							? 'A'
							: 'B'
					);
			}
	});
});
describe('sum matrix', () => {
	it('accepts alternative combinations, requires a nonempty zero selection and can deselect an overshoot', () => {
		const e = new ProtocolEngine('sum_matrix', 'sum');
		e.start(0);
		const t = e.current!;
		t.stimulus.values_snapshot = Array(100).fill(9);
		t.stimulus.values_snapshot[0] = 0;
		t.stimulus.values_snapshot[1] = 6;
		t.stimulus.values_snapshot[2] = 1;
		t.stimulus.values_snapshot[3] = 2;
		t.stimulus.values_snapshot[4] = 3;
		const r = t.rounds![0];
		r.source_cell_ids = [2, 3, 4];
		r.target_sum = 6;
		e.toggle(5, 10);
		expect(e.selected).toEqual([5]);
		e.toggle(5, 20);
		expect(e.selected).toEqual([]);
		e.toggle(1, 30);
		expect(t.stimulus.locked_cell_ids).toEqual([1]);
		expect(r.status).toBe('solved');
		const zero = t.rounds!.at(-1)!;
		zero.target_sum = 0;
		zero.source_cell_ids = [0];
		expect(zero.status).toBe('open');
		e.toggle(0, 40);
		expect(zero.status).toBe('solved');
		e.tick(60000);
		expect(e.summary.numbers_completed).toBe(2);
		expect(e.summary.overshoot_N).toBe(1);
	});
	it('replays events and refuses forged completed cell totals', () => {
		const e = new ProtocolEngine('sum_matrix', 'audit');
		e.start(0);
		const source = [...e.current!.rounds![0].source_cell_ids];
		let now = 0;
		for (const cell of source) e.toggle(cell, ++now);
		e.tick(60000);
		validate(e);
		const p = e.payload();
		p.results[0].stimulus.locked_cell_ids!.push(99);
		expect(() => validateProtocolPayload(e.type, p)).toThrow();
	});
});
describe('motor reaction', () => {
	it('treats clicks before the actual green frame as false starts', () => {
		const e = new ProtocolEngine('motor_button', 'motor');
		e.start(0);
		e.tick(e.waitUntil);
		expect(e.phase).toBe('green_pending');
		e.answer('', e.waitUntil + 1);
		expect(e.trials[0].is_false_start).toBe(true);
		expect(e.trials[0].response_time_ms).toBeNull();
		validate(e);
	});
	it('accepts a positive 50ms reaction without a 300ms floor', () => {
		const e = new ProtocolEngine('motor_button', 'motor');
		e.start(0);
		const onset = e.waitUntil + 20;
		e.tick(onset);
		e.greenOnset(onset);
		e.answer('', onset + 50);
		expect(e.summary.reaction_ms).toBe(50);
		validate(e);
	});
	it('records timeout as null RT', () => {
		const e = new ProtocolEngine('motor_button', 'motor');
		e.start(0);
		e.tick(e.waitUntil);
		e.greenOnset(e.waitUntil + 10);
		e.tick(e.deadline);
		expect(e.trials[0].is_timeout).toBe(true);
		validate(e);
	});
});
describe('full and aborted sessions', () => {
	for (const type of protocolTypes)
		it(`validates ${type} history`, () => {
			if (type === 'memory_matrix') {
				validate(memoryRun(true));
				return;
			}
			const e = new ProtocolEngine(type, `full-${type}`);
			e.start(0);
			let now = 0;
			while (e.phase !== 'finished') {
				if (type === 'sum_matrix') {
					e.tick(60000);
					break;
				}
				if (type === 'anti_munsterberg') {
					e.stopBoard((now += 100));
					continue;
				}
				if (type === 'motor_button') {
					e.tick(e.waitUntil);
					e.greenOnset(e.waitUntil + 10);
					e.answer('', e.waitUntil + 50);
					continue;
				}
				if (type.startsWith('color_')) e.colorOnset(now);
				now += 100;
				const s = e.current!.stimulus;
				e.answer(
					type === 'verbal_classification'
						? s.accepted_answers_snapshot![0]
						: type === 'lexical_decision'
							? true
							: s.correct_option!,
					now
				);
			}
			validate(e);
			if (type === 'lexical_decision') expect(e.summary.accuracy).toBe(0.5);
		});
	for (const type of protocolTypes)
		it(`preserves partial ${type} without fake trials`, () => {
			const e = new ProtocolEngine(type, `abort-${type}`);
			e.start(0);
			e.abort(100);
			expect(e.trials).toHaveLength(1);
			expect(e.payload().meta.completed).toBe('false');
			validate(e);
		});
});

describe('crash checkpoints', () => {
	it('snapshots a partial memory choice without changing the active session', () => {
		const e = new ProtocolEngine('memory_matrix', 'checkpoint');
		e.start(0);
		e.tick(2000);
		e.toggle(0, 2100);
		const checkpoint = e.interruptedPayload(2200);
		expect(e.phase).toBe('answer');
		expect(e.trials).toHaveLength(0);
		expect(e.selected).toEqual([0]);
		expect(checkpoint.meta.end_reason).toBe('technical_error');
		expect(checkpoint.results[0].response).toEqual([0]);
		validateProtocolPayload(e.type, checkpoint);
	});
	it('retains selected cells at timeout with a null response time', () => {
		const e = new ProtocolEngine('memory_matrix', 'timeout-choice');
		e.start(0);
		e.tick(2000);
		e.toggle(0, 2100);
		e.tick(32000);
		expect(e.trials[0].response).toEqual([0]);
		expect(e.trials[0].response_time_ms).toBeNull();
		e.abort(32100);
		validate(e);
	});
	it('does not admit a false start to the profile', () => {
		const e = new ProtocolEngine('motor_button', 'false-start');
		e.start(0);
		e.answer('', 10);
		expect(e.payload().meta.eligible_for_profile).toBe('false');
		validate(e);
	});
});

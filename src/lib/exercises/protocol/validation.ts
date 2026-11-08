import { definitions, isProtocolType, protocolConfig, type ProtocolType } from './config';
import type { ProtocolPayload } from './types';
import { normalize, scan, pathKey, directions, hslToRgb, distance, dictionary } from './generators';
import { summarize } from './summary';
export class ProtocolValidationError extends Error {}
function assert(value: unknown, message: string): asserts value {
	if (!value) throw new ProtocolValidationError(message);
}
function unique(values: number[]) {
	return new Set(values).size === values.length;
}
function cells(value: unknown, max: number): asserts value is number[] {
	assert(
		Array.isArray(value) &&
			value.every((v) => Number.isInteger(v) && v >= 0 && v < max) &&
			unique(value),
		'Invalid cell identifiers'
	);
}
function same(a: unknown, b: unknown) {
	return JSON.stringify(a) === JSON.stringify(b);
}
/** Rebuild correctness and aggregate counts from the recorded stimulus and event history. */
function validatePayload(type: ProtocolType, input: unknown): ProtocolPayload {
	assert(
		input && typeof input === 'object' && 'results' in input && 'meta' in input,
		'Protocol payload requires history and metadata'
	);
	const payload = structuredClone(input) as ProtocolPayload;
	assert(Array.isArray(payload.results) && payload.results.length <= 1000, 'Invalid history');
	assert(payload.meta && typeof payload.meta === 'object', 'Invalid metadata');
	const m = payload.meta;
	assert(
		m.protocol_version === '1' &&
			typeof m.generator_seed === 'string' &&
			m.generator_seed.length <= 200,
		'Invalid protocol'
	);
	assert(
		['completed', 'aborted', 'technical_error'].includes(m.end_reason),
		'Invalid session end reason'
	);
	const completed = m.end_reason === 'completed';
	assert(m.completed === String(completed), 'Completion mismatch');
	assert(['mouse', 'touch', 'keyboard'].includes(m.input_mode), 'Invalid input mode');
	assert(['diagnostic', 'training'].includes(m.role), 'Invalid role');
	const config = JSON.parse(m.config_snapshot);
	assert(
		config.show_ms === protocolConfig.show_ms &&
			config.memory_response_ms === 30000 &&
			config.deadline === definitions[type].deadline &&
			config.count === definitions[type].count,
		'Unsupported config'
	);
	let previousLevel = 1;
	let previousPattern: number[] | undefined;
	let finalSumTime = 0;
	if (completed && type !== 'sum_matrix')
		assert(payload.results.length === definitions[type].count, 'Wrong trial count');
	for (const [index, t] of payload.results.entries()) {
		assert(
			t.trial_index === index + 1 && t.stimulus && Array.isArray(t.events),
			'Invalid trial index'
		);
		assert(t.response_deadline_ms === definitions[type].deadline, 'Invalid deadline');
		assert(
			Number.isFinite(t.response_elapsed_ms) &&
				t.response_elapsed_ms >= 0 &&
				t.response_elapsed_ms <= t.response_deadline_ms,
			'Invalid elapsed time'
		);
		assert(
			t.response_time_ms === null ||
				(Number.isFinite(t.response_time_ms) &&
					t.response_time_ms >= 0 &&
					t.response_time_ms < t.response_deadline_ms &&
					t.response_time_ms === t.response_elapsed_ms),
			'Invalid response time'
		);
		assert(
			typeof t.is_timeout === 'boolean' && typeof t.is_correct === 'boolean',
			'Invalid trial flags'
		);
		const partial = t.end_reason === 'aborted';
		if (partial)
			assert(!completed && index === payload.results.length - 1, 'Invalid partial trial');
		if (t.is_timeout)
			assert(
				t.response_time_ms === null && t.response_elapsed_ms === t.response_deadline_ms,
				'Invalid timeout'
			);
		let correct = false;
		const s = t.stimulus;
		if (type === 'verbal_classification') {
			const f = dictionary.features.find((f) => f.id === s.feature_id);
			assert(f && f.level === t.difficulty_level, 'Unknown feature');
			assert(
				Array.isArray(s.displayed_words) &&
					s.displayed_words.length === 3 &&
					new Set(s.displayed_words.map(normalize)).size === 3 &&
					s.displayed_words.every((w) => f.words.includes(w)),
				'Invalid displayed words'
			);
			const accepted = dictionary.features
				.filter((f) =>
					s.displayed_words!.every((w) => f.words.map(normalize).includes(normalize(w)))
				)
				.flatMap((f) => [f.label, ...f.aliases])
				.map(normalize);
			if (
				s.displayed_words.map(normalize).sort().join('|') ===
				['красный', 'желтый', 'зеленый'].sort().join('|')
			)
				accepted.push('цвета светофора', 'цвет светофора');
			assert(
				same([...new Set(accepted)].sort(), [...s.accepted_answers_snapshot!].sort()),
				'Unapproved answer snapshot'
			);
			correct =
				!t.is_timeout &&
				typeof t.response === 'string' &&
				accepted.includes(normalize(t.response));
			s.normalized_answer = typeof t.response === 'string' ? normalize(t.response) : null;
			s.matched_feature_id = correct ? s.feature_id : null;
		} else if (type === 'memory_matrix') {
			assert(
				s.level === previousLevel &&
					t.difficulty_level === s.level &&
					s.grid_size === 3 + Math.floor((s.level! - 1) / 2) &&
					s.target_count === s.level! + 2,
				'Invalid memory progression'
			);
			cells(s.target_cells, s.grid_size! ** 2);
			assert(s.target_cells.length === s.target_count, 'Invalid target pattern');
			if (
				previousPattern &&
				index > 0 &&
				payload.results[index - 1].stimulus.level === s.level
			)
				assert(
					!same([...s.target_cells].sort(), [...previousPattern].sort()),
					'Repeated pattern'
				);
			previousPattern = s.target_cells;
			const response = t.response ?? [];
			cells(response, s.grid_size! ** 2);
			correct =
				!t.is_timeout &&
				!partial &&
				response.length === s.target_count &&
				same([...response].sort(), [...s.target_cells].sort());
			if (!partial && !t.is_timeout)
				assert(response.length === s.target_count, 'Premature memory response');
			previousLevel += Number(correct);
		} else if (type === 'lexical_decision') {
			assert(
				typeof s.displayed_token === 'string' &&
					/^[а-яё]+$/iu.test(s.displayed_token) &&
					typeof s.is_real_word === 'boolean' &&
					[1, 2].includes(t.difficulty_level),
				'Invalid lexical stimulus'
			);
			if (s.is_real_word)
				assert(
					dictionary.real.some(
						(e) =>
							e.id === s.lexicon_entry_id &&
							e.token === s.displayed_token &&
							e.level === t.difficulty_level
					),
					'Invalid real word'
				);
			else
				assert(
					!/^[ьъы]/i.test(s.displayed_token) &&
						!dictionary.real.some(
							(e) => normalize(e.token) === normalize(s.displayed_token!)
						) &&
						s.dictionary_provisional === true,
					'Invalid provisional pseudo word'
				);
			correct =
				!t.is_timeout && typeof t.response === 'boolean' && t.response === s.is_real_word;
		} else if (type.startsWith('color_')) {
			for (const side of ['a', 'b'] as const) {
				const hsl = s[`option_${side}_hsl`]!;
				assert(
					Array.isArray(hsl) &&
						hsl.length === 3 &&
						hsl.every(Number.isFinite) &&
						hsl[0] >= 0 &&
						hsl[0] < 360 &&
						hsl[1] >= 0 &&
						hsl[1] <= 100 &&
						hsl[2] >= 0 &&
						hsl[2] <= 100,
					'Invalid HSL'
				);
				assert(same(hslToRgb(hsl), s[`option_${side}_srgb`]), 'Color conversion mismatch');
			}
			const a = s.option_a_hsl!,
				b = s.option_b_hsl!;
			assert(!same(s.option_a_srgb, s.option_b_srgb), 'Identical displayed colors');
			assert(t.difficulty_level === index + 1, 'Invalid color progression');
			let option: string;
			if (type === 'color_distance') {
				assert(
					Array.isArray(s.reference_hsl) &&
						same(hslToRgb(s.reference_hsl), s.reference_srgb),
					'Invalid reference'
				);
				const da = distance(s.option_a_srgb!, s.reference_srgb!),
					db = distance(s.option_b_srgb!, s.reference_srgb!);
				assert(Math.abs(da - db) > 1e-6, 'Ambiguous colors');
				s.distance_a = da;
				s.distance_b = db;
				s.distance_gap = Math.abs(da - db);
				option = da < db ? 'A' : 'B';
			} else {
				const axis = type === 'color_lightness' ? 2 : 1;
				assert(
					a.every((v, i) => i === axis || v === b[i]) &&
						Math.abs(a[axis] - b[axis]) === 2 * (10 - index) &&
						s.delta_param === 10 - index,
					'Invalid color delta'
				);
				if (type === 'color_saturation')
					assert(
						!['white', 'black'].includes(s.base_color_family!),
						'Neutral saturation'
					);
				option = a[axis] > b[axis] ? 'A' : 'B';
			}
			assert(s.correct_option === option, 'Wrong color key');
			correct = !t.is_timeout && t.response === option;
		} else if (type === 'motor_button') {
			assert(s.planned_wait_ms! >= 2000 && s.planned_wait_ms! <= 5000, 'Invalid motor delay');
			if (t.is_false_start) {
				assert(
					t.response_time_ms === null &&
						!t.is_timeout &&
						t.click_onset_ms !== null &&
						t.click_onset_ms !== undefined &&
						(t.green_onset_ms === null || t.click_onset_ms < t.green_onset_ms!),
					'Invalid false start'
				);
			} else if (!partial) {
				assert(
					Number.isFinite(t.green_onset_ms) && t.green_onset_ms! >= s.planned_wait_ms!,
					'Missing green onset'
				);
				if (!t.is_timeout) {
					assert(
						Number.isFinite(t.click_onset_ms) &&
							Math.abs(t.click_onset_ms! - t.green_onset_ms! - t.response_time_ms!) <
								0.001,
						'Invalid reaction time'
					);
					correct = true;
				}
			}
		} else if (type === 'anti_munsterberg') {
			assert(t.difficulty_level === Math.ceil((index + 1) / 2), 'Invalid board progression');
			assert(
				typeof s.target_word === 'string' &&
					s.target_word.length >= 4 &&
					s.target_word.length <= 8 &&
					Array.isArray(s.grid_snapshot) &&
					s.grid_snapshot.length > 0 &&
					s.grid_snapshot.every((row) => row.length === s.grid_snapshot![0].length),
				'Invalid grid'
			);
			const allowed = t.difficulty_level === 3 ? directions : [[0, 1]];
			assert(same(s.allowed_directions, allowed), 'Invalid directions');
			const expected = scan(s.grid_snapshot, s.target_word, allowed);
			assert(expected.length > 0, 'Empty board');
			if (t.difficulty_level === 1)
				assert(
					scan(s.grid_snapshot, s.target_word, directions).length === 1,
					'Ambiguous simple board'
				);
			assert(same(expected, s.expected_paths), 'Wrong expected paths');
			assert(
				Array.isArray(s.forced_paths) && s.forced_paths.length > 0,
				'Missing forced paths'
			);
			for (const p of s.forced_paths)
				assert(
					expected.some(
						(x) => pathKey(x, s.target_word!) === pathKey(p.path, s.target_word!)
					),
					'Invalid forced path'
				);
			if (t.difficulty_level === 3) {
				const counts = new Map<string, number>();
				for (const p of s.forced_paths) {
					const key = p.direction.join(',');
					assert(
						directions.some((d) => same(d, p.direction)),
						'Invalid forced direction'
					);
					counts.set(key, (counts.get(key) ?? 0) + 1);
				}
				assert(
					counts.size >= 3 &&
						counts.size <= 5 &&
						[...counts.values()].every((c) => c >= 1 && c <= 2),
					'Invalid hard placements'
				);
			}
			const found = new Set<string>();
			let last = 0,
				elapsed = 0;
			for (const [i, e] of t.events.entries()) {
				assert(
					e.event_index === i + 1 &&
						e.event_elapsed_ms >= elapsed &&
						e.event_elapsed_ms < 60000,
					'Invalid selection time'
				);
				elapsed = e.event_elapsed_ms;
				cells(e.selected_path, s.grid_snapshot.length * s.grid_snapshot[0].length);
				const path = e.selected_path as number[],
					key = pathKey(path, s.target_word);
				const good = expected.some((p) => pathKey(p, s.target_word!) === key),
					duplicate = good && found.has(key);
				e.is_correct = good;
				e.is_duplicate = duplicate;
				e.occurrence_key = good ? key : null;
				e.selection_interval_ms = elapsed - last;
				if (good && !duplicate) {
					found.add(key);
					last = elapsed;
				}
			}
			assert(
				partial || ['all_found', 'user_stop', 'time_limit'].includes(t.end_reason!),
				'Invalid board end'
			);
			if (t.end_reason === 'all_found')
				assert(found.size === expected.length, 'Incomplete search');
			if (t.end_reason === 'time_limit')
				assert(t.response_elapsed_ms === 60000, 'Early time limit');
			correct = found.size === expected.length;
		} else if (type === 'sum_matrix') {
			const values = s.values_snapshot;
			assert(
				Array.isArray(values) &&
					values.length === 100 &&
					values.every((v) => Number.isInteger(v) && v >= 0 && v <= 9),
				'Invalid sum board'
			);
			const locked = new Set<number>();
			assert(Array.isArray(t.rounds) && t.rounds.length > 0, 'Missing rounds');
			let offset = Number(s.created_offset_ms);
			assert(
				Number.isFinite(offset) && offset >= 0 && offset < 60000 && offset >= finalSumTime,
				'Invalid board time'
			);
			for (const [i, r] of t.rounds.entries()) {
				assert(
					r.round_index === i + 1 &&
						r.started_offset_ms >= offset &&
						r.started_offset_ms < 60000,
					'Invalid round'
				);
				cells(r.source_cell_ids, 100);
				const free = 100 - locked.size;
				assert(
					r.source_cell_ids.every((id) => !locked.has(id)) &&
						r.source_cell_ids.length > 0 &&
						(free <= 2
							? r.source_cell_ids.length === free
							: r.source_cell_ids.length >= 3 &&
								r.source_cell_ids.length <= Math.min(5, free)),
					'Invalid source cells'
				);
				assert(
					r.target_sum === r.source_cell_ids.reduce((n, id) => n + values[id], 0),
					'Invalid sum target'
				);
				let selected: number[] = [];
				let eventTime = r.started_offset_ms;
				let solved = false;
				for (const [j, e] of r.events.entries()) {
					assert(
						!solved &&
							e.event_index === j + 1 &&
							e.event_elapsed_ms >= eventTime &&
							e.event_elapsed_ms < 60000,
						'Invalid sum event'
					);
					eventTime = e.event_elapsed_ms;
					const id = e.cell_id as number;
					assert(
						Number.isInteger(id) && id >= 0 && id < 100 && !locked.has(id),
						'Locked cell action'
					);
					const had = selected.includes(id);
					assert(e.selection_action === (had ? 'deselect' : 'select'), 'Invalid toggle');
					selected = had ? selected.filter((x) => x !== id) : [...selected, id];
					assert(same(selected, e.selected_cell_ids), 'Selection mismatch');
					const sum = selected.reduce((n, id) => n + values[id], 0);
					assert(e.selected_sum_after === sum, 'Wrong selected sum');
					solved = selected.length > 0 && sum === r.target_sum;
				}
				if (solved) {
					assert(
						r.status === 'solved' &&
							same(r.solved_cell_ids, selected) &&
							r.finished_offset_ms === eventTime &&
							r.response_time_ms === eventTime - r.started_offset_ms,
						'Invalid solved sum'
					);
					selected.forEach((id) => locked.add(id));
					r.is_correct = true;
					offset = eventTime;
				} else {
					assert(
						i === t.rounds.length - 1 &&
							['time_limit', 'aborted'].includes(r.status) &&
							r.solved_cell_ids.length === 0 &&
							r.response_time_ms === null,
						'Invalid unfinished sum'
					);
					r.is_correct = false;
					offset = eventTime;
				}
			}
			cells(s.locked_cell_ids, 100);
			assert(
				same([...locked].sort(), [...s.locked_cell_ids].sort()),
				'Locked cells mismatch'
			);
			correct = locked.size === 100;
			finalSumTime = offset;
			if (index < payload.results.length - 1)
				assert(correct, 'New board before completing previous board');
		}
		if (partial) correct = false;
		assert(t.is_correct === correct, 'Incorrect correctness flag');
		t.is_correct = correct;
	}
	if (type === 'lexical_decision' && completed) {
		assert(
			new Set(payload.results.map((t) => normalize(t.stimulus.displayed_token!))).size === 10,
			'Repeated lexical stimulus'
		);
		for (const real of [true, false])
			for (const level of [1, 2])
				assert(
					payload.results.filter(
						(t) => t.stimulus.is_real_word === real && t.difficulty_level === level
					).length === (level === 1 ? 3 : 2),
					'Invalid lexical balance'
				);
	}
	if (type === 'sum_matrix' && completed)
		assert(
			payload.results.length > 0 && payload.results.at(-1)!.end_reason === 'time_limit',
			'Incomplete sum session'
		);
	const summary = summarize(type, payload.results);
	assert(same(JSON.parse(m.summary), summary), 'Summary mismatch');
	m.summary = JSON.stringify(summary);
	const timeout = payload.results.some((t) => t.is_timeout),
		technical = m.end_reason !== 'technical_error';
	m.quality_flags = JSON.stringify({
		technical_valid: technical,
		complete: completed,
		has_timeout: timeout,
		provisional_dictionary: type === 'lexical_decision'
	});
	m.eligible_for_profile = String(
		completed &&
			technical &&
			!timeout &&
			type !== 'lexical_decision' &&
			(type !== 'motor_button' || payload.results[0]?.is_correct === true)
	);
	return payload;
}
export { isProtocolType };

export function validateProtocolPayload(type: ProtocolType, input: unknown): ProtocolPayload {
	try {
		return validatePayload(type, input);
	} catch (error) {
		if (error instanceof ProtocolValidationError) throw error;
		throw new ProtocolValidationError(
			error instanceof Error ? error.message : 'Malformed protocol payload',
			{ cause: error }
		);
	}
}

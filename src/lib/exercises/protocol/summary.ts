import type { ProtocolType } from './config';
import type { ProtocolTrial } from './types';
import { families, pathKey } from './generators';
export function mean(values: number[]): number | null {
	return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}
export function summarize(
	type: ProtocolType,
	trials: ProtocolTrial[]
): Record<string, number | null> {
	const correct = trials.filter((t) => t.is_correct);
	const s: Record<string, number | null> = { N: trials.length };
	if (type === 'anti_munsterberg') {
		let found = 0,
			wrong = 0;
		const times: number[] = [];
		for (const t of trials) {
			const keys = new Set<string>();
			for (const e of t.events) {
				if (e.is_correct && !e.is_duplicate) {
					keys.add(pathKey(e.selected_path as number[], t.stimulus.target_word!));
					times.push(e.selection_interval_ms as number);
				} else if (!e.is_correct) wrong++;
			}
			found += keys.size;
		}
		Object.assign(s, {
			total_found: found,
			precision: found + wrong ? found / (found + wrong) : null,
			mean_find_time: mean(times),
			full_board_N: trials.filter((t) => t.end_reason === 'all_found').length
		});
		for (const k of [1, 2, 3]) {
			const ts = trials.filter((t) => t.difficulty_level === k);
			const total = ts.reduce((n, t) => n + t.stimulus.expected_paths!.length, 0);
			s[`recall_${k}`] = total
				? ts.reduce(
						(n, t) =>
							n + t.events.filter((e) => e.is_correct && !e.is_duplicate).length,
						0
					) / total
				: null;
		}
		return s;
	}
	if (type === 'sum_matrix') {
		const rounds = trials.flatMap((t) => t.rounds ?? []),
			solved = rounds.filter((r) => r.status === 'solved');
		return {
			...s,
			numbers_completed: trials.reduce(
				(n, t) => n + (t.stimulus.locked_cell_ids?.length ?? 0),
				0
			),
			targets_solved: solved.length,
			boards_completed: trials.filter((t) => t.stimulus.locked_cell_ids?.length === 100)
				.length,
			mean_target_time: mean(solved.map((r) => r.response_time_ms!)),
			overshoot_N: rounds.reduce((n, r) => {
				let sum = 0;
				for (const e of r.events) {
					if (sum <= r.target_sum && (e.selected_sum_after as number) > r.target_sum) n++;
					sum = e.selected_sum_after as number;
				}
				return n;
			}, 0)
		};
	}
	if (type === 'memory_matrix')
		return {
			...s,
			correct_N: correct.length,
			max_level: Math.max(0, ...trials.map((t) => t.stimulus.level!)),
			max_correct_level: Math.max(0, ...correct.map((t) => t.stimulus.level!)),
			mean_response_time: mean(
				trials.flatMap((t) => (t.response_time_ms === null ? [] : [t.response_time_ms]))
			),
			total_reproduction_ms: trials.reduce((n, t) => n + t.response_elapsed_ms, 0)
		};
	if (type === 'motor_button')
		return {
			...s,
			reaction_ms: trials[0]?.response_time_ms ?? null,
			valid_result: trials[0]?.is_correct ? 1 : 0
		};
	Object.assign(s, {
		accuracy: trials.length ? correct.length / 10 : null,
		mean_time: mean(
			correct.flatMap((t) => (t.response_time_ms === null ? [] : [t.response_time_ms]))
		),
		timeout_N: trials.filter((t) => t.is_timeout).length
	});
	if (type === 'verbal_classification')
		for (const k of [1, 2, 3]) {
			const group = trials.filter((t) => t.difficulty_level === k);
			s[`accuracy_${k}`] = mean(group.map((t) => Number(t.is_correct)));
			s[`mean_time_${k}`] = mean(
				group
					.filter((t) => t.is_correct && t.response_time_ms !== null)
					.map((t) => t.response_time_ms!)
			);
		}
	if (type === 'lexical_decision') {
		s.real_accuracy = mean(
			trials.filter((t) => t.stimulus.is_real_word).map((t) => Number(t.is_correct))
		);
		s.pseudo_accuracy = mean(
			trials.filter((t) => !t.stimulus.is_real_word).map((t) => Number(t.is_correct))
		);
		s.balanced_accuracy =
			s.real_accuracy === null || s.pseudo_accuracy === null
				? null
				: (s.real_accuracy + s.pseudo_accuracy) / 2;
	}
	if (type.startsWith('color_')) {
		for (const f of families)
			s[`accuracy_${f}`] = mean(
				trials
					.filter((t) => t.stimulus.base_color_family === f)
					.map((t) => Number(t.is_correct))
			);
		const values = correct.map((t) =>
			type === 'color_distance' ? t.stimulus.distance_gap! : t.stimulus.delta_param!
		);
		s[type === 'color_distance' ? 'min_correct_gap' : 'min_correct_delta'] = values.length
			? Math.min(...values)
			: null;
	}
	return s;
}

import { definitions, protocolConfig, type ProtocolType } from './config';
import {
	classification,
	antiBoard,
	memoryPattern,
	draftLexicalPlan,
	colorPair,
	randomFromSeed,
	shuffle,
	integer,
	pathKey,
	normalize,
	dictionary
} from './generators';
import { summarize } from './summary';
import type { ProtocolTrial, ProtocolPayload, Stimulus, SumRound } from './types';
export class ProtocolEngine {
	phase:
		| 'ready'
		| 'show'
		| 'answer'
		| 'feedback'
		| 'waiting'
		| 'green_pending'
		| 'green'
		| 'finished' = 'ready';
	current: ProtocolTrial | null = null;
	trials: ProtocolTrial[] = [];
	selected: number[] = [];
	endReason = '';
	summary: Record<string, number | null> = {};
	started = 0;
	onset = 0;
	deadline = 0;
	waitUntil = 0;
	phaseUntil = 0;
	private startedAt = 0;
	private rng: () => number;
	private plan: Stimulus[] = [];
	private used: string[] = [];
	private previousPattern: number[] | undefined;
	private level = 1;
	private lastFound = 0;
	private endedAt = 0;
	constructor(
		public type: ProtocolType,
		public seed: string = crypto.randomUUID()
	) {
		this.rng = randomFromSeed(seed);
	}
	start(now: number) {
		if (this.phase !== 'ready') return;
		this.started = now;
		this.startedAt = Date.now();
		if (this.type === 'lexical_decision') this.plan = draftLexicalPlan(this.rng);
		try {
			this.next(now);
		} catch {
			this.finish('technical_error');
		}
	}
	private next(now: number) {
		this.selected = [];
		let stimulus: Stimulus,
			level = 1;
		const index = this.trials.length + 1;
		if (this.type === 'verbal_classification') {
			const q = classification(this.rng, this.used);
			stimulus = q.stimulus;
			level = q.level;
			this.used.push(stimulus.feature_id!);
		} else if (this.type === 'anti_munsterberg') {
			level = Math.ceil(index / 2);
			stimulus = antiBoard(level, this.rng);
			this.lastFound = 0;
		} else if (this.type === 'memory_matrix') {
			level = this.level;
			stimulus = memoryPattern(level, this.rng, this.previousPattern);
			this.previousPattern = stimulus.target_cells;
		} else if (this.type === 'lexical_decision') {
			stimulus = this.plan[index - 1];
			level = stimulus.difficulty_level as number;
		} else if (this.type.startsWith('color_')) {
			stimulus = colorPair(this.type, index, this.rng);
			level = index;
		} else if (this.type === 'sum_matrix')
			stimulus = {
				values_snapshot: Array.from({ length: 100 }, () => integer(this.rng, 0, 9)),
				locked_cell_ids: [],
				created_offset_ms: now - this.started
			};
		else stimulus = { planned_wait_ms: integer(this.rng, 2000, 5000) };
		this.current = {
			trial_index: index,
			difficulty_level: level,
			stimulus,
			response_deadline_ms: definitions[this.type].deadline,
			response_time_ms: null,
			response_elapsed_ms: 0,
			is_correct: false,
			is_timeout: false,
			events: []
		};
		this.onset = now;
		this.deadline = now + definitions[this.type].deadline;
		if (this.type === 'memory_matrix') {
			this.phase = 'show';
			this.phaseUntil = now + protocolConfig.show_ms;
		} else if (this.type === 'motor_button') {
			this.phase = 'waiting';
			this.waitUntil = now + stimulus.planned_wait_ms!;
			this.current.green_onset_ms = null;
		} else if (this.type.startsWith('color_')) {
			this.phase = 'answer';
			this.onset = Infinity;
			this.deadline = Infinity;
		} else {
			this.phase = 'answer';
			if (this.type === 'sum_matrix') {
				this.deadline = this.started + 60000;
				this.current.rounds = [];
				this.newRound(now);
			}
		}
	}
	colorOnset(now: number) {
		if (this.phase === 'answer' && this.type.startsWith('color_') && this.onset === Infinity) {
			this.onset = now;
			this.deadline = now + 10000;
			this.current!.onset_offset_ms = now - this.started;
		}
	}
	greenOnset(now: number) {
		if (this.phase !== 'green_pending') return;
		this.phase = 'green';
		this.onset = now;
		this.deadline = now + 5000;
		this.current!.green_onset_ms = now - this.started;
		this.current!.onset_offset_ms = now - this.started;
	}
	tick(now: number) {
		if (this.phase === 'ready' || this.phase === 'finished') return;
		if (this.phase === 'show' && now >= this.phaseUntil) {
			this.phase = 'answer';
			this.onset = now;
			this.deadline = now + 30000;
			return;
		}
		if (this.phase === 'feedback' && now >= this.phaseUntil) {
			if (this.trials.length === definitions[this.type].count) this.finish('completed');
			else
				try {
					this.next(now);
				} catch {
					this.finish('technical_error');
				}
			return;
		}
		if (this.phase === 'waiting' && now >= this.waitUntil) {
			this.phase = 'green_pending';
			return;
		}
		if ((this.phase === 'answer' || this.phase === 'green') && now >= this.deadline) {
			if (this.type === 'anti_munsterberg') this.stopBoard(now, 'time_limit');
			else if (this.type === 'sum_matrix') this.finishSum(now, 'completed');
			else this.commit(null, this.deadline, true);
		}
	}
	answer(value: string | boolean | number[], now: number) {
		if (this.type === 'motor_button') {
			if (this.phase === 'waiting' || this.phase === 'green_pending') {
				this.current!.is_false_start = true;
				this.current!.click_onset_ms = now - this.started;
				this.current!.end_reason = 'false_start';
				this.trials.push(this.current!);
				this.current = null;
				this.finish('completed');
				return;
			}
			if (this.phase !== 'green') return;
		} else if (this.phase !== 'answer') return;
		if (now >= this.deadline) {
			this.tick(now);
			return;
		}
		if (!Number.isFinite(this.onset)) return;
		this.commit(value, now, false);
	}
	private commit(value: string | boolean | number[] | null, now: number, timeout: boolean) {
		const t = this.current!;
		t.response = this.type === 'memory_matrix' && timeout ? [...this.selected] : value;
		t.response_elapsed_ms = Math.min(t.response_deadline_ms, Math.max(0, now - this.onset));
		t.response_time_ms = timeout ? null : t.response_elapsed_ms;
		t.is_timeout = timeout;
		if (!timeout) {
			if (this.type === 'verbal_classification') {
				t.is_correct = t.stimulus.accepted_answers_snapshot!.includes(
					normalize(String(value))
				);
				t.stimulus.normalized_answer = normalize(String(value));
				t.stimulus.matched_feature_id = t.is_correct ? t.stimulus.feature_id : null;
			} else if (this.type === 'lexical_decision')
				t.is_correct = value === t.stimulus.is_real_word;
			else if (this.type === 'memory_matrix')
				t.is_correct =
					Array.isArray(value) &&
					value.length === t.stimulus.target_count &&
					[...value].sort((a, b) => a - b).join(',') ===
						t.stimulus.target_cells!.join(',');
			else if (this.type === 'motor_button') {
				t.is_correct = true;
				t.is_false_start = false;
				t.click_onset_ms = now - this.started;
			} else t.is_correct = value === t.stimulus.correct_option;
		}
		t.end_reason = timeout ? 'timeout' : 'answered';
		this.trials.push(t);
		if (this.type === 'memory_matrix') {
			this.phase = 'feedback';
			this.phaseUntil = now + (t.is_correct ? 300 : 1000);
			if (t.is_correct) this.level++;
			return;
		}
		this.current = null;
		if (this.trials.length === definitions[this.type].count) this.finish('completed');
		else
			try {
				this.next(now);
			} catch {
				this.finish('technical_error');
			}
	}
	toggle(cell: number, now: number) {
		if (this.phase !== 'answer' || !Number.isInteger(cell) || !this.current) return;
		if (now >= this.deadline) {
			this.tick(now);
			return;
		}
		const t = this.current;
		const size = this.type === 'sum_matrix' ? 100 : (t.stimulus.grid_size ?? 0) ** 2;
		if (cell < 0 || cell >= size) return;
		if (this.type === 'sum_matrix' && t.stimulus.locked_cell_ids!.includes(cell)) return;
		const had = this.selected.includes(cell);
		this.selected = had ? this.selected.filter((c) => c !== cell) : [...this.selected, cell];
		if (this.type === 'memory_matrix') {
			if (this.selected.length === t.stimulus.target_count)
				this.answer([...this.selected], now);
			return;
		}
		if (this.type !== 'sum_matrix') return;
		const round = t.rounds!.at(-1)!;
		const sum = this.selected.reduce((n, id) => n + t.stimulus.values_snapshot![id], 0);
		round.events.push({
			event_index: round.events.length + 1,
			event_elapsed_ms: now - this.started,
			cell_id: cell,
			selection_action: had ? 'deselect' : 'select',
			selected_cell_ids: [...this.selected],
			selected_sum_after: sum
		});
		if (this.selected.length && sum === round.target_sum) {
			round.solved_cell_ids = [...this.selected];
			round.finished_offset_ms = now - this.started;
			round.response_time_ms = round.finished_offset_ms - round.started_offset_ms;
			round.status = 'solved';
			round.is_correct = true;
			t.stimulus.locked_cell_ids!.push(...this.selected);
			this.selected = [];
			if (t.stimulus.locked_cell_ids!.length === 100) {
				t.response_elapsed_ms = now - this.onset;
				t.is_correct = true;
				t.end_reason = 'all_locked';
				this.trials.push(t);
				this.current = null;
				this.next(now);
			} else this.newRound(now);
		}
	}
	private newRound(now: number) {
		const t = this.current!;
		const free = Array.from({ length: 100 }, (_, i) => i).filter(
			(i) => !t.stimulus.locked_cell_ids!.includes(i)
		);
		const ids = shuffle(free, this.rng).slice(
			0,
			Math.min(integer(this.rng, 3, 5), free.length)
		);
		const r: SumRound = {
			round_index: t.rounds!.length + 1,
			source_cell_ids: ids,
			target_sum: ids.reduce((n, id) => n + t.stimulus.values_snapshot![id], 0),
			solved_cell_ids: [],
			started_offset_ms: now - this.started,
			finished_offset_ms: null,
			response_time_ms: null,
			status: 'open',
			is_correct: false,
			events: []
		};
		t.rounds!.push(r);
	}
	selectPath(path: number[], now: number) {
		if (this.phase !== 'answer' || this.type !== 'anti_munsterberg') return;
		if (now >= this.deadline) {
			this.tick(now);
			return;
		}
		const t = this.current!,
			word = t.stimulus.target_word!,
			key = pathKey(path, word);
		const correct = t.stimulus.expected_paths!.some((p) => pathKey(p, word) === key);
		const duplicate = correct && t.events.some((e) => e.occurrence_key === key && e.is_correct);
		const elapsed = now - this.onset;
		t.events.push({
			event_index: t.events.length + 1,
			event_elapsed_ms: elapsed,
			selected_path: [...path],
			occurrence_key: correct ? key : null,
			is_correct: correct,
			is_duplicate: duplicate,
			selection_interval_ms: elapsed - this.lastFound
		});
		if (correct && !duplicate) this.lastFound = elapsed;
		if (
			t.events.filter((e) => e.is_correct && !e.is_duplicate).length ===
			t.stimulus.expected_paths!.length
		)
			this.stopBoard(now, 'all_found');
	}
	stopBoard(now: number, reason = 'user_stop') {
		if (now >= this.deadline) reason = 'time_limit';
		if (this.type !== 'anti_munsterberg' || this.phase !== 'answer') return;
		const t = this.current!;
		t.response_elapsed_ms = Math.min(60000, now - this.onset);
		t.end_reason = reason;
		t.is_correct = reason === 'all_found';
		this.trials.push(t);
		this.current = null;
		if (this.trials.length === 6) this.finish('completed');
		else
			try {
				this.next(now);
			} catch {
				this.finish('technical_error');
			}
	}
	private finishSum(now: number, reason: string) {
		if (this.current) {
			const t = this.current;
			const r = t.rounds!.at(-1);
			if (r && r.status === 'open')
				r.status = reason === 'completed' ? 'time_limit' : 'aborted';
			t.response_elapsed_ms = Math.min(60000, now - this.onset);
			t.end_reason = reason === 'completed' ? 'time_limit' : 'aborted';
			this.trials.push(t);
			this.current = null;
		}
		this.finish(reason);
	}
	abort(now: number, reason: 'aborted' | 'technical_error' = 'aborted') {
		if (this.phase === 'finished' || this.phase === 'ready') return;
		if (this.type === 'sum_matrix') {
			this.finishSum(now, reason);
			return;
		}
		if (this.current && this.phase !== 'feedback') {
			this.current.end_reason = 'aborted';
			if (this.type === 'memory_matrix') this.current.response = [...this.selected];
			this.current.response_elapsed_ms =
				['answer', 'green'].includes(this.phase) && Number.isFinite(this.onset)
					? Math.max(0, Math.min(this.current.response_deadline_ms, now - this.onset))
					: 0;
			this.trials.push(this.current);
			this.current = null;
		}
		this.finish(reason);
	}
	interruptedPayload(now: number): ProtocolPayload {
		const copy = new ProtocolEngine(this.type, this.seed);
		Object.assign(copy, this, {
			trials: structuredClone(this.trials),
			current: structuredClone(this.current),
			selected: [...this.selected]
		});
		copy.abort(now, 'technical_error');
		return copy.payload();
	}
	private finish(reason: string) {
		this.endReason = reason;
		this.phase = 'finished';
		this.endedAt = Date.now();
		this.summary = summarize(this.type, this.trials);
	}
	payload(inputMode = 'mouse'): ProtocolPayload {
		const completed = this.endReason === 'completed',
			timeout = this.trials.some((t) => t.is_timeout),
			technical = this.endReason !== 'technical_error';
		return {
			results: structuredClone(this.trials),
			meta: Object.fromEntries(
				Object.entries({
					protocol_version: '1',
					config_snapshot: JSON.stringify({
						...protocolConfig,
						deadline: definitions[this.type].deadline,
						count: definitions[this.type].count
					}),
					generator_seed: this.seed,
					generator_version: '1',
					dictionary_version:
						this.type === 'lexical_decision'
							? 'temporary-unverified-1'
							: dictionary.version,
					dictionary_provisional: this.type === 'lexical_decision',
					completed,
					end_reason: this.endReason,
					summary: JSON.stringify(this.summary),
					input_mode: inputMode,
					started_at: this.startedAt,
					finished_at: this.endedAt,
					quality_flags: JSON.stringify({
						technical_valid: technical,
						complete: completed,
						has_timeout: timeout,
						provisional_dictionary: this.type === 'lexical_decision'
					}),
					eligible_for_profile:
						completed &&
						technical &&
						!timeout &&
						this.type !== 'lexical_decision' &&
						(this.type !== 'motor_button' || this.trials[0]?.is_correct === true),
					role: 'diagnostic'
				}).map(([k, v]) => [k, String(v)])
			)
		};
	}
}

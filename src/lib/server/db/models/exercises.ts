import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { session } from '../schema';
import { generate } from 'short-uuid';

export const attentionAttempt = sqliteTable('attention_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	clickIndex: integer('click_index').notNull(),
	number: integer('number').notNull(),
	isTarget: integer('is_target', { mode: 'boolean' }).notNull(),
	isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
	reactionTimeMs: integer('reaction_time_ms').notNull(),
	totalTargets: integer('total_targets').notNull(),
	totalNumbers: integer('total_numbers').notNull(),
	sessionId: text('session_id')
		.notNull()
		.references(() => session.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});

export const emojiAttempt = sqliteTable('emoji_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	trialIndex: integer('trial_index').notNull(),
	previousEmoji: text('previous_emoji').notNull(),
	currentEmoji: text('current_emoji').notNull(),
	actualChanged: integer('actual_changed', { mode: 'boolean' }).notNull(),
	userSaidChanged: integer('user_said_changed', { mode: 'boolean' }).notNull(),
	isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
	reactionTimeMs: integer('reaction_time_ms').notNull(),
	sessionId: text('session_id')
		.notNull()
		.references(() => session.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});

export const lettersAttempt = sqliteTable('letters_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	roundIndex: integer('round_index').notNull(),
	target: text('target').notNull(),
	submitted: text('submitted').notNull(),
	isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
	reactionTimeMs: integer('reaction_time_ms').notNull(),
	letterCount: integer('letter_count').notNull(),
	timeoutTriggered: integer('time_limit', { mode: 'boolean' }).notNull(),
	elapsed: integer('elapsed').notNull(),
	sessionId: text('session_id')
		.notNull()
		.references(() => session.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});

export const flankerAttempt = sqliteTable('flanker_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	trialIndex: integer('trial_index').notNull(),
	target: text('target').notNull(),
	selected: text('selected').notNull(),
	isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
	congruent: integer('congruent', { mode: 'boolean' }).notNull(),
	reactionTimeMs: integer('reaction_time_ms').notNull(),
	timeLimit: integer('time_limit', { mode: 'boolean' }).notNull(),
	elapsedTime: integer('elapsed_time').notNull(),
	sessionId: text('session_id')
		.notNull()
		.references(() => session.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});

export const numbersAttempt = sqliteTable('numbers_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	levelIndex: integer('level_index').notNull(),
	level: integer('level').notNull(),
	digitCount: integer('digit_count').notNull(),
	mode: text('mode').notNull(),
	sequence: text('sequence').notNull(),
	submitted: text('submitted').notNull(),
	isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
	reactionTimeMs: integer('reaction_time_ms').notNull(),
	sessionId: text('session_id')
		.notNull()
		.references(() => session.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});

export const ravenAttempt = sqliteTable('raven_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	taskId: text('task_id').notNull(),
	taskIndex: integer('task_index').notNull(),
	taskClass: text('task_class').notNull(),
	difficultyLevel: integer('difficulty_level').notNull(),
	difficultyScore: integer('difficulty_score').notNull(),
	rules: text('rules').notNull(),
	skillTags: text('skill_tags').notNull(),
	selectedIndex: integer('selected_index'),
	correctIndex: integer('correct_index').notNull(),
	selectedFamily: text('selected_family'),
	isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
	responseTimeMs: integer('response_time_ms').notNull(),
	seed: text('seed').notNull(),
	sessionId: text('session_id')
		.notNull()
		.references(() => session.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});

export const picturesAttempt = sqliteTable('pictures_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	questionIndex: integer('question_index').notNull(),
	questionId: text('question_id').notNull(),
	questionKind: text('question_kind').notNull(),
	scored: integer('scored', { mode: 'boolean' }).notNull(),
	answer: text('answer'),
	isCorrect: integer('is_correct'),
	reactionTimeMs: integer('reaction_time_ms').notNull(),
	sessionId: text('session_id')
		.notNull()
		.references(() => session.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});

export const campimetryExerciseAttempt = sqliteTable('campimetry_exercise_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	attempt: integer('attempt').default(1).notNull(),
	stage: integer('stage').notNull(),
	silhouette: text('silhouette').notNull(),
	channel: text('channel').notNull(),
	op: text('op').notNull(),
	color: text('color').notNull(),
	delta: integer('delta').notNull(),
	time: integer('time').notNull(),
	sessionId: text('session_id')
		.notNull()
		.references(() => session.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});

export const memoryMatchExerciseAttempt = sqliteTable('memory_match_exercise_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	attempt: integer('attempt').default(1).notNull(),
	stage: integer('stage').notNull(),
	cardsCount: integer('cards_count').notNull(),
	flipsCount: integer('flips_count').notNull(),
	mistakes: integer('mistakes').notNull(),
	durationMs: integer('duration_ms').notNull(),
	efficiency: integer('efficiency').notNull(),
	sessionId: text('session_id')
		.notNull()
		.references(() => session.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});

export const nbackExerciseAttempt = sqliteTable('nback_exercise_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	clickIndex: integer('click_index').notNull(),
	stimIndex: integer('stim_index').notNull(),
	answer: text('answer').notNull(),
	truth: integer('truth', { mode: 'boolean' }).notNull(),
	isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
	rtMs: integer('rt_ms').notNull(),
	interClickMs: integer('inter_click_ms').notNull(),
	domain: text('domain').notNull(),
	nBack: integer('n_back').notNull(),
	target: text('target').notNull(),
	durationMs: integer('duration_ms').notNull(),
	totalStimuli: integer('total_stimuli').notNull(),
	sessionId: text('session_id')
		.notNull()
		.references(() => session.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});

export const wordMorphingExerciseAttempt = sqliteTable('word_morphing_exercise_attempt', {
	id: text('id').primaryKey().$defaultFn(generate),
	attempt: integer('attempt').default(1).notNull(),
	category: text('category').notNull(),
	comboIndex: integer('combo_index').notNull(),
	expectedCombo: text('expected_combo').notNull(),
	recalledCombo: text('recalled_combo'),
	isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
	originalCombo: text('original_combo').notNull(),
	durationSeconds: integer('duration_seconds').notNull(),
	sessionId: text('session_id')
		.notNull()
		.references(() => session.id),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});

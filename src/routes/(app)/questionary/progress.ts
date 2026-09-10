import { get } from 'svelte/store';
import { profileSurveyStore } from '$lib/stores/user';
import type { Flow, Question } from './flows';
import type { InsertProfileSurvey } from '$lib/server/db/models/survey';

function hasValue(v: unknown): boolean {
	if (v === null || v === undefined) return false;
	if (typeof v === 'string') return v.trim() !== '';
	return true;
}

export function isQuestionAnswered(q: Question): boolean {
	const snapshot = get(profileSurveyStore) as Partial<InsertProfileSurvey> | null;
	if (!snapshot) return false;
	return hasValue(snapshot[q.key as keyof InsertProfileSurvey]);
}

export function flowProgress(flow: Flow): { answered: number; total: number; done: boolean } {
	const total = flow.questions.length;
	let answered = 0;
	for (const q of flow.questions) {
		if (isQuestionAnswered(q)) answered++;
	}
	return { answered, total, done: answered === total };
}

export function firstUnansweredIndex(flow: Flow): number {
	for (let i = 0; i < flow.questions.length; i++) {
		if (!isQuestionAnswered(flow.questions[i])) return i;
	}
	return -1;
}
/** @fileoverview Pure helpers for the admin GTO results table */

import { SvelteMap } from 'svelte/reactivity';
import type { ParticipantMetrics } from '$lib/server/db/controllers/gto';

export type MetricsDraft = {
	balanceTest: string;
	mazeQ1: string;
	mazeQ2: string;
	mazeQ3: string;
	mazeVRNumber: string;
	mazeVRFileName: string;
	buttonTestNumber: string;
	buttonTestFileName: string;
	logic: string;
	wordSetId: string;
};

export function initMetricsDraft(
	participant: Pick<ParticipantMetrics, 'editableMetrics'>,
	wordSetId: string | undefined | null
): MetricsDraft {
	const em = participant.editableMetrics;
	return {
		balanceTest: em.balanceTest ?? '',
		mazeQ1: em.mazeQ1 !== null && em.mazeQ1 !== undefined ? String(em.mazeQ1) : '',
		mazeQ2: em.mazeQ2 !== null && em.mazeQ2 !== undefined ? String(em.mazeQ2) : '',
		mazeQ3: em.mazeQ3 !== null && em.mazeQ3 !== undefined ? String(em.mazeQ3) : '',
		mazeVRNumber:
			em.mazeVRNumber !== null && em.mazeVRNumber !== undefined
				? String(em.mazeVRNumber)
				: '',
		mazeVRFileName: em.mazeVRFileName ?? '',
		buttonTestNumber:
			em.buttonTestNumber !== null && em.buttonTestNumber !== undefined
				? String(em.buttonTestNumber)
				: '',
		buttonTestFileName: em.buttonTestFileName ?? '',
		logic: em.logic !== null && em.logic !== undefined ? String(em.logic) : '',
		wordSetId: wordSetId ?? ''
	};
}

export function collectMetricsFromDraft(draft: MetricsDraft): Record<string, string> {
	const payload: Record<string, string> = {};
	const numericFields = [
		'mazeQ1',
		'mazeQ2',
		'mazeQ3',
		'mazeVRNumber',
		'buttonTestNumber',
		'logic'
	] as const;
	for (const key of numericFields) {
		if (draft[key] !== '') {
			payload[key] = draft[key];
		}
	}
	if (draft.balanceTest) payload.balanceTest = draft.balanceTest;
	if (draft.mazeVRFileName) payload.mazeVRFileName = draft.mazeVRFileName;
	if (draft.buttonTestFileName) payload.buttonTestFileName = draft.buttonTestFileName;
	return payload;
}

export function rebuildDraftMap(
	metrics: ParticipantMetrics[],
	wordSetIdMap: Map<string, string | undefined | null>,
	prevDrafts: Map<string, MetricsDraft> | null | undefined,
	savedParticipantId: string | null
): SvelteMap<string, MetricsDraft> {
	const next = new SvelteMap<string, MetricsDraft>();
	for (const m of metrics) {
		if (m.participantId === savedParticipantId) {
			next.set(m.participantId, initMetricsDraft(m, wordSetIdMap.get(m.participantId)));
		} else {
			const carried = prevDrafts?.get(m.participantId);
			if (carried) {
				next.set(m.participantId, {
					...carried,
					wordSetId: wordSetIdMap.get(m.participantId) ?? ''
				});
			} else {
				next.set(m.participantId, initMetricsDraft(m, wordSetIdMap.get(m.participantId)));
			}
		}
	}
	return next;
}

import type { QueueElement } from '$lib/client/offline-queue';

/** Session row used on the results page (server + pending). */
export type ResultsPageSession = {
	sessionId: string;
	createdAt: string;
	attempts: unknown[];
	meta?: Record<string, string> | unknown;
	pending?: boolean;
};

/** MetaResult-shaped payload: { results: [...], meta: {...} }.
 *  Plain array payloads lack both keys and fall through to the array branch.
 */
function isShapedResults(r: unknown): r is { results: unknown[]; meta?: unknown } {
	return typeof r === 'object' && r !== null && 'results' in r;
}

/** Merge server results with pending offline attempts.
 *  Payload shape is generalized: `results` may be a MetaResult-shaped object
 *  ({ results, meta }) or a plain attempts array.
 *  Server sessions win over pending ones with the same sessionId.
 *  Returned list is sorted by createdAt descending.
 */
export function mergeSessions(
	serverSessions: ResultsPageSession[],
	pending: QueueElement[]
): ResultsPageSession[] {
	const serverIds = new Set(serverSessions.map((s) => s.sessionId));
	const pendingSessions: ResultsPageSession[] = pending
		.filter((p) => !serverIds.has(p.payload.sessionId))
		.map((p) => ({
			sessionId: p.payload.sessionId,
			createdAt: new Date(p.enqueuedAt).toISOString(),
			attempts: isShapedResults(p.payload.results)
				? p.payload.results.results
				: p.payload.results,
			meta: isShapedResults(p.payload.results) ? p.payload.results.meta : undefined,
			pending: true
		}));
	const combined = [...serverSessions, ...pendingSessions];
	return combined.sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
	);
}

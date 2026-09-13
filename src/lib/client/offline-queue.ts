import { generate } from 'short-uuid';
import localforage from 'localforage';
import type { MetaResult as ExerciseMetaResult, ExerciseResults } from '$lib/exercises/types';
import type { MetaResult as TestMetaResult, RegularResults } from '$lib/tests/types';

const STORE_KEY = 'offline-attempt-queue';

export type QueueKind = 'test' | 'exercise';

export type OfflinePayload = {
	sessionId: string;
	results: ExerciseMetaResult | TestMetaResult | ExerciseResults | RegularResults;
};

export type QueueElement = {
	id: string;
	slug: string;
	enqueuedAt: number;
	payload: OfflinePayload;
	kind?: QueueKind;
};

export type FlushSummary = {
	flushed: number;
	remaining: number;
	skipped: number;
};

function isBrowser(): boolean {
	try {
		return typeof window !== 'undefined';
	} catch {
		return false;
	}
}

// Fail-soft by design: a read error must not break getPendingAttempts (empty
// queue is a safe default); callers of enqueueAttempt get their failure signal
// from the awaited writeQueue below instead.
async function readQueue(): Promise<QueueElement[]> {
	if (!isBrowser()) return [];
	try {
		const raw = await localforage.getItem<QueueElement[]>(STORE_KEY);
		return Array.isArray(raw) ? raw : [];
	} catch {
		return [];
	}
}

async function writeQueue(queue: QueueElement[]): Promise<void> {
	if (!isBrowser()) return;
	await localforage.setItem(STORE_KEY, queue);
}

export async function enqueueAttempt(
	slug: string,
	payload: OfflinePayload,
	kind: QueueKind = 'exercise'
): Promise<string> {
	if (!isBrowser()) {
		throw new Error('enqueueAttempt must be called in the browser');
	}

	const id = generate();
	const el: QueueElement = { id, slug, enqueuedAt: Date.now(), payload, kind };

	const queue = await readQueue();
	await writeQueue([...queue, el]);

	return id;
}

export async function getPendingAttempts(slug?: string, kind?: QueueKind): Promise<QueueElement[]> {
	const queue = await readQueue();
	return queue.filter((el) => {
		if (slug && el.slug !== slug) return false;
		if (kind && (el.kind ?? 'exercise') !== kind) return false;
		return true;
	});
}

export async function flushQueue(): Promise<FlushSummary> {
	const queue = await readQueue();
	let flushed = 0;
	let skipped = 0;
	const done = new Set<string>();

	for (const el of queue) {
		// Old queued elements have no kind — they were created by the
		// exercise flow, so 'exercise' is the backward-compatible default.
		const endpoint =
			(el.kind ?? 'exercise') === 'test'
				? `/tests/${el.slug}/playground`
				: `/exercises/${el.slug}/playground`;

		try {
			const response = await fetch(endpoint, {
				method: 'POST',
				body: JSON.stringify(el.payload),
				headers: { 'Content-Type': 'application/json' }
			});

			if (response.status === 409) {
				// Permanent ownership conflict: the attempt already belongs to
				// another session. Drop the element and keep flushing the rest.
				done.add(el.id);
				skipped++;
				continue;
			}

			if (!response.ok) {
				break;
			}

			const body = (await response.json()) as { sessionId?: string };
			if (body.sessionId !== el.payload.sessionId) {
				// Mismatch/break = malformed or foreign response — the element
				// must stay, do not "optimize" it into done.
				break;
			}

			done.add(el.id);
			flushed++;
		} catch {
			break;
		}
	}

	// Re-read and drop only confirmed ids: an element enqueued concurrently
	// during this flush survives (a plain slice would silently lose it).
	const current = await readQueue();
	const remainingEls = current.filter((el) => !done.has(el.id));
	await writeQueue(remainingEls);

	return { flushed, remaining: remainingEls.length, skipped };
}

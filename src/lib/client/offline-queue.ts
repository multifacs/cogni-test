import { generate } from 'short-uuid';
import localforage from 'localforage';
import type { MetaResult } from '$lib/exercises/types';

const STORE_KEY = 'offline-attempt-queue';

export type OfflinePayload = {
	sessionId: string;
	results: MetaResult;
};

export type QueueElement = {
	id: string;
	slug: string;
	enqueuedAt: number;
	payload: OfflinePayload;
};

export type FlushSummary = {
	flushed: number;
	remaining: number;
};

function isBrowser(): boolean {
	try {
		return typeof window !== 'undefined';
	} catch {
		return false;
	}
}

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

export function enqueueAttempt(slug: string, payload: OfflinePayload): string {
	if (!isBrowser()) {
		throw new Error('enqueueAttempt must be called in the browser');
	}

	const id = generate();
	const el: QueueElement = { id, slug, enqueuedAt: Date.now(), payload };

	// Fire-and-forget async write to keep the API synchronous
	readQueue()
		.then((queue) => writeQueue([...queue, el]))
		.catch(() => {});

	return id;
}

export async function getPendingAttempts(slug?: string): Promise<QueueElement[]> {
	const queue = await readQueue();
	if (!slug) return queue;
	return queue.filter((el) => el.slug === slug);
}

export async function flushQueue(): Promise<FlushSummary> {
	const queue = await readQueue();
	let flushed = 0;

	for (const el of queue) {
		try {
			const response = await fetch(`/exercises/${el.slug}/playground`, {
				method: 'POST',
				body: JSON.stringify(el.payload),
				headers: { 'Content-Type': 'application/json' }
			});

			if (!response.ok) {
				break;
			}

			const body = (await response.json()) as { sessionId?: string };
			if (body.sessionId !== el.payload.sessionId) {
				break;
			}

			flushed++;
		} catch {
			break;
		}
	}

	const remaining = queue.slice(flushed);
	await writeQueue(remaining);

	return { flushed, remaining: remaining.length };
}

import { browser } from '$app/environment';
import { getStreamingQueue, type TestSessionCounts } from '$lib/shared/testQueue';
import type { TestData } from '$lib/tests';

export type StreamingQueueItem = { name: string; path: string };

export const streaming = $state({
	queue: [] as StreamingQueueItem[],
	pendingStart: false
});

/**
 * Снапшот очереди на старте: правила getStreamingQueue.
 * Стирает прошлую очередь.
 */
export function startStreaming(tests: readonly TestData[], counts: TestSessionCounts): void {
	if (!browser) return;
	streaming.queue = getStreamingQueue(tests, counts).map(({ name, path }) => ({ name, path }));
	streaming.pendingStart = false;
}

/**
 * home-точка входа: у home нет counts — материализует очередь /tests при заходе.
 */
export function requestStreamingStart(): void {
	if (!browser) return;
	streaming.pendingStart = true;
}

/**
 * Снять тест с очереди (idempotent, нет такого name — no-op).
 */
export function completeTest(name: string): void {
	if (!browser) return;
	streaming.queue = streaming.queue.filter((item) => item.name !== name);
}

/**
 * Стрим активен = очередь непуста.
 * Чистый read без SSR-guard: на сервере очередь пуста → false.
 */
export function isStreamingActive(): boolean {
	return streaming.queue.length > 0;
}

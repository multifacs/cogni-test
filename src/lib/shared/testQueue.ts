import type { TestData } from '$lib/tests';

export type TestSessionCounts = Record<string, number>;

/**
 * Формирует очередь потокового прохождения тестов.
 * Порядок реестра сохраняется.
 *
 * Правила:
 * 1. Оставлены только видимые тесты (`!hidden`).
 * 2. Возвращены те visible тесты, у которых count === 0/undefined.
 * 3. Если таких нет — возвращены ВСЕ visible тесты (режим повтора серии).
 * 4. Пустой входной список → `[]`.
 */
export function getStreamingQueue(
	tests: readonly TestData[],
	testSessionCounts: TestSessionCounts = {}
): TestData[] {
	const visible = tests.filter((t) => !t.hidden);
	if (!visible.length) return [];

	const pending = visible.filter((t) => {
		const count = testSessionCounts[t.name];
		return count == null || count < 1;
	});

	return pending.length > 0 ? pending : [...visible];
}

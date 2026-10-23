/**
 * Minimal structural type compatible with `URL`, `ReadonlyURL` from `$app/state`
 * (whose `searchParams` is a `URLSearchParams`), and anything exposing a
 * `get(name)` query accessor. Keeps the function pure and testable.
 */
export interface AiFlowUrlLike {
	pathname: string;
	searchParams: { get(name: string): string | null };
}

/**
 * True when the URL belongs to an AI-flow surface: any `/ai` route
 * (`/ai`, `/ai/...`) or a page entered from the AI flow (`?from=ai`).
 */
export function isAiFlowUrl(url: AiFlowUrlLike): boolean {
	return (
		url.pathname === '/ai' ||
		url.pathname.startsWith('/ai/') ||
		url.searchParams.get('from') === 'ai'
	);
}

/**
 * Propagates the `from=ai` marker through outgoing navigation: appends
 * `from=ai` to the target path when the current URL was entered from the
 * AI flow, otherwise returns the path unchanged (no-op).
 *
 * Keeps the marker alive across the whole tests chain so the red
 * «← Меню ИИ-влияние» button survives the return to /tests.
 *
 * @example
 * // current URL has ?from=ai
 * withFromAi('/tests', page.url); // '/tests?from=ai'
 * withFromAi('/x?gtoSessionId=1', page.url); // '/x?gtoSessionId=1&from=ai'
 * @example
 * // current URL has no from=ai (or from=other)
 * withFromAi('/tests', page.url); // '/tests'
 */
export function withFromAi<T extends string>(path: T, url: AiFlowUrlLike): T {
	if (url.searchParams.get('from') !== 'ai') return path;
	return (path + (path.includes('?') ? '&' : '?') + 'from=ai') as T;
}

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

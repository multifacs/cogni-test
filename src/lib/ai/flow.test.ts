import { describe, expect, it } from 'vitest';
import { isAiFlowUrl } from './flow';

function url(pathname: string, query = ''): { pathname: string; searchParams: URLSearchParams } {
	return { pathname, searchParams: new URLSearchParams(query) };
}

describe('isAiFlowUrl', () => {
	it.each(['/ai', '/ai/ai-life', '/ai/classification', '/ai/classification/retelling'])(
		'returns true for %s',
		(pathname) => {
			expect(isAiFlowUrl(url(pathname))).toBe(true);
		}
	);

	it.each(['/home', '/tests', '/aiX', '/profile'])('returns false for %s', (pathname) => {
		expect(isAiFlowUrl(url(pathname))).toBe(false);
	});

	it.each([
		['/questionary', 'from=ai'],
		['/tests', 'from=ai']
	])('returns true for %s?%s', (pathname, query) => {
		expect(isAiFlowUrl(url(pathname, query))).toBe(true);
	});

	it('returns false for from=other', () => {
		expect(isAiFlowUrl(url('/tests', 'from=other'))).toBe(false);
	});

	it('works with a plain URL object', () => {
		expect(isAiFlowUrl(new URL('https://example.com/ai/classification?x=1'))).toBe(true);
		expect(isAiFlowUrl(new URL('https://example.com/tests?from=ai'))).toBe(true);
		expect(isAiFlowUrl(new URL('https://example.com/home'))).toBe(false);
	});
});

import { describe, expect, it } from 'vitest';
import { isAiFlowUrl, withFromAi } from './flow';

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

describe('withFromAi', () => {
	it('без from в текущем URL → path без изменений', () => {
		expect(withFromAi('/tests', url('/tests'))).toBe('/tests');
	});

	it('from=ai + path без query → добавляет ?from=ai', () => {
		expect(withFromAi('/tests', url('/tests', 'from=ai'))).toBe('/tests?from=ai');
	});

	it('from=ai + path с query → добавляет &from=ai', () => {
		expect(withFromAi('/x?gtoSessionId=1', url('/tests', 'from=ai'))).toBe(
			'/x?gtoSessionId=1&from=ai'
		);
	});

	it('from=other → path без изменений', () => {
		expect(withFromAi('/tests', url('/tests', 'from=other'))).toBe('/tests');
	});
});

import { describe, expect, it } from 'vitest';
import cookie, { parse, serialize } from './cookie.mjs';

describe('cookie shim', () => {
	it('exposes the cookie@0.x parse/serialize API', () => {
		expect(typeof parse).toBe('function');
		expect(typeof serialize).toBe('function');
		expect(typeof cookie.parse).toBe('function');
		expect(typeof cookie.serialize).toBe('function');
	});

	it('round-trips a cookie value', () => {
		expect(parse(serialize('name', 'value'))).toEqual({ name: 'value' });
	});

	it('parse() parses a Cookie header, not a Set-Cookie string', () => {
		// cookie@0.6.x parse() expects a Cookie header (name=value pairs).
		// serialize(..., { path: '/' }) produces a Set-Cookie string
		// ("name=value; Path=/"), so the attribute leaks in as a pseudo-pair.
		// This pins the 0.x semantics the shim must deliver.
		const parsed = parse(serialize('name', 'value', { path: '/' }));
		expect(parsed.name).toBe('value');
		expect(parsed.Path).toBe('/');
	});
});

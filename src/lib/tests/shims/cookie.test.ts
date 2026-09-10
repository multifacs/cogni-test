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
		const serialized = serialize('name', 'value', { path: '/' });
		expect(parse(serialized)).toEqual({ name: 'value' });
	});
});

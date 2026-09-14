import { describe, expect, it } from 'vitest';
import { formatUserLocalDate } from './common';

describe('formatUserLocalDate', () => {
	it('treats zone-less SQLite timestamps as UTC (TZ-agnostic invariant)', () => {
		expect(formatUserLocalDate('2026-09-14 10:30:00')).toBe(
			formatUserLocalDate('2026-09-14T10:30:00Z')
		);
	});

	it('parses ISO strings with offset as the same instant as UTC', () => {
		expect(formatUserLocalDate('2026-09-14T13:30:00+03:00')).toBe(
			formatUserLocalDate('2026-09-14T10:30:00Z')
		);
	});

	it('outputs the dd.MM.yyyy HH:mm local format', () => {
		expect(formatUserLocalDate('2026-09-14T10:30:00.000Z')).toMatch(
			/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/
		);
	});

	it('throws on invalid date strings', () => {
		expect(() => formatUserLocalDate('not a date')).toThrow();
	});
});

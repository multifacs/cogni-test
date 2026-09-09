import { describe, it, expect } from 'vitest';
import {
	GTO_WORDS_COOLDOWN_MS,
	computeRemainingMs,
	parseLegacyTimestampToIso
} from './words-cooldown';

describe('GTO_WORDS_COOLDOWN_MS', () => {
	it('is exactly 5 minutes', () => {
		expect(GTO_WORDS_COOLDOWN_MS).toBe(5 * 60 * 1000);
	});
});

describe('computeRemainingMs', () => {
	it('returns 0 when lastResultAt is null', () => {
		expect(computeRemainingMs(null, Date.now())).toBe(0);
	});

	it('returns positive remainder for a fresh result', () => {
		const now = Date.parse('2026-09-09T10:02:00Z');
		const lastResultAt = '2026-09-09T10:00:00Z';
		expect(computeRemainingMs(lastResultAt, now)).toBe(3 * 60 * 1000);
	});

	it('returns 0 when the cooldown has expired', () => {
		const now = Date.parse('2026-09-09T10:30:00Z');
		const lastResultAt = '2026-09-09T10:00:00Z';
		expect(computeRemainingMs(lastResultAt, now)).toBe(0);
	});

	it('returns 0 at the exact boundary (now == lastResultAt + cooldown)', () => {
		const lastResultAt = '2026-09-09T10:00:00Z';
		const now = Date.parse(lastResultAt) + GTO_WORDS_COOLDOWN_MS;
		expect(computeRemainingMs(lastResultAt, now)).toBe(0);
	});

	it('clips negative remainder to 0 (far-past timestamp)', () => {
		const lastResultAt = '2026-09-09T09:00:00Z';
		const now = Date.parse('2026-09-09T10:00:00Z');
		expect(computeRemainingMs(lastResultAt, now)).toBe(0);
	});
});

describe('parseLegacyTimestampToIso', () => {
	it('converts a CURRENT_TIMESTAMP-format string (UTC) to ISO', () => {
		const iso = parseLegacyTimestampToIso('2026-09-09 10:00:00');
		expect(iso).not.toBeNull();
		expect(Date.parse(iso as string)).toBe(Date.parse('2026-09-09T10:00:00Z'));
	});

	it('keeps an already-ISO input as the same instant', () => {
		const raw = '2026-09-09T10:00:00.000Z';
		const iso = parseLegacyTimestampToIso(raw);
		expect(iso).not.toBeNull();
		expect(Date.parse(iso as string)).toBe(Date.parse(raw));
	});

	it('returns null for an empty string', () => {
		expect(parseLegacyTimestampToIso('')).toBeNull();
	});

	it('returns null for garbage input', () => {
		expect(parseLegacyTimestampToIso('not-a-timestamp')).toBeNull();
	});

	it('returns null for null input', () => {
		expect(parseLegacyTimestampToIso(null)).toBeNull();
	});
});

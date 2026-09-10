/**
 * Shared (server + client) helpers for the GTO words input cooldown.
 *
 * After finishing tests, participants must wait before entering their
 * recalled words, so long-term memory is actually tested.
 */

export const GTO_WORDS_COOLDOWN_MS = 5 * 60 * 1000;

/**
 * How much of the cooldown is still left, in milliseconds.
 * Returns 0 when there is nothing to wait (null lastResultAt, expired, or clock skew).
 */
export function computeRemainingMs(lastResultAt: string | null, nowMs: number): number {
	if (lastResultAt === null) return 0;
	const elapsed = nowMs - Date.parse(lastResultAt);
	return Math.max(0, GTO_WORDS_COOLDOWN_MS - elapsed);
}

/**
 * Parses a raw `createdAt` value from the shared `session` table into an ISO string.
 *
 * SQLite CURRENT_TIMESTAMP produces "YYYY-MM-DD HH:MM:SS" in UTC — a format
 * `Date.parse` may treat as local time in some engines, so it is normalized here.
 * Already-ISO input passes through unchanged. Anything else fails soft to null
 * (→ no cooldown shown) instead of throwing on the page.
 */
export function parseLegacyTimestampToIso(raw: string | null): string | null {
	if (!raw) return null;

	// "YYYY-MM-DD HH:MM:SS" (UTC) → "YYYY-MM-DDTHH:MM:SSZ"
	const legacy = raw.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/);
	if (legacy) {
		return `${legacy[1]}T${legacy[2]}Z`;
	}

	const parsed = Date.parse(raw);
	return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

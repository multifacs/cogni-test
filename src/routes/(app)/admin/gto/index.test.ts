import { describe, expect, it } from 'vitest';
import { formatDate } from './index';

describe('admin/gto formatDate', () => {
	it('возвращает прочерк для null', () => {
		expect(formatDate(null)).toBe('—');
	});

	it('парсит zone-less SQLite-таймстамп как UTC (TZ-агностично)', () => {
		// '2026-09-01 10:00:00' без маркера зоны должен трактоваться как UTC —
		// то есть совпадать с явным '2026-09-01T10:00:00Z' независимо от TZ раннера
		expect(formatDate('2026-09-01 10:00:00')).toBe(formatDate('2026-09-01T10:00:00Z'));
	});

	it('выдаёт формат dd.MM.yyyy HH:mm', () => {
		expect(formatDate('2026-09-01 10:00:00')).toMatch(/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/);
	});
});

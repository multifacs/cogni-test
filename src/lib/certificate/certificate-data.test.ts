import { describe, expect, test } from 'vitest';
import { buildCertificateData, type CertificateInput } from './certificate-data';

function makeInput(overrides: Partial<CertificateInput> = {}): CertificateInput {
	return {
		participant: { firstname: 'Иван', lastname: 'Иванов' },
		session: { name: 'Сессия №1', createdAt: '2026-09-09' },
		certNumber: '0095',
		...overrides
	};
}

describe('buildCertificateData — имя', () => {
	test('официальный стиль «ФАМИЛИЯ ИМЯ» (uppercase)', () => {
		const data = buildCertificateData(makeInput());
		expect(data.name).toBe('ИВАНОВ ИВАН');
	});

	test('обрезает пробелы вокруг частей имени', () => {
		const data = buildCertificateData(
			makeInput({ participant: { firstname: ' Иван ', lastname: ' Иванов ' } })
		);
		expect(data.name).toBe('ИВАНОВ ИВАН');
	});

	test('пустая фамилия → только имя', () => {
		const data = buildCertificateData(
			makeInput({ participant: { firstname: 'Иван', lastname: '' } })
		);
		expect(data.name).toBe('ИВАН');
	});

	test('пустые имя и фамилия → «—»', () => {
		const data = buildCertificateData(
			makeInput({ participant: { firstname: '  ', lastname: '' } })
		);
		expect(data.name).toBe('—');
	});
});

describe('buildCertificateData — структура', () => {
	test('все поля присутствуют', () => {
		const data = buildCertificateData(makeInput());
		expect(data.certNumber).toBe('0095');
		expect(data.badge).toBe('gold');
		expect(data.eventName).toBe('Сессия №1');
		expect(data.councilLines.length).toBeGreaterThan(0);
		expect(data.date).toBe('9 сентября 2026 г.');
	});

	test('чистая функция: одинаковый вход → одинаковый результат', () => {
		const first = buildCertificateData(makeInput());
		const second = buildCertificateData(makeInput());
		expect(first).toEqual(second);
	});
});

describe('buildCertificateData — дата', () => {
	test('ISO-дата → «9 сентября 2026 г.»', () => {
		const data = buildCertificateData(
			makeInput({ session: { name: 'Сессия', createdAt: '2026-09-09' } })
		);
		expect(data.date).toBe('9 сентября 2026 г.');
	});

	test('SQLite CURRENT_TIMESTAMP интерпретируется как UTC', () => {
		const data = buildCertificateData(
			makeInput({ session: { name: 'Сессия', createdAt: '2026-09-09 23:30:00' } })
		);
		expect(data.date).toBe('9 сентября 2026 г.');
	});

	test('принимает Date как UTC-момент', () => {
		const data = buildCertificateData(
			makeInput({ session: { name: 'Сессия', createdAt: new Date(Date.UTC(2026, 8, 9)) } })
		);
		expect(data.date).toBe('9 сентября 2026 г.');
	});

	test('некорректная дата → пустая строка', () => {
		const data = buildCertificateData(
			makeInput({ session: { name: 'Сессия', createdAt: 'not-a-date' } })
		);
		expect(data.date).toBe('');
	});
});

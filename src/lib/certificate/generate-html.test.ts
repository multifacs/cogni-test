import { describe, expect, test } from 'vitest';
import { buildCertificateData, type CertificateInput } from './certificate-data';
import { buildCertificateHtml } from './generate-html';

function makeInput(overrides: Partial<CertificateInput> = {}): CertificateInput {
	return {
		participant: { firstname: 'Иван', lastname: 'Иванов' },
		session: { name: 'Сессия №1', createdAt: '2026-09-09' },
		certNumber: '0095',
		...overrides
	};
}

describe('buildCertificateHtml', () => {
	test('содержит ключевые элементы бланка по INSTRUCTION.md', () => {
		const html = buildCertificateHtml(buildCertificateData(makeInput()), 'landscape');
		expect(html).toContain('<!doctype html>');
		expect(html).toContain('Сертификат №0095');
		expect(html).toContain('ИВАНОВ ИВАН');
		expect(html).toContain('Награждается');
		expect(html).toContain('КОРСОВЕТ');
		expect(html).toContain('КООРДИНАЦИОННЫЙ СОВЕТ ПО ДЕЛАМ МОЛОДЁЖИ');
	});

	test('портретная и альбомная ориентации различаются', () => {
		const data = buildCertificateData(makeInput());
		const portrait = buildCertificateHtml(data, 'portrait');
		const landscape = buildCertificateHtml(data, 'landscape');
		expect(portrait).toContain('A4 portrait');
		expect(landscape).toContain('A4 landscape');
		expect(portrait).toContain('width: 210mm');
		expect(landscape).toContain('width: 297mm');
	});

	test('экранирует HTML-спецсимволы из данных', () => {
		const data = buildCertificateData(
			makeInput({ participant: { firstname: 'Иван & Ко <script>', lastname: 'Иванов' } })
		);
		const html = buildCertificateHtml(data, 'portrait');
		expect(html).toContain('ИВАНОВ ИВАН &amp; КО &lt;script&gt;');
		expect(html).not.toContain('<script>');
	});

	test('самодостаточный документ: нет внешних зависимостей', () => {
		const html = buildCertificateHtml(buildCertificateData(makeInput()), 'landscape');
		expect(html).not.toMatch(/<script\b/i);
		expect(html).not.toMatch(/<link\b/i);
		expect(html).not.toMatch(/url\(/i);
	});
});

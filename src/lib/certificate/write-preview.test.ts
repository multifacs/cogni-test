import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { buildCertificateData, type CertificateMetricsInput } from './certificate-data';
import { buildCertificateHtml } from './generate-html';

const METRICS: CertificateMetricsInput = {
	stroop: {
		stage1: { meanTime: 0.8, stdDevTime: 0.1, accuracy: 0.9 },
		stage2: { meanTime: 1.0, stdDevTime: 0.2, accuracy: 0.85 },
		stage3: { meanTime: 1.4, stdDevTime: 0.3, accuracy: 0.65 }
	},
	math: { meanTime: 1.234, stdDevTime: 0.4, accuracy: 0.9 },
	munsterberg: { meanTime: 2.0, stdDevTime: 0.5, fractionGuessed: 0.6, totalWordsHidden: 20 },
	campimetry: {
		stage1: { meanTime: 1.1, stdDevTime: 0.2, meanDelta: 0.1 },
		stage2: { meanTime: 1.5, stdDevTime: 0.3, meanDelta: -0.2 }
	},
	memory: { meanTime: 2.05, stdDevTime: 0.3, accuracy: 0.75 },
	swallow: { meanTime: 3.006, stdDevTime: 0.5, accuracy: 0.8 },
	raven: { totalQuestions: 18, correctCount: 12, accuracy: 0.6667, averageResponseTimeMs: 15000 }
};

const OUT_DIR = join(process.cwd(), '..', '..', 'tmp-cert-preview');

test('записывает превью-файлы для визуальной проверки', () => {
	const data = buildCertificateData({
		participant: { firstname: 'Иван', lastname: 'Иванов' },
		session: { name: 'Сессия №1 — День города', createdAt: '2026-09-09' },
		wordScore: 3,
		submittedWords: ['якорь', 'весло', 'луна'],
		metrics: METRICS
	});
	mkdirSync(OUT_DIR, { recursive: true });
	const portrait = buildCertificateHtml(data, 'portrait');
	const landscape = buildCertificateHtml(data, 'landscape');
	writeFileSync(join(OUT_DIR, 'preview-portrait.html'), portrait);
	writeFileSync(join(OUT_DIR, 'preview-landscape.html'), landscape);
	expect(portrait.length).toBeGreaterThan(1000);
	expect(landscape.length).toBeGreaterThan(1000);
});

import { describe, expect, test } from 'vitest';
import {
	buildCertificateData,
	type CertificateInput,
	type CertificateMetricsInput
} from './certificate-data';
import { buildCertificateSvg } from './generate';

const FULL_METRICS: CertificateMetricsInput = {
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

function makeInput(overrides: Partial<CertificateInput> = {}): CertificateInput {
	return {
		participant: { firstname: 'Иван', lastname: 'Иванов' },
		session: { name: 'Сессия №1', createdAt: '2026-09-09' },
		wordScore: 3,
		submittedWords: ['якорь', 'весло', 'луна', 'роза', 'ветер'],
		metrics: {},
		...overrides
	};
}

describe('buildCertificateData — имя', () => {
	test('официальный стиль «Фамилия Имя»', () => {
		const data = buildCertificateData(makeInput());
		expect(data.name).toBe('Иванов Иван');
	});

	test('обрезает пробелы вокруг частей имени', () => {
		const data = buildCertificateData(
			makeInput({ participant: { firstname: ' Иван ', lastname: ' Иванов ' } })
		);
		expect(data.name).toBe('Иванов Иван');
	});

	test('пустая фамилия → только имя', () => {
		const data = buildCertificateData(
			makeInput({ participant: { firstname: 'Иван', lastname: '' } })
		);
		expect(data.name).toBe('Иван');
	});

	test('пустые имя и фамилия → «—»', () => {
		const data = buildCertificateData(
			makeInput({ participant: { firstname: '  ', lastname: '' } })
		);
		expect(data.name).toBe('—');
	});
});

describe('buildCertificateData — дата', () => {
	test('ISO-дата → «9 сентября 2026 г.»', () => {
		const data = buildCertificateData(
			makeInput({ session: { name: 'Сессия', createdAt: '2026-09-09' } })
		);
		expect(data.dateLabel).toBe('9 сентября 2026 г.');
	});

	test('SQLite CURRENT_TIMESTAMP интерпретируется как UTC', () => {
		const data = buildCertificateData(
			makeInput({ session: { name: 'Сессия', createdAt: '2026-09-09 23:30:00' } })
		);
		expect(data.dateLabel).toBe('9 сентября 2026 г.');
	});

	test('принимает Date как UTC-момент', () => {
		const data = buildCertificateData(
			makeInput({ session: { name: 'Сессия', createdAt: new Date(Date.UTC(2026, 8, 9)) } })
		);
		expect(data.dateLabel).toBe('9 сентября 2026 г.');
	});

	test('некорректная дата → «—»', () => {
		const data = buildCertificateData(
			makeInput({ session: { name: 'Сессия', createdAt: 'not-a-date' } })
		);
		expect(data.dateLabel).toBe('—');
	});
});

describe('buildCertificateData — последовательность слов', () => {
	test('0 → «0 из 5» (ноль — это результат, а не пропуск)', () => {
		const data = buildCertificateData(makeInput({ wordScore: 0 }));
		expect(data.wordsLabel).toBe('0 из 5');
	});

	test('5 → «5 из 5»', () => {
		const data = buildCertificateData(makeInput({ wordScore: 5 }));
		expect(data.wordsLabel).toBe('5 из 5');
	});

	test('null + отправленные слова → «Частично пройдено»', () => {
		const data = buildCertificateData(
			makeInput({ wordScore: null, submittedWords: ['якорь'] })
		);
		expect(data.wordsLabel).toBe('Частично пройдено');
	});

	test('null + пустой массив → «Не пройдено»', () => {
		const data = buildCertificateData(makeInput({ wordScore: null, submittedWords: [] }));
		expect(data.wordsLabel).toBe('Не пройдено');
	});

	test('null + null → «Не пройдено»', () => {
		const data = buildCertificateData(makeInput({ wordScore: null, submittedWords: null }));
		expect(data.wordsLabel).toBe('Не пройдено');
	});
});

describe('buildCertificateData — сводка тестов', () => {
	test('метки тестов в порядке страницы результатов', () => {
		const data = buildCertificateData(makeInput({ metrics: FULL_METRICS }));
		expect(data.testSummary.map((entry) => entry.label)).toEqual([
			'Струп',
			'Арифметика',
			'Мюнстерберг',
			'Кампиметрия',
			'Память',
			'Ласточка',
			'Матрицы Равена'
		]);
	});

	test('метрики не переданы → «—» во всех строках', () => {
		const data = buildCertificateData(makeInput({ metrics: undefined }));
		expect(data.testSummary).toHaveLength(7);
		expect(data.testSummary.every((entry) => entry.value === '—')).toBe(true);
	});

	test('полные метрики → компактные значения', () => {
		const data = buildCertificateData(makeInput({ metrics: FULL_METRICS }));
		const byLabel = Object.fromEntries(data.testSummary.map((e) => [e.label, e.value]));
		expect(byLabel['Струп']).toBe('80.0%');
		expect(byLabel['Арифметика']).toBe('1.23с · 90.0%');
		expect(byLabel['Мюнстерберг']).toBe('60.0% (20 слов)');
		expect(byLabel['Кампиметрия']).toBe('эт.1 1.10с · эт.2 1.50с');
		expect(byLabel['Память']).toBe('2.05с · 75.0%');
		expect(byLabel['Ласточка']).toBe('3.01с · 80.0%');
		expect(byLabel['Матрицы Равена']).toBe('12/18 · 66.7%');
	});

	test('тест без попыток (meanTime null) → «—»', () => {
		const data = buildCertificateData(
			makeInput({ metrics: { math: { meanTime: null, stdDevTime: null, accuracy: 0 } } })
		);
		expect(data.testSummary.find((e) => e.label === 'Арифметика')?.value).toBe('—');
	});

	test('кампиметрия: null-этап → «—» на своей позиции', () => {
		const data = buildCertificateData(
			makeInput({
				metrics: {
					campimetry: {
						stage1: { meanTime: null, stdDevTime: null, meanDelta: null },
						stage2: { meanTime: 1.5, stdDevTime: 0.2, meanDelta: 0 }
					}
				}
			})
		);
		expect(data.testSummary.find((e) => e.label === 'Кампиметрия')?.value).toBe(
			'эт.1 — · эт.2 1.50с'
		);
	});

	test('мюнстерберг без скрытых слов → «—»', () => {
		const data = buildCertificateData(
			makeInput({
				metrics: {
					munsterberg: {
						meanTime: null,
						stdDevTime: null,
						fractionGuessed: 0,
						totalWordsHidden: 0
					}
				}
			})
		);
		expect(data.testSummary.find((e) => e.label === 'Мюнстерберг')?.value).toBe('—');
	});

	test('матрицы Равена без вопросов → «—»', () => {
		const data = buildCertificateData(
			makeInput({
				metrics: {
					raven: {
						totalQuestions: 0,
						correctCount: 0,
						accuracy: 0,
						averageResponseTimeMs: 0
					}
				}
			})
		);
		expect(data.testSummary.find((e) => e.label === 'Матрицы Равена')?.value).toBe('—');
	});

	test('струп без данных этапов → «—»', () => {
		const data = buildCertificateData(makeInput({ metrics: { stroop: {} } }));
		expect(data.testSummary.find((e) => e.label === 'Струп')?.value).toBe('—');
	});
});

describe('buildCertificateData — прочее', () => {
	test('фиксированные заголовки и название сессии', () => {
		const data = buildCertificateData(makeInput());
		expect(data.headline).toBe('СЕРТИФИКАТ');
		expect(data.awardedTo).toBe('награждается');
		expect(data.sessionName).toBe('Сессия №1');
	});

	test('пустое название сессии → «—»', () => {
		const data = buildCertificateData(
			makeInput({ session: { name: '  ', createdAt: '2026-09-09' } })
		);
		expect(data.sessionName).toBe('—');
	});

	test('чистая функция: одинаковый вход → одинаково глубокий результат', () => {
		const first = buildCertificateData(makeInput({ metrics: FULL_METRICS }));
		const second = buildCertificateData(makeInput({ metrics: FULL_METRICS }));
		expect(first).toEqual(second);
	});
});

describe('buildCertificateSvg', () => {
	test('A4 landscape в px: соотношение сторон 297/210 при ширине ≈1122.5', () => {
		const svg = buildCertificateSvg(buildCertificateData(makeInput()));
		const match = svg.match(/^<svg[^>]*width="([\d.]+)"[^>]*height="([\d.]+)"/);
		expect(match).not.toBeNull();
		const [width, height] = [Number(match![1]), Number(match![2])];
		expect(width).toBeCloseTo(297 * (96 / 25.4), 1);
		expect(height).toBeCloseTo(210 * (96 / 25.4), 1);
		expect(width / height).toBeCloseTo(297 / 210, 5);
	});

	test('содержит ключевые элементы классического бланка', () => {
		const svg = buildCertificateSvg(buildCertificateData(makeInput()));
		expect(svg).toContain('СЕРТИФИКАТ');
		expect(svg).toContain('Иванов Иван');
		expect(svg).toContain('награждается');
		expect(svg).toContain('печать');
		expect(svg).toContain('подпись');
	});

	test('экранирует XML-спецсимволы из данных', () => {
		const data = buildCertificateData(
			makeInput({ participant: { firstname: 'Иван & Ко <script>', lastname: 'Иванов' } })
		);
		const svg = buildCertificateSvg(data);
		expect(svg).toContain('Иванов Иван &amp; Ко &lt;script&gt;');
		expect(svg).not.toContain('<script>');
	});

	test('работает с пустой сводкой (SSR-безопасный чистый модуль)', () => {
		const svg = buildCertificateSvg({
			headline: 'СЕРТИФИКАТ',
			awardedTo: 'награждается',
			name: 'Иванов Иван',
			sessionName: 'Сессия',
			dateLabel: '9 сентября 2026 г.',
			wordsLabel: '3 из 5',
			testSummary: []
		});
		expect(svg).toContain('СЕРТИФИКАТ');
		expect(svg).not.toContain('РЕЗУЛЬТАТЫ ТЕСТОВ');
	});
});

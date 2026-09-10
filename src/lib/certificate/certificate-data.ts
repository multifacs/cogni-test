/**
 * Чистые данные сертификата ГТО: без DOM, безопасно для SSR и серверных тестов.
 * Преобразует метрики участника в готовые строки для отрисовки SVG/PDF.
 */

export type CertificateMetricEntry = {
	label: string;
	value: string;
};

export type CertificateData = {
	/** «СЕРТИФИКАТ» */
	headline: string;
	/** «награждается» */
	awardedTo: string;
	/** Официальный стиль: «Иванов Иван» */
	name: string;
	sessionName: string;
	/** «9 сентября 2026 г.» */
	dateLabel: string;
	/** «3 из 5» | «Частично пройдено» | «Не пройдено» */
	wordsLabel: string;
	/** Компактная сводка: одна строка на тест */
	testSummary: CertificateMetricEntry[];
};

// ─── Входные типы (структурно совместимы с ParticipantMetrics из контроллера) ────

export type CertificateStroopStageInput = {
	meanTime?: number | null;
	stdDevTime?: number | null;
	accuracy?: number;
};

export type CertificateSimpleTestInput = {
	meanTime?: number | null;
	stdDevTime?: number | null;
	accuracy?: number;
};

export type CertificateMunsterbergInput = {
	meanTime?: number | null;
	stdDevTime?: number | null;
	fractionGuessed?: number;
	totalWordsHidden?: number;
};

export type CertificateCampimetryStageInput = {
	meanTime?: number | null;
	stdDevTime?: number | null;
	meanDelta?: number | null;
};

export type CertificateCampimetryInput = {
	stage1?: CertificateCampimetryStageInput | null;
	stage2?: CertificateCampimetryStageInput | null;
};

export type CertificateRavenInput = {
	totalQuestions?: number;
	correctCount?: number;
	accuracy?: number;
	averageResponseTimeMs?: number;
};

export type CertificateMetricsInput = {
	stroop?: {
		stage1?: CertificateStroopStageInput | null;
		stage2?: CertificateStroopStageInput | null;
		stage3?: CertificateStroopStageInput | null;
	} | null;
	math?: CertificateSimpleTestInput | null;
	munsterberg?: CertificateMunsterbergInput | null;
	campimetry?: CertificateCampimetryInput | null;
	memory?: CertificateSimpleTestInput | null;
	swallow?: CertificateSimpleTestInput | null;
	raven?: CertificateRavenInput | null;
};

export type CertificateInput = {
	participant: { firstname: string; lastname: string };
	session: { name: string; createdAt: string | Date };
	wordScore?: number | null;
	submittedWords?: string[] | null;
	metrics?: CertificateMetricsInput | null;
};

// ─── Форматирование ────────────────────────────────────────────────

const MISSING = '—';

function formatSeconds(value: number | null | undefined): string {
	if (value === null || value === undefined) return MISSING;
	return `${value.toFixed(2)}с`;
}

function formatPercent(value: number | null | undefined): string {
	if (value === null || value === undefined) return MISSING;
	return `${(value * 100).toFixed(1)}%`;
}

/**
 * Даты сессий хранятся в UTC (SQLite CURRENT_TIMESTAMP / ISO),
 * поэтому форматируем тоже в UTC — дата не «съезжает» на сутки.
 */
const SESSION_DATE_FORMAT = new Intl.DateTimeFormat('ru-RU', {
	day: 'numeric',
	month: 'long',
	year: 'numeric',
	timeZone: 'UTC'
});

const SQLITE_TIMESTAMP = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

function formatSessionDate(createdAt: string | Date): string {
	const instant =
		createdAt instanceof Date
			? createdAt
			: new Date(
					SQLITE_TIMESTAMP.test(createdAt) ? `${createdAt.replace(' ', 'T')}Z` : createdAt
				);
	if (Number.isNaN(instant.getTime())) return MISSING;
	return SESSION_DATE_FORMAT.format(instant);
}

function formatWordsLabel(
	wordScore: number | null | undefined,
	submittedWords: string[] | null | undefined
): string {
	if (wordScore !== null && wordScore !== undefined) return `${wordScore} из 5`;
	if (submittedWords && submittedWords.length > 0) return 'Частично пройдено';
	return 'Не пройдено';
}

// ─── Значения тестов: одна компактная строка на тест ───────────────

function stroopValue(stroop: CertificateMetricsInput['stroop']): string {
	const accuracies = [stroop?.stage1, stroop?.stage2, stroop?.stage3]
		.map((stage) => stage?.accuracy)
		.filter((accuracy): accuracy is number => typeof accuracy === 'number');
	if (accuracies.length === 0) return MISSING;
	const meanAccuracy = accuracies.reduce((sum, value) => sum + value, 0) / accuracies.length;
	return formatPercent(meanAccuracy);
}

function simpleTestValue(test: CertificateSimpleTestInput | null | undefined): string {
	// meanTime === null — тест не предпринимался (пустая выборка попыток)
	if (!test || test.meanTime === null || test.meanTime === undefined) return MISSING;
	return `${formatSeconds(test.meanTime)} · ${formatPercent(test.accuracy)}`;
}

function munsterbergValue(test: CertificateMunsterbergInput | null | undefined): string {
	if (!test || !test.totalWordsHidden) return MISSING;
	return `${formatPercent(test.fractionGuessed)} (${test.totalWordsHidden} слов)`;
}

function campimetryValue(test: CertificateCampimetryInput | null | undefined): string {
	const stage1 = formatSeconds(test?.stage1?.meanTime);
	const stage2 = formatSeconds(test?.stage2?.meanTime);
	if (stage1 === MISSING && stage2 === MISSING) return MISSING;
	return `эт.1 ${stage1} · эт.2 ${stage2}`;
}

function ravenValue(test: CertificateRavenInput | null | undefined): string {
	if (!test || !test.totalQuestions) return MISSING;
	return `${test.correctCount ?? 0}/${test.totalQuestions} · ${formatPercent(test.accuracy)}`;
}

// ─── Сборка ────────────────────────────────────────────────────────

export function buildCertificateData(input: CertificateInput): CertificateData {
	const name = [input.participant.lastname, input.participant.firstname]
		.map((part) => part.trim())
		.filter((part) => part.length > 0)
		.join(' ');

	const sessionName = input.session.name.trim();
	const metrics = input.metrics ?? {};

	const testSummary: CertificateMetricEntry[] = [
		{ label: 'Струп', value: stroopValue(metrics.stroop) },
		{ label: 'Арифметика', value: simpleTestValue(metrics.math) },
		{ label: 'Мюнстерберг', value: munsterbergValue(metrics.munsterberg) },
		{ label: 'Кампиметрия', value: campimetryValue(metrics.campimetry) },
		{ label: 'Память', value: simpleTestValue(metrics.memory) },
		{ label: 'Ласточка', value: simpleTestValue(metrics.swallow) },
		{ label: 'Матрицы Равена', value: ravenValue(metrics.raven) }
	];

	return {
		headline: 'СЕРТИФИКАТ',
		awardedTo: 'награждается',
		name: name.length > 0 ? name : MISSING,
		sessionName: sessionName.length > 0 ? sessionName : MISSING,
		dateLabel: formatSessionDate(input.session.createdAt),
		wordsLabel: formatWordsLabel(input.wordScore, input.submittedWords),
		testSummary
	};
}

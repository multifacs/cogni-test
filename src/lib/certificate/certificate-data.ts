/**
 * Чистые данные для HTML-сертификата ГТО-М.
 * Без DOM — безопасно для SSR и серверных тестов.
 */

export type Badge = 'gold' | 'silver' | 'bronze';

export type CertificateData = {
	/** Номер сертификата */
	certNumber: string;
	/** Имя участника, например "Иванов Иван" */
	name: string;
	/** Знак отличия: gold / silver / bronze */
	badge: Badge;
	/** Название мероприятия */
	eventName: string;
	/** Строки координационного совета */
	councilLines: string[];
	/** Дата выдачи */
	date: string;
};

export type CertificateInput = {
	participant: { firstname: string; lastname: string };
	session: { name: string; createdAt: string | Date };
	certNumber: string;
};

// ─── Форматирование ───────────────────────────────────────────────────

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
	if (Number.isNaN(instant.getTime())) return '';
	return SESSION_DATE_FORMAT.format(instant);
}

// ─── Default council lines ──────────────────────────────────────────────

const DEFAULT_COUNCIL_LINES: string[] = [
	'КООРДИНАЦИОННЫЙ СОВЕТ ПО ДЕЛАМ МОЛОДЁЖИ',
	'В НАУЧНОЙ И ОБРАЗОВАТЕЛЬНОЙ СФЕРАХ',
	'ПРИ СОВЕТЕ ПРИ ПРЕЗИДЕНТЕ РОССИЙСКОЙ ФЕДЕРАЦИИ',
	'ПО НАУКЕ И ОБРАЗОВАНИЮ',
	'МИНИСТЕРСТВО НАУКИ И ВЫСШЕГО ОБРАЗОВАНИЯ РОССИЙСКОЙ ФЕДЕРАЦИИ'
];

// ─── Badge computation stub ───────────────────────────────────────────
// TODO: заменить на реальную логику по нормативам ГТО-М (золото / серебро / бронза)
function computeBadge(): Badge {
	return 'gold';
}

// ─── Сборка ───────────────────────────────────────────────────────────

export function buildCertificateData(input: CertificateInput): CertificateData {
	const name = [input.participant.lastname, input.participant.firstname]
		.map((p) => p.trim())
		.filter((part) => part.length > 0)
		.join(' ')
		.toUpperCase();

	return {
		certNumber: input.certNumber,
		name: name.length > 0 ? name : '—',
		badge: computeBadge(),
		eventName: input.session.name.trim(),
		councilLines: DEFAULT_COUNCIL_LINES,
		date: formatSessionDate(input.session.createdAt)
	};
}

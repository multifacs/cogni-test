export const SURVEY_FIELD_LABELS: Record<string, string> = {
	birthCity: 'Город рождения',
	currentCityType: 'Тип населённого пункта',
	education: 'Образование',
	yearsNotQualified: 'Без квалификации (лет)',
	yearsQualifiedApplied: 'Прикладной труд (лет)',
	yearsQualifiedNonApplied: 'Неприкладной труд (лет)',
	yearsProfessional: 'Профессиональная работа (лет)',
	yearsHighResponsibility: 'Высокоответственная работа (лет)',
	currentOccupation: 'Основное занятие',
	jobPosition: 'Должность',
	weeklyReading: 'Чтение',
	weeklyHousework: 'Домашние обязанности',
	weeklyHobby: 'Хобби',
	weeklyTech: 'Технологии',
	monthlySocial: 'Социальные мероприятия',
	monthlyCulture: 'Культура',
	monthlyGardening: 'Садоводство',
	monthlyCaring: 'Забота о других',
	monthlyVolunteer: 'Волонтёрство',
	monthlyArtistic: 'Художественная деятельность',
	yearlyEvents: 'Мероприятия',
	yearlyTravel: 'Путешествия',
	yearlyBookReading: 'Чтение книг',
	height: 'Рост',
	weight: 'Вес',
	dominantHand: 'Ведущая рука',
	isAmbidextrous: 'Амбидекстр',
	chronicDiseases: 'Хронические заболевания',
	smoking: 'Курение',
	alcohol: 'Алкоголь',
	sports: 'Спорт',
	isGamer: 'Геймер',
	gtoId: 'ГТО-М ID',
	email: 'E-mail'
};

export function missingFieldLabels(fields: string[]): string {
	if (fields.length === 0) return 'Все поля заполнены';
	return fields.map((key) => SURVEY_FIELD_LABELS[key] ?? key).join(', ');
}

import type { InsertProfileSurvey } from "$lib/server/db/models/survey";

export type ChoiceOption = { label: string; value: string };

export type QuestionType =
	| { kind: 'input'; placeholder?: string }
	| { kind: 'range'; min: number; max: number }
	| { kind: 'choice'; options: ChoiceOption[] }
	| { kind: 'boolean' }
	| { kind: 'autocomplete' }
	| { kind: 'custom-choice'; options?: ChoiceOption[] };

export type Question = {
	key: keyof InsertProfileSurvey;
	label: string;
	type: QuestionType;
};

export type Flow = {
	id: string;
	title: string;
	emoji: string;
	description: string;
	questions: Question[];
};


const NEVER_SELDOM_OFTEN: ChoiceOption[] = [
	{ label: 'Никогда', value: 'never' },
	{ label: 'Изредка', value: 'seldom' },
	{ label: 'Регулярно', value: 'often' }
];


const basicFlow: Flow = {
	id: 'basic',
	title: 'Основное',
	emoji: '/icons/basic.svg',
	description: 'место проживания',
	questions: [
		{
			key: 'birthCity',
			label: 'Населенный пункт, в котором вы прожили большую часть жизни',
			type: { kind: 'autocomplete' }
		},
		{
			key: 'currentCityType',
			label: 'Текущее место проживания',
			type: {
				kind: 'choice',
				options: [
					{ label: 'Столичный город (Москва или Санкт-Петербург)', value: 'capital' },
					{ label: 'Областной центр', value: 'municipality' },
					{ label: 'Районный центр', value: 'city' },
					{ label: 'Малый город или поселок городского типа', value: 'town' },
					{ label: 'Деревня/село', value: 'village' }
				]
			}
		}
	]
};

const educationFlow: Flow = {
	id: 'education',
	title: 'Образование',
	emoji: '/icons/education.svg',
	description: 'Уровень образования и стаж по типам работы',
	questions: [
		{
			key: 'education',
			label: 'Какое у вас образование?',
			type: {
				kind: 'choice',
				options: [
					{ label: 'Без образования, начальное, неполное среднее', value: 'none' },
					{ label: 'Среднее общее', value: 'highschool' },
					{ label: 'Среднее специальное – ПТУ, СПТУ, колледж', value: 'associate' },
					{ label: 'Среднее техническое – техникум', value: 'vocational' },
					{ label: 'Незаконченное высшее – не менее 3 курсов вуза', value: 'undergrad' },
					{ label: 'Высшее – специалист, бакалавр, магистр', value: 'graduate' },
					{
						label: 'Высшее научное – аспирантура, кандидат или доктор наук',
						value: 'phd'
					}
				]
			}
		},
		{
			key: 'yearsNotQualified',
			label: 'Сколько лет вашей основной деятельностью была работа, не требующая особой квалификации (охранник, официант, садовник, уборщик и т.д.)?',
			type: { kind: 'range', min: 0, max: 50 }
		},
		{
			key: 'yearsQualifiedApplied',
			label: 'Сколько лет вашей основной деятельностью была работа, требующая квалифицированного прикладного труда (медсестра, повар, парикмахер, слесарь и т.д.)?',
			type: { kind: 'range', min: 0, max: 50 }
		},
		{
			key: 'yearsQualifiedNonApplied',
			label: 'Сколько лет вашей основной деятельностью была работа, требующая квалифицированного неприкладного труда (агент по недвижимости, менеджер по продажам, музыкант, руководитель небольшого коллектива)?',
			type: { kind: 'range', min: 0, max: 50 }
		},
		{
			key: 'yearsProfessional',
			label: 'Сколько лет вашей основной деятельностью была профессиональная работа (управляющий компанией, адвокат, врач, учитель и т.д.)?',
			type: { kind: 'range', min: 0, max: 50 }
		},
		{
			key: 'yearsHighResponsibility',
			label: 'Сколько лет вашей основной деятельностью была высокоответственная или интеллектуальная работа (директор крупной компании, ученый, профессор, судья, хирург)?',
			type: { kind: 'range', min: 0, max: 50 }
		}
	]
};

const activityFlow: Flow = {
	id: 'activity',
	title: 'Занятия',
	emoji: '/icons/activity.svg',
	description: 'Чем занимаетесь и как часто',
	questions: [
		{
			key: 'currentOccupation',
			label: 'Какой из предложенных ниже вариантов лучше всего описывает ваше основное занятие в настоящее время?',
			type: {
				kind: 'choice',
				options: [
					{
						label: 'Ученик средней школы, гимназии, ПТУ, профессионального училища, профессионального лицея, техникума, колледжа',
						value: 'student'
					},
					{ label: 'Студент дневного вуза', value: 'uni_student' },
					{ label: 'Работаю', value: 'employed' },
					{ label: 'Не работаю по состоянию здоровья, инвалид', value: 'disabled' },
					{
						label: 'Веду домашнее хозяйство, ухаживаю за другими членами семьи, воспитываю детей',
						value: 'homemaker'
					},
					{ label: 'Пенсионер', value: 'retiree' },
					{ label: 'Другое', value: 'other' }
				]
			}
		},
		{
			key: 'jobPosition',
			label: 'К какой категории можно отнести вашу должность на основном месте работы?',
			type: {
				kind: 'choice',
				options: [
					{ label: 'Бизнесмен, предприниматель', value: 'business_owner' },
					{ label: 'Руководитель высшего звена, управленец', value: 'executive' },
					{
						label: 'Руководитель среднего звена (мастер, бригадир, начальник отдела и др.)',
						value: 'middle_manager'
					},
					{ label: 'Военнослужащий', value: 'military' },
					{ label: 'Сотрудник органов внутренних дел', value: 'law_enforcement' },
					{ label: 'Учитель, воспитатель', value: 'teacher' },
					{
						label: 'Сотрудник государственного и муниципального управления',
						value: 'civil_servant'
					},
					{ label: 'Врач, работник здравоохранения', value: 'healthcare' },
					{
						label: 'Представитель творческой интеллигенции (актер, музыкант, художник и др.)',
						value: 'creative_professional'
					},
					{ label: 'Преподаватель вуза, научный работник', value: 'academic' },
					{
						label: 'Служащий, специалист предприятия, организации',
						value: 'office_employee'
					},
					{ label: 'Рабочий', value: 'worker' },
					{ label: 'Другое', value: 'other_profession' }
				]
			}
		},

		{
			key: 'weeklyReading',
			label: 'Чтение газет, журналов, книг',
			type: { kind: 'choice', options: NEVER_SELDOM_OFTEN }
		},
		{
			key: 'weeklyHousework',
			label: 'Домашние обязанности (приготовление пищи, стирка, покупка продуктов и т.д.)',
			type: { kind: 'choice', options: NEVER_SELDOM_OFTEN }
		},
		{
			key: 'weeklyHobby',
			label: 'Хобби (шахматы, танцы, вязание, коллекционирование и т.д.)',
			type: { kind: 'choice', options: NEVER_SELDOM_OFTEN }
		},
		{
			key: 'weeklyTech',
			label: 'Использование современных технологий (интернет, компьютер)',
			type: { kind: 'choice', options: NEVER_SELDOM_OFTEN }
		},

		{
			key: 'monthlySocial',
			label: 'Социальные мероприятия (клубы, ассоциации, собрания)',
			type: { kind: 'choice', options: NEVER_SELDOM_OFTEN }
		},
		{
			key: 'monthlyCulture',
			label: 'Кино, театр',
			type: { kind: 'choice', options: NEVER_SELDOM_OFTEN }
		},
		{
			key: 'monthlyGardening',
			label: 'Садоводство, рукоделие',
			type: { kind: 'choice', options: NEVER_SELDOM_OFTEN }
		},
		{
			key: 'monthlyCaring',
			label: 'Забота о ком-то (внуки, пожилые люди)',
			type: { kind: 'choice', options: NEVER_SELDOM_OFTEN }
		},
		{
			key: 'monthlyVolunteer',
			label: 'Волонтерская работа',
			type: { kind: 'choice', options: NEVER_SELDOM_OFTEN }
		},
		{
			key: 'monthlyArtistic',
			label: 'Художественная деятельность (пение, рисование, игра на музыкальных инструментах и т.д.)',
			type: { kind: 'choice', options: NEVER_SELDOM_OFTEN }
		},

		{
			key: 'yearlyEvents',
			label: 'Выставки, концерты, конференции',
			type: { kind: 'choice', options: NEVER_SELDOM_OFTEN }
		},
		{
			key: 'yearlyTravel',
			label: 'Путешествия на несколько дней',
			type: { kind: 'choice', options: NEVER_SELDOM_OFTEN }
		},
		{
			key: 'yearlyBookReading',
			label: 'Чтение книг',
			type: { kind: 'choice', options: NEVER_SELDOM_OFTEN }
		}
	]
};


const bodyFlow: Flow = {
	id: 'body',
	title: 'Тело',
	emoji: '/icons/body.svg',
	description: 'Физические параметры и привычки',
	questions: [
		{ key: 'height', label: 'Рост', type: { kind: 'range', min: 0, max: 250 } },
		{ key: 'weight', label: 'Вес', type: { kind: 'range', min: 0, max: 250 } },
		{
			key: 'dominantHand',
			label: 'Ведущая рука (какой рукой в основном пишете)',
			type: {
				kind: 'choice',
				options: [
					{ label: 'Правая', value: 'left' },
					{ label: 'Левая', value: 'right' }
				]
			}
		},
		{
			key: 'isAmbidextrous',
			label: 'Являетесь ли вы амбидекстром?',
			type: { kind: 'boolean' }
		},
		{
			key: 'chronicDiseases',
			label: 'Хронические заболевания',
			type: { kind: 'custom-choice' }
		},
		{
			key: 'smoking',
			label: 'Курение',
			type: {
				kind: 'choice',
				options: [
					{ label: 'Нет', value: 'no' },
					{ label: 'Да', value: 'yes' },
					{ label: 'Было', value: 'usedTo' }
				]
			}
		},
		{
			key: 'alcohol',
			label: 'Алкоголь',
			type: {
				kind: 'choice',
				options: [
					{ label: 'Нет', value: 'no' },
					{ label: 'Да (1+ в неделю)', value: 'yes' }
				]
			}
		},
		{
			key: 'sports',
			label: 'Какими видами спорта занимаетесь сейчас?',
			type: {
				kind: 'custom-choice',
				options: [
					{ label: 'Каждый день', value: 'everyday' },
					{ label: '5 раз в неделю', value: 'week5' },
					{ label: '3 раза в неделю', value: 'week3' },
					{ label: '1 раз в неделю', value: 'week1' },
					{ label: 'Раз в 2 недели', value: 'biweekly' },
					{ label: 'Раз в месяц', value: 'montly' }
				]
			}
		},
		{
			key: 'isGamer',
			label: 'Занимаетесь ли киберспортом или являетесь геймером?',
			type: { kind: 'boolean' }
		}
	]
};

export const flows: Flow[] = [basicFlow, educationFlow, activityFlow, bodyFlow];

export const fullFlow: Flow = {
	id: 'full',
	title: 'Пройти всю анкету',
	emoji: '/icons/full.svg',
	description: 'Ответить на все вопросы подряд',
	questions: flows.flatMap((f) => f.questions)
};

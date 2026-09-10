export type ArticleData = {
	slug: string;
	title: string;
	emoji: string;
	time: string; // время чтения, минуты
};

export const articles: ArticleData[] = [
	{
		slug: 'food',
		title: 'Питание и здоровье мозга: научный подход',
		emoji: '/materials/brain.svg',
		time: '5'
	},
	{
		slug: 'gymnastics',
		title: 'Гимнастика для шейного отдела',
		emoji: '/materials/heart.svg',
		time: '8'
	},
	{
		slug: 'hygiene',
		title: 'Цифровая гигиена: как сохранить здоровье в эпоху гаджетов',
		emoji: '/materials/tablet.svg',
		time: '5'
	},
	{
		slug: 'sleep',
		title: 'Сон: зачем он нужен и как его улучшить',
		emoji: '/materials/heart.svg',
		time: '5'
	},
	{
		slug: 'road-trip',
		title: 'Расшифруй аббревиатуру',
		emoji: '/materials/road-trip.svg',
		time: '2'
	},
	{
		slug: 'not-lost',
		title: 'Ориентация без навигатора',
		emoji: '/materials/not-lost.svg',
		time: '3'
	}
];

export const articleRegistry: Record<string, ArticleData> = Object.fromEntries(
	articles.map((a) => [a.slug, a])
);

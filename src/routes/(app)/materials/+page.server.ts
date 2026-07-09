export function load() {
	const articles = [
		{
			slug: 'food',
			title: 'Еда',
			emoji: '🍎'
		},
		{
			slug: 'gymnastics',
			title: 'Гимнастика',
			emoji: '🤸'
		},
		{
			slug: 'hygiene',
			title: 'Цифровая гигиена',
			emoji: '💻'
		},
		{
			slug: 'sleep',
			title: 'Сон',
			emoji: '😴'
		}
	];

	return {
		articles
	};
}

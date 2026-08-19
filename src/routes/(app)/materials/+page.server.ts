export function load() {
	const articles = [
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
		}
	];

	return {
		articles
	};
}

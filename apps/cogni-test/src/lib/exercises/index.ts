export type TestData = {
	name: string;
	title: string;
	path: string;
	img: string;
};

export const exercises: TestData[] = [
	{
		name: 'word-morphing',
		title: 'Тест на словосочетания',
		path: '/exercises/word-morphing/about',
		img: '/exercises/word-morphing.svg'
	},
	{
		name: 'campimetry',
		title: 'Расширенная кампиметрия',
		path: '/exercises/campimetry/about',
		img: '/tests/campimetry.svg'
	},
	{
		name: 'memory-match',
		title: 'Совпадения',
		path: '/exercises/memory-match/about',
		img: '/exercises/memory-match.svg'
	},
	{
		name: 'nback-stream',
		title: 'Определение повторов',
		path: '/exercises/nback-stream/about',
		img: '/exercises/n-back.svg'
	},
	{
		name: 'emoji',
		title: 'Тест на смену эмодзи',
		path: '/exercises/emoji/about',
		img: '/exercises/emoji.svg'
	},
	{
		name: 'attention',
		title: 'Тест на внимание',
		path: '/exercises/attention/about',
		img: '/exercises/attention.svg'
	},
	{
		name: 'pictures',
		title: 'Запоминание картинок',
		path: '/exercises/pictures/about',
		img: '/exercises/pictures.svg'
	},
	{
		name: 'numbers',
		title: 'Запоминание чисел',
		path: '/exercises/numbers/about',
		img: '/exercises/numbers.svg'
	},
	{
		name: 'flanker',
		title: 'Фланговый тест Эриксена',
		path: '/exercises/flanker/about',
		img: '/exercises/flanker.svg'
	},
	{
		name: 'letters',
		title: 'Буквенный охват',
		path: '/exercises/letters/about',
		img: '/exercises/letters.svg'
	},
	{
		name: 'road-trip',
		title: 'По дороге на работу',
		path: '/exercises/road-trip/about',
		img: '/exercises/road-trip.svg'
	},
	{
		name: 'not-lost',
		title: 'По дороге на работу',
		path: '/exercises/not-lost/about',
		img: '/exercises/not-lost.svg'
	}
];

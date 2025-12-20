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
  		title: 'N-back поток',
  		path: '/exercises/nback-stream/about', 
  		img: '/exercises/n-back.svg' 
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

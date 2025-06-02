export type TestData = {
	name: string;
	title: string;
	path: string;
	img: string;
};

export const tests: TestData[] = [
	{
		name: 'stroop',
		title: 'Тест Струпа',
		path: '/tests/stroop/about',
		img: '/tests/stroop.jpg'
	},
	{
		name: 'math',
		title: 'Aрифметический тест',
		path: '/tests/math/about',
		img: '/tests/math.svg'
	},
	{
		name: 'munsterberg',
		title: 'Тест Мюнстерберга',
		path: '/tests/munsterberg/about',
		img: '/tests/munsterberg.svg'
	},
	{
		name: 'campimetry',
		title: 'Компьютерная кампиметрия',
		path: '/tests/campimetry/about',
		img: '/tests/campimetry.svg'
	},
	{
		name: 'memory',
		title: 'Тест на память',
		path: '/tests/memory/about',
		img: '/tests/memory.svg'
	},
	{
		name: 'swallow',
		title: 'Тест «Ласточка»',
		path: '/tests/swallow/about',
		img: '/tests/swallow.svg'
	},
	{
		name: 'word-morphing',
		title: 'Тест на словосочетания',
		path: '/tests/word-morphing/about',
		img: '/tests/word-morphing.svg'
	},
	{
		name: 'rhythm',
		title: 'Тест на ритм',
		path: '/tests/rhythm/about',
		img: '/tests/rhythm.svg'
	}
];

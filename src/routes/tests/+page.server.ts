
export function load({ cookies }) {
    const user = cookies.get('user');

    const tests = [
        {
            name: 'Тест Струпа',
            path: '/tests/stroop',
            img: '/stroop.jpg'
        },
        {
            name: 'Арифметический тест',
            path: '/tests/math',
            img: '/math.svg'
        },
        {
            name: 'Тест Мюнстерберга',
            path: '/tests/munsterberg',
            img: '/munsterberg.svg'
        },
        {
            name: 'Компьютерная кампиметрия',
            path: '/tests/campimetry',
            img: '/campimetry.svg'
        },
        {
            name: 'Тест на память',
            path: '/tests/memory',
            img: '/memory.svg'
        },
        {
            name: 'Тест «Ласточка»',
            path: '/tests/bird',
            img: '/bird.svg'
        }
    ];

    return {
        tests,
        user
    };
}
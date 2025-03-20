
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
            img: '/default.svg'
        },
        {
            name: 'Тест на память',
            path: '/tests/memory',
            img: '/default.svg'
        },
        {
            name: 'Тест Мюнстерберга',
            path: '/tests/munsterberg',
            img: '/default.svg'
        }
    ];

    return {
        tests,
        user
    };
}
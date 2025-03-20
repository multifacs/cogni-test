
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
            name: 'Тест на память',
            path: '/tests/memory',
            img: '/memory.svg'
        },
        {
            name: 'Тест Мюнстерберга',
            path: '/tests/munsterberg',
            img: '/munsterberg.svg'
        }
    ];

    return {
        tests,
        user
    };
}

export function load({ cookies }) {
    const user = cookies.get('user');

    const tests = [
        {
            name: 'Тест Струпа',
            path: '/tests/stroop',
            img: '/stroop.jpg'
        },
        {
            name: 'Тест 2',
            path: '/tests/stroop',
            img: '/default.svg'
        },
        {
            name: 'Тест 3',
            path: '/tests/stroop',
            img: '/default.svg'
        }
    ];

    return {
        tests,
        user
    };
}
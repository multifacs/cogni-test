
export function load({ cookies }) {
    const user = cookies.get('user');

    const tests = {
        'Тест Струпа': '/tests/stroop',
        'Тест 2': '/tests/stroop',
        'Тест 3': '/tests/stroop',
    };

    return {
        tests,
        user
    };
}
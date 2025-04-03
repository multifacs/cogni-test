export function translate(word: string): string {
    const dict = {
        red: 'Красный',
        cyan: 'Бирюзовый',
        green: 'Зеленый',
        magenta: 'Пурпурный',
        blue: 'Синий',
        yellow: 'Желтый',
        'stage 1': 'Этап 1',
        'stage 2': 'Этап 2',
        'stage 3': 'Этап 3'
    };
    if (word && word in dict) return dict[word];
    return '';
}
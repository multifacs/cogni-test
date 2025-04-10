import { error } from '@sveltejs/kit';
import type { User } from '$lib/types';

export function translate(word: string): string {
    const dict = {
        red: 'Красный',
        cyan: 'Бирюзовый',
        green: 'Зеленый',
        magenta: 'Пурпурный',
        blue: 'Синий',
        yellow: 'Желтый',
        'stage': 'Этап',
        'stage 1': 'Этап 1',
        'stage 2': 'Этап 2',
        'stage 3': 'Этап 3'
    };
    if (word && word in dict) return dict[word];
    if (word && !(word in dict)) return word;
    return '';
}

// place files you want to import through the `$lib` alias in this folder.
export function checkFormData(data: FormData): boolean {
	if (!data.get('name')) return false;
	if (!data.get('surname')) return false;
	if ((data.get('surname') as string).length != 2) return false;
	if (!data.get('day')) return false;
	if (!data.get('month')) return false;
	if (!data.get('year')) return false;
	if (!data.get('sex')) return false;

	return true;
}

export function formDataToUser(id: string | null = null, data: FormData): User {
	if (!checkFormData(data)) error(422, 'wrong data format');

	const day = (data.get('day') as string).padStart(2, '0');
	const month = (data.get('month') as string).padStart(2, '0') as string;
	const year = data.get('year') as string;
	const birth = [day, month, year].join('.');

	const user = {
		id,
		name: (data.get('name') as string).toUpperCase(),
		surname: (data.get('surname') as string).toUpperCase(),
		birth,
		sex: data.get('sex')
	} as User;

	return user;
}

export function clamp(n: number, min: number, max: number) {
	return Math.min(Math.max(n, min), max);
}

export const delay = (delayInms: number) => {
	return new Promise((resolve) => setTimeout(resolve, delayInms));
};

export function shuffle(array: any[]) {
	let currentIndex = array.length;

	// While there remain elements to shuffle...
	while (currentIndex != 0) {
		// Pick a remaining element...
		let randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex--;

		// And swap it with the current element.
		[array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
	}
}

export function getCSSVar(variable: string): string {
	return window.getComputedStyle(document.body).getPropertyValue(variable);
}
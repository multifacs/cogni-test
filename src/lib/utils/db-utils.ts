// place files you want to import through the `$lib` alias in this folder.

import type { User } from '$lib/types';
import { error } from '@sveltejs/kit';

export function checkFormData(data: FormData): boolean {
	if (!data.get('firstname')) return false;
	if (!data.get('lastname')) return false;
	if ((data.get('lastname') as string).length != 2) return false;
	if (!data.get('day')) return false;
	if (!data.get('month')) return false;
	if (!data.get('year')) return false;
	if (!data.get('sex')) return false;
	if (!data.get('cataract')) return false;
	if (!data.get('colorist')) return false;
	if (!data.get('neuro')) return false;

	return true;
}
export function formDataToUser(id: string | null = null, data: FormData): User {
	if (!checkFormData(data)) error(422, 'wrong data format');

	const day = parseInt(data.get('day') as string);
	const month = parseInt(data.get('month') as string);
	const year = parseInt(data.get('year') as string);
	const birthdate = new Date(year, month - 1, day).toLocaleDateString();

	// const cataract = data.get('cataract') == 'yes';
	// const colorist = data.get('colorist') == 'yes';
	// const neuro = data.get('neuro') == 'yes';
	const cataract = null;
	const colorist = null;
	const neuro = null;

	const user = {
		id,
		firstname: (data.get('firstname') as string).toUpperCase(),
		lastname: (data.get('lastname') as string).toUpperCase(),
		birthdate,
		sex: data.get('sex'),
		cataract,
		colorist,
		neuro
	} as User;

	return user;
}

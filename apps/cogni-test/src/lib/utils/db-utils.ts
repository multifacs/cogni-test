// place files you want to import through the `$lib` alias in this folder.

import type { User } from '$lib/types';
import { error } from '@sveltejs/kit';

export function checkFormData(data: FormData): boolean {
	if (!data.get('firstname')) return false;
	if (!data.get('lastname')) return false;
	if ((data.get('lastname') as string).length != 2) return false;
	if (!data.get('birthday')) return false;
	const dateRegex = /^\d{2}\.\d{2}\.\d{4}$/;
	if (!dateRegex.test(data.get('birthday') as string)) return false;
	if (!data.get('sex')) return false;

	return true;
}
export function formDataToUser(id: string | null = null, data: FormData): User {
	if (!checkFormData(data)) error(422, 'wrong data format');

	const birthdayParsed = (data.get('birthday') as string).split('.').reverse().join('-');
	const birthday = new Date(birthdayParsed);

	const user = {
		id,
		firstname: (data.get('firstname') as string).toUpperCase(),
		lastname: (data.get('lastname') as string).toUpperCase(),
		birthday,
		sex: data.get('sex')
	} as User;

	return user;
}

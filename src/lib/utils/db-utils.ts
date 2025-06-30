// place files you want to import through the `$lib` alias in this folder.

import type { User } from '$lib/types';
import { error } from '@sveltejs/kit';

export function checkFormData(data: FormData): boolean {
	if (!data.get('firstname')) return false;
	if (!data.get('lastname')) return false;
	if ((data.get('lastname') as string).length != 2) return false;
	if (!data.get('birthdate')) return false;
	const dateRegex = /^\d{2}\.\d{2}\.\d{4}$/;
	if (!dateRegex.test(data.get('birthdate') as string)) return false;
	if (!data.get('sex')) return false;

	return true;
}
export function formDataToUser(id: string | null = null, data: FormData): User {
	if (!checkFormData(data)) error(422, 'wrong data format');

	const birthdateParsed = (data.get('birthdate') as string).split('.').reverse().join('-');
	const birthdate = new Date(birthdateParsed).toISOString();

	const user = {
		id,
		firstname: (data.get('firstname') as string).toUpperCase(),
		lastname: (data.get('lastname') as string).toUpperCase(),
		birthdate,
		sex: data.get('sex')
	} as User;

	return user;
}

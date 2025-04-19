import type { User } from './types';
import { MODE, DB_URL_DEV, DB_URL_PROD } from '$env/static/private';
import { checkFormData, formDataToUser } from '$lib/utils';
import { fail } from '@sveltejs/kit';

let DB_URL: string;
if (MODE == 'DEV') {
	DB_URL = DB_URL_DEV;
} else {
	DB_URL = DB_URL_PROD;
}

async function createUser(userData: User): Promise<string> {
	console.log(JSON.stringify(userData))
	try {
		const response = await fetch(`${DB_URL}/api/users`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(userData)
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		console.log('User created:', data);
		return data.id;
	} catch (error) {
		console.error('Error creating user:', error);
		throw error;
	}
}

export async function addUser(data: FormData): Promise<string | null> {
	if (!checkFormData(data)) {
		fail(500);
		console.log('formdata check failed');
		return null;
	}
	const user = formDataToUser(null, data);

	const id = await createUser(user);
	return id;
}

export async function getUserById(id: string) {
	try {
		const response = await fetch(`${DB_URL}/api/users?id=${id}`);

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		console.log('User found:', data);
		return data;
	} catch (error) {
		console.error('Error finding user:', error);
		throw error;
	}
}

// export function getDevUser(): string | null {
// 	const devFormData = new FormData();
// 	devFormData.append('name', 'debugus');
// 	devFormData.append('surname', 'er');
// 	devFormData.append('day', '1');
// 	devFormData.append('month', '1');
// 	devFormData.append('year', '2001');
// 	devFormData.append('sex', 'male');
// 	return addUser(devFormData);
// }

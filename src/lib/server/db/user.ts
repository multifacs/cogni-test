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

async function createUser(userInstance: User): Promise<User> {
	try {
		const response = await fetch(`${DB_URL}/api/users`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(userInstance)
		});

		console.log(response)

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		console.log('User created:', data);
		return data.user;
	} catch (error) {
		console.error('Error creating user:', error);
		throw error;
	}
}

export async function addUser(formData: FormData): Promise<User | null> {
	if (!checkFormData(formData)) {
		fail(500);
		console.log('formdata check failed');
		return null;
	}
	const userInstance = formDataToUser(null, formData);
	const newUser = await createUser(userInstance);
	return newUser;
}

export async function getUserById(id: string) {
	try {
		const response = await fetch(`${DB_URL}/api/users?id=${id}`);

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		console.log('User found:', data);
		return data.user;
	} catch (error) {
		console.error('Error finding user:', error);
		throw error;
	}
}

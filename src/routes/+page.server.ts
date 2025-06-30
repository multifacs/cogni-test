import { fail, redirect } from '@sveltejs/kit';
import { addUser, getUserById } from '$lib/server/db';
import { checkFormData } from '$lib/utils';
import type { User } from '$lib/server/db/types';

export const load = async ({ cookies }) => {
	const userId = cookies.get('user_id');
	if (!userId) return;
	const user: User = await getUserById(userId);
	if (!user) {
		cookies.delete('user_id', { path: '/' });
	}
	redirect(307, '/home');
};

export const actions = {
	login: async ({ cookies, request }) => {
		const data = await request.formData();
		console.log(data, checkFormData(data));

		if (!checkFormData(data)) {
			return fail(422, {
				error: 'incorrect data'
			});
		}

		let id;

		try {
			const response = await addUser(data);
			if (response) {
				id = response.id;
			}
		} catch (error) {
			return fail(422, {
				error
			});
		}

		if (id) {
			console.log('user set', id);
			cookies.set('user_id', id, { path: '/', secure: true });
			redirect(307, '/home');
		}
	},

	logout: async ({ cookies }) => {
		cookies.delete('user_id', { path: '/', secure: true });
		redirect(307, '/');
	}
};

import { redirect } from '@sveltejs/kit';
import { createUser, getUserById } from '$lib/server/db';
import { checkFormData, formDataToUser } from '$lib/utils';
import type { User } from '$lib/server/db/types';

export const load = async ({ cookies }) => {
	const userId = cookies.get('user_id');
	if (!userId) return;
	const user: User | null = await getUserById(userId);
	if (!user) {
		cookies.delete('user_id', { path: '/' });
	}
	redirect(307, '/home');
};

export const actions = {
	login: async ({ cookies, request }) => {
		const data = await request.formData();
		if (!checkFormData(data)) {
			console.log('error data');
		}
		let id;
		try {
			const response = await createUser(formDataToUser(null, data));
			if (response) {
				id = response.id;
			}
		} catch (error) {
			console.log(error);
		}

		if (id) {
			cookies.set('user_id', id, { path: '/', secure: true, maxAge: 60 * 60 * 24 * 30 });
			redirect(307, '/home');
		}
	},

	logout: async ({ cookies }) => {
		cookies.delete('user_id', { path: '/', secure: true });
		redirect(307, '/');
	}
};

import { fail, redirect } from '@sveltejs/kit';
import { addUser } from '$lib/server/db';
// import type { User } from '$lib/server/db/types';
import { checkFormData } from '$lib/utils';
import { MODE } from '$env/static/private';

export function load({ cookies }) {
	const user = cookies.get('user');
	console.log('start page loading');

	if (user) {
		redirect(307, '/tests');
	}
	return {
		user
	};
}

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
			id = await addUser(data);
			console.log(id);
		} catch (error) {
			console.log(error);
			return fail(422, {
				error: 'failed to get user'
			});
		}

		if (id) {
			console.log('user set', id);
			cookies.set('user', id, { path: '/', secure: true });
			redirect(307, '/tests');
		}
	},

	logout: async ({ cookies }) => {
		cookies.delete('user', { path: '/', secure: true });
		redirect(307, '/');
	}
};

import { fail, redirect } from '@sveltejs/kit';
import { Users } from '$lib/server/db';
import type { User } from '$lib/server/db/types';

export function load({ cookies }) {
	const user = cookies.get('user');
	console.log("start page loading");
	if (user) {
		redirect(307, "/tests");
	}
	return {
		user
	};
}

export const actions = {
	login: async ({ cookies, request }) => {
		const data = await request.formData();
		console.log(data)

		let id;

		try {
			const user = {
				id: null,
				name: data.get('name'),
				surname: data.get('surname'),
				birth: [data.get('day').padStart(2, '0'), data.get('month').padStart(2, '0'), data.get('year')].join('.'),
				sex: data.get('sex'),
			} as User;

			id = Users.getUserId(user);
		} catch (error) {
			console.log(error);
			return fail(422, {
				error: 'failed to get user'
			});
		}

		if (id) {
			console.log("user found", id);
			cookies.set('user', id, { path: '/' });
			redirect(307, "/tests");
			return;
		}

		try {
			id = Users.addUser(data);
			console.log("user not found, new id", id);
			cookies.set('user', id, { path: '/' });
		} catch (error) {
			console.log(error);
			return fail(422, {
				error: 'failed to add user'
			});
		}
	},

	logout: async ({ cookies, request }) => {
		cookies.delete('user', { path: '/' });
		redirect(307, "/");
	},
};
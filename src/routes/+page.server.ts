import { fail, redirect } from '@sveltejs/kit';
import { Users } from '$lib/server/db';
import type { User } from '$lib/server/db/types';
import { checkFormData, formDataToUser } from '$lib/index'
import { MODE } from '$env/static/private';

export function load({ cookies }) {
	let user = cookies.get('user');
	console.log("start page loading");

	if (MODE == 'DEV') {
		user = Users.getDevUser() as string;
		cookies.set('user', user, { path: '/' });
	}

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

		if (!checkFormData(data)) {
			return fail(422, {
				error: 'incorrect data'
			})
		}

		let id;

		try {
			id = Users.addUser(data);
		} catch (error) {
			console.log(error);
			return fail(422, {
				error: 'failed to get user'
			});
		}

		if (id) {
			console.log("user set", id);
			cookies.set('user', id, { path: '/' });
			redirect(307, "/tests");
		}
	},

	logout: async ({ cookies, request }) => {
		cookies.delete('user', { path: '/' });
		redirect(307, "/");
	},
};
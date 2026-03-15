import type { PageServerLoad, Actions } from '../../$types';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ cookies }) => {
	const loggedInAdmin = cookies.get('logged_in_admin') === 'true';
	if (loggedInAdmin) {
		redirect(307, '/admin');
	}
};

import { env } from '$env/dynamic/private'; 

export const actions = {
	login: async ({ request, cookies }) => {
		let ADMIN_PASSWORD;
		if (env.ADMIN_PASSWORD) {
			ADMIN_PASSWORD = env.ADMIN_PASSWORD;
		} else {
			return fail(401, { incorrect: true });
		}

		const data = await request.formData();
		const password = data.get('password');
		if (password !== ADMIN_PASSWORD) {
			return fail(401, { password, incorrect: true });
		}
		cookies.set('logged_in_admin', 'true', { path: '/', secure: true });
		redirect(307, '/admin');
	}
} satisfies Actions;

import { fail, redirect } from '@sveltejs/kit';
import { createUser, getUserById } from '$lib/server/db';
import { checkFormData, formDataToUser } from '$lib/utils';
import type { User } from '$lib/server/db/types';

export const load = async ({ cookies }) => {
	const userId = cookies.get('user_id');
	if (!userId) return;
	const user: User | null = await getUserById(userId);
	console.log(user, "12123321")
	if (!user) {
		cookies.delete('user_id', { path: '/' });
	}
	redirect(307, '/home');
};

// function formDataToUser(id: string | null, formData: FormData): Partial<User> {
// 	return {
// 		id: id ?? undefined,
// 		firstname: formData.get('firstname')?.toString().trim() ?? '',
// 		lastname: formData.get('lastname')?.toString().trim() ?? '',
// 		birthday: formData.get('birthday')?.toString().trim() ?? '',
// 		sex: formData.get('sex')?.toString().trim() ?? '',
// 	};
// }

export const actions = {
	login: async ({ cookies, request }) => {
		const data = await request.formData();
		console.log(data, checkFormData(data), 123);

		if (!checkFormData(data)) {
			return fail(422, {
				error: 'incorrect data'
			});
		}

		let id;

		try {
			const response = await createUser(formDataToUser(null, data));
			console.log(response, 12355)
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

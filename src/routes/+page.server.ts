import { fail, redirect } from '@sveltejs/kit';
import { createUser, getUserById, getUsersAnalytics } from '$lib/server/db';
import { checkFormData, formDataToUser } from '$lib/utils';
import type { User } from '$lib/server/db/types';
import type { Actions } from './$types';
import type { PageServerLoad } from './$types';
import { getProfileSurvey, updateProfileSurvey } from '$lib/server/db/controllers/survey';
import { getLatestActiveGtoSession, addParticipant } from '$lib/server/db/controllers/gto';

export const load: PageServerLoad = async ({ cookies }) => {
	const userId = cookies.get('user_id');
	if (userId) {
		const user: User | null = await getUserById(userId);
		if (user) redirect(307, '/home');
		// Кука есть, но пользователя нет — чистим и показываем логин,
		// вместо редиректа на /home (иначе петля: /home → / → /home).
		cookies.delete('user_id', { path: '/' });
	}
};

export const actions = {
	login: async ({ cookies, request }) => {
		const data = await request.formData();
		if (!checkFormData(data)) {
			return fail(400, { message: 'Проверьте правильность заполнения полей' });
		}
		let id;
		try {
			const response = await createUser(formDataToUser(null, data));
			if (response) {
				id = response.id;
			}
		} catch (error) {
			console.error('createUser failed:', error);
			return fail(500, { message: 'Не удалось сохранить данные. Попробуйте ещё раз' });
		}

		if (id) {
			cookies.set('user_id', id, { path: '/', secure: true, maxAge: 60 * 60 * 24 * 30 });
			redirect(307, '/home');
		}

		return fail(500, { message: 'Не удалось создать пользователя. Попробуйте ещё раз' });
	},

	logout: async ({ cookies }) => {
		cookies.delete('user_id', { path: '/', secure: true });
		redirect(307, '/');
	},

	save: async ({ cookies, request }) => {
		const data = await request.formData();
		const dataAsObject = Object.fromEntries(data.entries()) as Record<
			string,
			FormDataEntryValue | boolean
		>;
		if ('isGamer' in dataAsObject) {
			dataAsObject.isGamer = dataAsObject.isGamer === '0' ? false : true;
		}
		if ('isAmbidextrous' in dataAsObject) {
			dataAsObject.isAmbidextrous = dataAsObject.isAmbidextrous === '0' ? false : true;
		}
		console.log('Data received in save action:', dataAsObject);
		const userId = cookies.get('user_id')!;
		updateProfileSurvey(userId, dataAsObject);

		// Auto-add user to the latest active GTO session when they fill in their GTO-M ID
		const gtoId = dataAsObject.gtoId as string | undefined;
		if (gtoId && gtoId.trim()) {
			const existingSurvey = await getProfileSurvey(userId);
			if (!existingSurvey?.gtoId) {
				const session = await getLatestActiveGtoSession();
				if (session) {
					await addParticipant(session.id, userId);
					console.log(
						`Auto-added user ${userId} to GTO session "${session.name}" (${session.id})`
					);
				}
			}
		}
	},

	getUsersAnalytics: async () => {
		const analytics = await getUsersAnalytics();
		console.log('Analytics data retrieved:', analytics);
		return { analytics };
	}
} satisfies Actions;

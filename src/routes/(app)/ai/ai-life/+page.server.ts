import { fail, redirect } from '@sveltejs/kit';
import { getAiSurvey, upsertAiSurvey } from '$lib/server/db/controllers/ai-survey';
import type { AiSurveyAnswers } from '$lib/ai/questionnaire/types';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, parent }) => {
	const userId = cookies.get('user_id');
	if (!userId) {
		redirect(307, '/');
	}

	// user — из родительского layout ((app)/+layout.server.ts): нужен клиенту
	// для префилла Q28 (год рождения) и Q29 (пол), см. +page.svelte.
	const { user } = await parent();
	const survey = await getAiSurvey(userId);

	return {
		answers: survey?.answers ?? {},
		user: user ? { birthday: user.birthday, sex: user.sex } : null
	};
};

export const actions = {
	/** Автосохранение анкеты: POST FormData { answers: JSON }. */
	save: async ({ cookies, request }) => {
		const userId = cookies.get('user_id');
		if (!userId) {
			return fail(401, { message: 'Не авторизован' });
		}

		const data = await request.formData();
		const raw = data.get('answers');
		if (typeof raw !== 'string' || raw === '') {
			return fail(400, { message: 'Нет ответов для сохранения' });
		}

		let answers: AiSurveyAnswers;
		try {
			answers = JSON.parse(raw) as AiSurveyAnswers;
		} catch {
			return fail(400, { message: 'Некорректный формат ответов' });
		}
		if (answers === null || typeof answers !== 'object' || Array.isArray(answers)) {
			return fail(400, { message: 'Некорректный формат ответов' });
		}

		await upsertAiSurvey(userId, answers);
		return { ok: true };
	}
} satisfies Actions;

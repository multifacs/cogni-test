import { redirect } from '@sveltejs/kit';
import { getClassificationState } from '$lib/server/db/controllers/classification';
import type { PageServerLoad } from './$types';

/**
 * Двухэтапный тест классификации (Plan v4, Task 1.2):
 *  - words     → обычная страница (этап 1; для завершившего — сознательный re-take);
 *  - retelling → этап 2 без доступа к тексту (возврат пользователя mid-flow).
 *
 * Redirect для завершённого теста УДАЛЁН: клик по done-карточке хаба —
 * легитимный перезапуск попытки. Завершённость для хаба считает
 * hasCompletedClassification, а не эта страница.
 */
export const load: PageServerLoad = async ({ cookies }) => {
	const userId = cookies.get('user_id');
	if (!userId) {
		redirect(307, '/');
	}

	const state = await getClassificationState(userId);

	return {
		stage: state.stage,
		sessionId: state.sessionId ?? null
	};
};

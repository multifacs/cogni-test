import { getResults } from '$lib/server/db/controllers/result.js';
import { getTestSessionCounts } from '$lib/server/db/controllers/test.js';
import { tests } from '$lib/tests';
import { redirect } from '@sveltejs/kit';
import type { TestResultMap } from '$lib/tests/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const slug = params.slug as keyof TestResultMap;
	const userId = cookies.get('user_id') as string;

	// ИИ-поток: после завершения диагностики один раз уводим на хаб /ai.
	// Guard-порядок: нет ai_flow → обычный load; не все тесты → обычный load;
	// одноразовый флаг стоит → обычный load; иначе redirect + флаг.
	if (cookies.get('ai_flow') !== '1') {
		const results = await getResults(slug, userId);
		return { results };
	}

	const visibleTests = tests.filter((t) => !t.hidden);
	const testSessionCounts = await getTestSessionCounts(userId);
	const allTestsDone = visibleTests.every((t) => (testSessionCounts[t.name] ?? 0) > 0);

	if (!allTestsDone || cookies.get('ai_flow_done') === '1') {
		const results = await getResults(slug, userId);
		return { results };
	}

	cookies.set('ai_flow_done', '1', { path: '/', secure: true, httpOnly: true });
	redirect(307, '/ai');
};

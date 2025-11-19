import { error, redirect } from '@sveltejs/kit';
import { hasActiveSession } from '$lib/server/db/controllers/wordMorphingSessions';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, params }) => {
    const userId = cookies.get('user_id');
	const slug = params.slug;

    if (slug === 'word-morphing') {
        if (!userId) {
            error(401, 'Missing userId cookie');
        }

        const hasSession = await hasActiveSession(userId);
        if (hasSession) {
            redirect(303, `/exercises/${slug}/playground`);
        }
    }

	try {
		await import(`$lib/exercises/${slug}/About.svelte`);
	} catch {
		error(404, 'test not found');
	}
}

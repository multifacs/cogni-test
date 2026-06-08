import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, `/login?redirectTo=${encodeURIComponent(url.pathname)}`);
	}
	return { user: locals.user };
};

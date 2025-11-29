import { exercises } from '$lib/exercises';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ params }) => {
	const slug = params.slug;
	return {
		slug,
		exercises
	};
}

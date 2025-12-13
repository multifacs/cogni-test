import { tests } from '$lib/tests';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ params }) => {
	const slug = params.slug;
	return {
		slug,
		tests
	};
};

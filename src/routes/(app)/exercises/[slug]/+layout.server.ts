import { tests } from '$lib/tests';
export function load({ params }) {
	const slug = params.slug;
	return {
		slug, tests
	};
}

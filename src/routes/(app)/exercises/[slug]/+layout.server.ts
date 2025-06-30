import { exercises } from '$lib/exercises';
export function load({ params }) {
	const slug = params.slug;
	return {
		slug,
		exercises
	};
}

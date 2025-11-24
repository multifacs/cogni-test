import { redirect } from '@sveltejs/kit';

export function load({ params }) {
	const slug: string = params.slug;
	console.log(slug);
	redirect(303, `/exercises/${slug}/about`);
}

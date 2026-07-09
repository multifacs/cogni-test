import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const slug: string = params.slug;
	console.log(slug);
	redirect(303, `/tests/${slug}/about`);
}

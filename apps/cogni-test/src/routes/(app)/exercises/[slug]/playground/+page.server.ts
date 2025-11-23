import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const slug = params.slug;
	console.log(slug);

	try {
		await import(`$lib/exercises/${slug}/Playground.svelte`);
	} catch (err) {
		console.log(err);
		error(404, 'test not found');
	}


	if (slug.includes('campimetry')) {
		const silhouettes = {
			bird: '/campimetry/bird.svg',
			butterfly: '/campimetry/butterfly.svg',
			cat: '/campimetry/cat.svg',
			dog: '/campimetry/dog.svg',
			shark: '/campimetry/shark.svg'
		};

        return { silhouettes };
	}
}

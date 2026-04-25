import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const slug = params.slug;
	console.log(slug);

	try {
		await import(`$lib/tests/${slug}/Playground.svelte`);
	} catch (err) {
		console.log(err);
		error(404, 'test not found');
	}

	const data: {
		words?: string[];
		silhouettes?: Record<string, string>;
	} = {};

	if (slug == 'munsterberg' || slug == 'memory') {
		const response = await fetch('/words'); // Путь к файлу
		const text = await response.text();
		const words = text
			.split('\n')
			.map((x) => x.replace(/(\r\n|\n|\r)/gm, ''))
			.filter((x) => x.length <= 9 && x !== 'TRUE' && x !== 'true');
		data.words = words;
	}

	if (slug == 'campimetry') {
		const silhouettes = {
			bird: '/campimetry/bird.svg',
			butterfly: '/campimetry/butterfly.svg',
			cat: '/campimetry/cat.svg',
			dog: '/campimetry/dog.svg',
			shark: '/campimetry/shark.svg'
		};

		data.silhouettes = silhouettes;
	}

	return data;
}
